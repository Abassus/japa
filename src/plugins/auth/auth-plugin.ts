/**
 * Authentication Plugin
 * 
 * Provides authentication capabilities for the Japa Gateway.
 * 
 * @module plugins/auth/auth-plugin
 */

import type { Plugin, RequestContext, AuthResult } from '../../types';

// Extend the Plugin interface to include config property
declare module '../../types' {
  interface Plugin {
    config?: any;
  }
}
import { logger } from '../observability/logger';
import { AuthenticationError } from '../../utils/errors';
import { verifyJwt } from './jwt-provider';
import { verifyApiKey } from './api-key-provider';

/**
 * Authentication method enum
 */
export enum AuthMethod {
  JWT = 'jwt',
  API_KEY = 'apiKey',
  BASIC = 'basic',
  OAUTH = 'oauth',
  NONE = 'none',
}

/**
 * Authentication plugin configuration
 */
export interface AuthPluginConfig {
  /**
   * Authentication method
   */
  method: AuthMethod;
  
  /**
   * JWT configuration
   */
  jwt?: {
    /**
     * Secret key for JWT verification
     */
    secret: string;
    
    /**
     * Token location (header, query, cookie)
     */
    tokenLocation?: 'header' | 'query' | 'cookie';
    
    /**
     * Name of the token parameter
     */
    tokenName?: string;
  };
  
  /**
   * API key configuration
   */
  apiKey?: {
    /**
     * API key location (header, query)
     */
    keyLocation?: 'header' | 'query';
    
    /**
     * Name of the API key parameter
     */
    keyName?: string;
    
    /**
     * List of valid API keys
     */
    keys?: string[];
  };
}

/**
 * Default authentication configuration
 */
const DEFAULT_CONFIG: AuthPluginConfig = {
  method: AuthMethod.NONE,
  jwt: {
    secret: 'change-me-in-production',
    tokenLocation: 'header',
    tokenName: 'Authorization',
  },
  apiKey: {
    keyLocation: 'header',
    keyName: 'X-API-Key',
    keys: [],
  },
};

/**
 * Authenticates using JWT
 * 
 * @param request - HTTP request
 * @param config - Authentication configuration
 * @returns Authentication result
 */
async function authenticateJwt(
  request: Request,
  config: AuthPluginConfig
): Promise<AuthResult> {
  const jwtConfig = config.jwt;
  if (!jwtConfig) {
    return {
      authenticated: false,
      error: 'JWT configuration missing',
    };
  }
  
  // Get token from request
  const token = extractToken(request, jwtConfig.tokenLocation || 'header', jwtConfig.tokenName || 'Authorization');
  
  if (!token) {
    return {
      authenticated: false,
      error: 'JWT token missing',
    };
  }
  
  // Verify JWT
  try {
    const payload = await verifyJwt(token, jwtConfig.secret);
    
    return {
      authenticated: true,
      user: payload,
      scope: payload.scope || [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      authenticated: false,
      error: `Invalid JWT: ${errorMessage}`,
    };
  }
}

/**
 * Authenticates using API key
 * 
 * @param request - HTTP request
 * @param config - Authentication configuration
 * @returns Authentication result
 */
async function authenticateApiKey(
  request: Request,
  config: AuthPluginConfig
): Promise<AuthResult> {
  const apiKeyConfig = config.apiKey;
  if (!apiKeyConfig) {
    return {
      authenticated: false,
      error: 'API key configuration missing',
    };
  }
  
  // Get API key from request
  const apiKey = extractToken(request, apiKeyConfig.keyLocation || 'header', apiKeyConfig.keyName || 'X-API-Key');
  
  if (!apiKey) {
    return {
      authenticated: false,
      error: 'API key missing',
    };
  }
  
  // Verify API key
  try {
    const user = await verifyApiKey(apiKey, apiKeyConfig.keys || []);
    
    if (!user) {
      return {
        authenticated: false,
        error: 'Invalid API key',
      };
    }
    
    return {
      authenticated: true,
      user,
      scope: user.scope || [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      authenticated: false,
      error: `Invalid API key: ${errorMessage}`,
    };
  }
}

/**
 * Extracts a token from the request
 * 
 * @param request - HTTP request
 * @param location - Token location
 * @param name - Token name
 * @returns Extracted token or undefined
 */
function extractToken(
  request: Request,
  location: 'header' | 'query' | 'cookie',
  name: string
): string | undefined {
  switch (location) {
    case 'header': {
      const headerValue = request.headers.get(name);
      
      // Handle Authorization header format (Bearer token)
      if (name.toLowerCase() === 'authorization' && headerValue?.startsWith('Bearer ')) {
        return headerValue.substring(7);
      }
      
      return headerValue || undefined;
    }
    
    case 'query': {
      const url = new URL(request.url);
      return url.searchParams.get(name) || undefined;
    }
    
    case 'cookie': {
      const cookies = request.headers.get('Cookie') || '';
      const match = new RegExp(`${name}=([^;]+)`).exec(cookies);
      return match?.[1];
    }
    
    default:
      return undefined;
  }
}

/**
 * Authentication plugin implementation
 */
const AuthPlugin: Plugin = {
  /**
   * Plugin configuration
   */
  config: DEFAULT_CONFIG,
  
  /**
   * Initialize the plugin
   * 
   * @param config - Plugin configuration
   */
  async initialize(config: any): Promise<void> {
    logger.info('Initializing authentication plugin');
    
    // Merge with default config
    this.config = {
      ...DEFAULT_CONFIG,
      ...config.plugins?.auth,
    };
    
    logger.debug('Authentication plugin configured', {
      method: this.config.method,
    });
  },
  
  /**
   * Run before proxying
   * 
   * @param context - Request context
   */
  async preProxy(context: RequestContext): Promise<void> {
    const { request, route } = context;
    
    // Skip authentication if no route or no auth config
    if (!route || !route.plugins?.auth) {
      return;
    }
    
    // Get route-specific auth config
    const routeAuthConfig = {
      ...this.config,
      ...route.plugins.auth,
    };
    
    // Skip if auth is disabled for this route
    if (routeAuthConfig.method === AuthMethod.NONE) {
      return;
    }
    
    logger.debug('Authenticating request', {
      method: routeAuthConfig.method,
      path: new URL(request.url).pathname,
    });
    
    // Authenticate based on method
    let authResult: AuthResult;
    
    switch (routeAuthConfig.method) {
      case AuthMethod.JWT:
        authResult = await authenticateJwt(request, routeAuthConfig);
        break;
      case AuthMethod.API_KEY:
        authResult = await authenticateApiKey(request, routeAuthConfig);
        break;
      default:
        authResult = {
          authenticated: false,
          error: `Unsupported authentication method: ${routeAuthConfig.method}`,
        };
    }
    
    // Handle authentication result
    if (!authResult.authenticated) {
      logger.warn('Authentication failed', {
        method: routeAuthConfig.method,
        error: authResult.error,
      });
      
      throw new AuthenticationError(authResult.error || 'Unauthorized');
    }
    
    // Add user info to context
    context.metadata.user = authResult.user;
    context.metadata.scope = authResult.scope;
    
    logger.debug('Authentication successful', {
      method: routeAuthConfig.method,
      user: authResult.user?.id,
    });
  },
  
  /**
   * Shutdown the plugin
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down authentication plugin');
  },
};

export default AuthPlugin;
