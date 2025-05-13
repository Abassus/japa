/**
 * Logging Plugin
 * 
 * Provides request/response logging for the Japa Gateway.
 * 
 * @module plugins/observability/logging-plugin
 */

import { type Plugin, type RequestContext } from '../../types';
import { logger } from './logger';
import { startSpan } from './telemetry';

/**
 * Logging plugin implementation
 */
const LoggingPlugin: Plugin = {
  /**
   * Initialize the plugin
   * 
   * @param config - Plugin configuration
   */
  async initialize(config: any): Promise<void> {
    logger.info('Initializing logging plugin');
    
    // Configure logger based on telemetry config
    if (config.telemetry?.logging) {
      // Check if configure method exists on logger
      if (typeof (logger as any).configure === 'function') {
        (logger as any).configure({
          level: config.telemetry.logging.level,
          format: config.telemetry.logging.format,
        });
      } else {
        // Log warning if configure method is not available
        logger.warn('Logger configure method not available, using default configuration');
      }
    }
  },
  
  /**
   * Run before routing
   * 
   * @param context - Request context
   */
  async preRouting(context: RequestContext): Promise<void> {
    const { request, id } = context;
    const url = new URL(request.url);
    
    // Initialize metadata if needed
    context.metadata = context.metadata || {};
    
    // Start request span
    const span = startSpan('http_request', { requestId: id });
    context.metadata.requestSpan = span;
    
    // Log request
    logger.info(`Incoming request: ${request.method} ${url.pathname}`, {
      requestId: id,
      method: request.method,
      path: url.pathname,
      query: url.search,
      userAgent: request.headers.get('user-agent'),
      clientIp: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });
  },
  
  /**
   * Run after proxying
   * 
   * @param context - Request context
   * @param response - Response from target service
   */
  async postProxy(context: RequestContext, response: any): Promise<void> {
    const { request, id, route, timestamp } = context;
    const url = new URL(request.url);
    
    // Calculate request duration
    const duration = Date.now() - timestamp.getTime();
    
    // End request span
    if (context.metadata?.requestSpan) {
      try {
        context.metadata.requestSpan.end();
      } catch (error) {
        logger.error('Error ending request span', { error });
      }
    }
    
    // Log response
    logger.info(`Response: ${response.status} ${request.method} ${url.pathname}`, {
      requestId: id,
      method: request.method,
      path: url.pathname,
      status: response.status,
      duration,
      target: route?.target,
    });
  },
  
  /**
   * Shutdown the plugin
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down logging plugin');
  },
};

export default LoggingPlugin;
