/**
 * CORS Plugin
 * 
 * Provides Cross-Origin Resource Sharing capabilities for the Japa Gateway.
 * 
 * @module plugins/security/cors-plugin
 */

import { type Plugin, type RequestContext } from '../../types';
import { logger } from '../observability/logger';

/**
 * CORS plugin configuration
 */
export interface CorsConfig {
  /**
   * Whether CORS is enabled
   */
  enabled: boolean;
  
  /**
   * Allowed origins
   */
  origins: string[];
  
  /**
   * Allowed methods
   */
  methods: string[];
  
  /**
   * Allowed headers
   */
  allowedHeaders: string[];
  
  /**
   * Exposed headers
   */
  exposedHeaders: string[];
  
  /**
   * Whether to allow credentials
   */
  allowCredentials: boolean;
  
  /**
   * Max age in seconds
   */
  maxAge: number;
  
  /**
   * Whether to handle preflight requests
   */
  handlePreflight: boolean;
}

/**
 * Default CORS configuration
 */
const DEFAULT_CONFIG: CorsConfig = {
  enabled: true,
  origins: ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  allowCredentials: false,
  maxAge: 86400,
  handlePreflight: true,
};

// Plugin configuration
let pluginConfig: CorsConfig = { ...DEFAULT_CONFIG };

/**
 * Sets CORS headers on a Headers object
 * 
 * @param headers - Headers object
 * @param origin - Request origin
 * @param config - CORS configuration to use
 */
function setCorsHeaders(headers: Headers, origin?: string | null, config: CorsConfig = pluginConfig): void {
  if (!origin) {
    return;
  }
  
  // Set Access-Control-Allow-Origin
  if (config.origins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  } else if (config.origins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  
  // Set Access-Control-Allow-Credentials
  if (config.allowCredentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Set Access-Control-Expose-Headers
  if (config.exposedHeaders.length > 0) {
    headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }
}

/**
 * Creates a preflight response
 * 
 * @param request - HTTP request
 * @returns Preflight response
 */
function createPreflightResponse(request: Request): Response {
  const origin = request.headers.get('Origin');
  const accessControlRequestMethod = request.headers.get('Access-Control-Request-Method');
  const accessControlRequestHeaders = request.headers.get('Access-Control-Request-Headers');
  
  const headers = new Headers();
  
  // Set CORS headers
  setCorsHeaders(headers, origin);
  
  // Set preflight-specific headers
  if (accessControlRequestMethod && pluginConfig.methods.includes(accessControlRequestMethod)) {
    headers.set('Access-Control-Allow-Methods', pluginConfig.methods.join(', '));
  }
  
  if (accessControlRequestHeaders) {
    headers.set('Access-Control-Allow-Headers', pluginConfig.allowedHeaders.join(', '));
  }
  
  headers.set('Access-Control-Max-Age', String(pluginConfig.maxAge));
  
  // Create preflight response
  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * CORS plugin implementation
 */
const CorsPlugin: Plugin = {
  /**
   * Initialize the plugin
   * 
   * @param config - Plugin configuration
   */
  async initialize(config: any): Promise<void> {
    logger.info('Initializing CORS plugin');
    
    // Merge with default config
    pluginConfig = {
      ...DEFAULT_CONFIG,
      ...config.plugins?.cors,
    };
    
    logger.debug('CORS plugin configured', {
      enabled: pluginConfig.enabled,
      origins: pluginConfig.origins,
    });
  },
  
  /**
   * Run before routing
   * 
   * @param context - Request context
   */
  async preRouting(context: RequestContext): Promise<void> {
    const { request } = context;
    
    // Skip if CORS is not enabled
    if (!pluginConfig.enabled) {
      return;
    }
    
    // Store origin for later use
    const origin = request.headers.get('Origin');
    if (origin) {
      context.metadata = context.metadata || {};
      context.metadata.corsOrigin = origin;
    }
    
    // Handle preflight requests
    if (pluginConfig.handlePreflight && request.method === 'OPTIONS') {
      const accessControlRequestMethod = request.headers.get('Access-Control-Request-Method');
      
      if (accessControlRequestMethod) {
        // This is a preflight request
        logger.debug('Handling CORS preflight request', { origin });
        
        // Create preflight response
        const response = createPreflightResponse(request);
        
        // Store response in context
        context.metadata = context.metadata || {};
        context.metadata.corsPreflightResponse = response;
      }
    }
  },
  
  /**
   * Run after proxying
   * 
   * @param context - Request context
   * @param response - Response from target service
   */
  async postProxy(context: RequestContext, response: any): Promise<any> {
    // Get route-specific config if available
    const routeConfig = context.route?.plugins?.cors;
    
    // Create effective configuration by deep merging default and route-specific configs
    const effectiveConfig: CorsConfig = {
      ...DEFAULT_CONFIG,  // Start with default config
      ...pluginConfig,    // Apply global plugin config
      ...(routeConfig ? {  // Apply route-specific config if available
        ...routeConfig,
        // Ensure arrays are properly handled
        origins: routeConfig.origins || pluginConfig.origins,
        methods: routeConfig.methods || pluginConfig.methods,
        allowedHeaders: routeConfig.allowedHeaders || pluginConfig.allowedHeaders,
        exposedHeaders: routeConfig.exposedHeaders || pluginConfig.exposedHeaders,
      } : {}),
    };
    
    // Skip if CORS is not enabled
    if (!effectiveConfig.enabled) {
      return response;
    }
    
    // Check if we have a preflight response
    if (context.metadata?.corsPreflightResponse) {
      // Update preflight response with effective config
      const preflightResponse = context.metadata.corsPreflightResponse;
      const preflightHeaders = new Headers(preflightResponse.headers);
      const origin = context.metadata?.corsOrigin;
      
      if (origin) {
        // Reset headers and apply effective config
        setCorsHeaders(preflightHeaders, origin, effectiveConfig);
        
        // Set preflight-specific headers
        const accessControlRequestMethod = context.request.headers.get('Access-Control-Request-Method');
        if (accessControlRequestMethod && effectiveConfig.methods.includes(accessControlRequestMethod)) {
          preflightHeaders.set('Access-Control-Allow-Methods', effectiveConfig.methods.join(', '));
        }
        
        const accessControlRequestHeaders = context.request.headers.get('Access-Control-Request-Headers');
        if (accessControlRequestHeaders) {
          preflightHeaders.set('Access-Control-Allow-Headers', effectiveConfig.allowedHeaders.join(', '));
        }
        
        preflightHeaders.set('Access-Control-Max-Age', String(effectiveConfig.maxAge));
        
        // Create updated preflight response
        return new Response(null, {
          status: 204,
          headers: preflightHeaders,
        });
      }
      
      return preflightResponse;
    }
    
    // Get origin from context
    const origin = context.metadata?.corsOrigin;
    if (!origin) {
      return response;
    }
    
    // Add CORS headers to response
    const headers = new Headers(response.headers);
    
    // Set CORS headers using effective config
    setCorsHeaders(headers, origin, effectiveConfig);
    
    // Create new response with CORS headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
  
  /**
   * Shutdown the plugin
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down CORS plugin');
  },
};

export default CorsPlugin;
