/**
 * Rate Limiting Plugin
 * 
 * Provides rate limiting capabilities for the Japa Gateway.
 * 
 * @module plugins/security/rate-limit-plugin
 */

import { type Plugin, type RequestContext } from '../../types';
import { type RateLimitResult } from '../../types';
import { logger } from '../observability/logger';
import { RateLimitExceededError } from '../../utils/errors';

/**
 * Rate limiting algorithm enum
 */
export enum RateLimitAlgorithm {
  FIXED_WINDOW = 'fixed-window',
  SLIDING_WINDOW = 'sliding-window',
  TOKEN_BUCKET = 'token-bucket',
  LEAKY_BUCKET = 'leaky-bucket',
}

/**
 * Rate limit plugin configuration
 */
export interface RateLimitConfig {
  /**
   * Whether rate limiting is enabled
   */
  enabled: boolean;
  
  /**
   * Rate limiting algorithm
   */
  algorithm: RateLimitAlgorithm;
  
  /**
   * Request limit per window
   */
  limit: number;
  
  /**
   * Time window in seconds
   */
  window: number;
  
  /**
   * Client identifier function
   */
  identifierKey: string;
  
  /**
   * Whether to include headers in response
   */
  headers: boolean;
}

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  enabled: true,
  algorithm: RateLimitAlgorithm.FIXED_WINDOW,
  limit: 100,
  window: 60,
  identifierKey: 'ip',
  headers: true,
};

/**
 * In-memory store for rate limits
 * In production, this would use Redis or another distributed store
 */
const rateLimitStore: Map<string, { count: number, reset: number }> = new Map();

// Plugin configuration
let pluginConfig: RateLimitConfig = { ...DEFAULT_CONFIG };

// Cleanup interval reference
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Gets client identifier from request
 * 
 * @param request - HTTP request
 * @param key - Identifier key
 * @returns Client identifier
 */
function getClientIdentifier(request: Request, key: string): string {
  switch (key) {
    case 'ip':
      return request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1';
    
    case 'user':
      // If authenticated, use user ID
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        // Extract user ID from token (simplified)
        return `user:${authHeader.substring(7, 15)}`;
      }
      return 'anonymous';
    
    case 'api-key':
      return request.headers.get('x-api-key') || 'none';
    
    default:
      // Use header value if key is a header name
      return request.headers.get(key) || key;
  }
}

/**
 * Checks rate limit for a client
 * 
 * @param identifier - Client identifier
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${identifier}:${config.algorithm}:${config.limit}:${config.window}`;
  
  // Get current rate limit info
  const current = rateLimitStore.get(windowKey) || { count: 0, reset: now + config.window };
  
  // Check if window has expired
  if (current.reset <= now) {
    // Reset window
    current.count = 1;
    current.reset = now + config.window;
  } else {
    // Increment count
    current.count++;
  }
  
  // Update store
  rateLimitStore.set(windowKey, current);
  
  // Check if limit exceeded
  const allowed = current.count <= config.limit;
  const remaining = Math.max(0, config.limit - current.count);
  
  return {
    allowed,
    remaining,
    limit: config.limit,
    reset: current.reset,
  };
}

/**
 * Cleans up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Math.floor(Date.now() / 1000);
  let expiredCount = 0;
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.reset <= now) {
      rateLimitStore.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    logger.debug(`Cleaned up ${expiredCount} expired rate limit entries`);
  }
}

/**
 * Rate limiting plugin implementation
 */
const RateLimitPlugin: Plugin = {
  /**
   * Initialize the plugin
   * 
   * @param config - Plugin configuration
   */
  async initialize(config: any): Promise<void> {
    logger.info('Initializing rate limit plugin');
    
    // Merge with default config
    pluginConfig = {
      ...DEFAULT_CONFIG,
      ...config.plugins?.rateLimit,
    };
    
    logger.debug('Rate limit plugin configured', {
      enabled: pluginConfig.enabled,
      algorithm: pluginConfig.algorithm,
      limit: pluginConfig.limit,
      window: pluginConfig.window,
    });
    
    // Clean up expired entries periodically
    cleanupInterval = setInterval(() => cleanupExpiredEntries(), 60000);
  },
  
  /**
   * Run before proxying
   * 
   * @param context - Request context
   */
  async preProxy(context: RequestContext): Promise<void> {
    const { request, route } = context;
    
    // Skip rate limiting if no route or not enabled
    if (!route || !pluginConfig.enabled) {
      return;
    }
    
    // Get route-specific rate limit config
    const routeConfig = {
      ...pluginConfig,
      ...route.plugins?.rateLimit,
    };
    
    // Skip if rate limiting is disabled for this route
    if (!routeConfig.enabled) {
      return;
    }
    
    // Get client identifier
    const identifier = getClientIdentifier(request, routeConfig.identifierKey);
    
    // Check rate limit
    const result = checkRateLimit(identifier, routeConfig);
    
    // Store result in context for response headers
    context.metadata = context.metadata || {};
    context.metadata.rateLimit = result;
    
    // If rate limit exceeded, throw error
    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        identifier,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      });
      
      throw new RateLimitExceededError(
        'Rate limit exceeded',
        result.limit,
        result.reset
      );
    }
    
    logger.debug('Rate limit check passed', {
      identifier,
      remaining: result.remaining,
    });
  },
  
  /**
   * Run after proxying
   * 
   * @param context - RequestContext
   * @param response - Response object
   */
  async postProxy(context: RequestContext, response: any): Promise<any> {
    // Add rate limit headers if enabled
    const rateLimit = context.metadata?.rateLimit as RateLimitResult;
    const routeConfig = context.route?.plugins?.rateLimit || pluginConfig;
    
    if (rateLimit && routeConfig.headers) {
      const headers = new Headers(response.headers);
      
      headers.set('X-RateLimit-Limit', String(rateLimit.limit));
      headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      headers.set('X-RateLimit-Reset', String(rateLimit.reset));
      
      // Create new response with headers
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    
    return response;
  },
  
  /**
   * Shutdown the plugin
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down rate limit plugin');
    
    // Clear cleanup interval
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    
    // Clear rate limit store
    rateLimitStore.clear();
  },
};

export default RateLimitPlugin;
