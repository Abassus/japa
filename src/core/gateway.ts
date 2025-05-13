/**
 * Gateway Core
 * 
 * The main engine of the Japa Gateway that coordinates all components.
 * 
 * @module core/gateway
 */

import { Server } from 'bun';
import { Config } from './config';
import { Router } from './router';
import { PluginManager } from './plugin';
import { ProxyEngine } from './proxy';
import { logger } from '../plugins/observability/logger';
import { initTelemetry, recordMetric } from '../plugins/observability/telemetry';
import { HttpError } from '../utils/errors';
import { RequestContext } from '../types';

/**
 * Gateway options
 */
export interface GatewayOptions {
  /**
   * Whether to automatically start the gateway
   */
  autoStart?: boolean;
}

/**
 * Main Gateway class
 * 
 * Coordinates all components of the API gateway.
 */
export class Gateway {
  private server: Server | null = null;
  private router: Router;
  private pluginManager: PluginManager;
  private proxyEngine: ProxyEngine;
  private isRunning = false;
  
  /**
   * Creates a new Gateway instance
   * 
   * @param config - Gateway configuration
   * @param options - Gateway options
   */
  constructor(
    private readonly config: Config,
    private readonly options: GatewayOptions = {}
  ) {
    // Initialize components
    this.router = new Router(config);
    this.pluginManager = new PluginManager(config);
    this.proxyEngine = new ProxyEngine(config);
    
    // Initialize telemetry if enabled
    if (config.telemetry.enabled) {
      initTelemetry(config.telemetry);
    }
    
    // Auto-start if configured
    if (options.autoStart) {
      this.start().catch(err => {
        logger.error('Failed to auto-start gateway', { error: err });
      });
    }
  }
  
  /**
   * Starts the gateway
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Gateway is already running');
      return;
    }
    
    try {
      // Initialize plugins
      await this.pluginManager.initializePlugins();
      
      // Load routes
      this.router.loadRoutes(this.config.routes);
      
      // Create HTTP server
      this.server = Bun.serve({
        port: this.config.server.port,
        hostname: this.config.server.host,
        fetch: this.handleRequest.bind(this),
        error: this.handleError.bind(this),
      });
      
      this.isRunning = true;
      logger.info(`Gateway started on ${this.config.server.host}:${this.config.server.port}`);
    } catch (error) {
      logger.error('Failed to start gateway', { error });
      throw error;
    }
  }
  
  /**
   * Stops the gateway
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      logger.warn('Gateway is not running');
      return;
    }
    
    try {
      // Close server
      this.server.stop(true);
      this.server = null;
      
      // Shutdown plugins
      await this.pluginManager.shutdownPlugins();
      
      this.isRunning = false;
      logger.info('Gateway stopped');
    } catch (error) {
      logger.error('Failed to stop gateway', { error });
      throw error;
    }
  }
  
  /**
   * Handles incoming HTTP requests
   * 
   * @param request - HTTP request
   * @returns HTTP response
   */
  private async handleRequest(request: Request): Promise<Response> {
    const startTime = performance.now();
    
    try {
      // Create request context
      const context: RequestContext = {
        request,
        timestamp: new Date(),
        id: crypto.randomUUID(),
        metadata: {},
      };
      
      // Run pre-routing plugins
      await this.pluginManager.runPreRoutingPlugins(context);
      
      // Find route
      const route = this.router.findRoute(request);
      if (!route) {
        return new Response('Not Found', { status: 404 });
      }
      
      // Add route to context
      context.route = route;
      
      // Run pre-proxy plugins
      await this.pluginManager.runPreProxyPlugins(context);
      
      // Proxy request to target
      const response = await this.proxyEngine.proxyRequest(context);
      
      // Run post-proxy plugins
      await this.pluginManager.runPostProxyPlugins(context, response);
      
      // Record metrics
      const duration = performance.now() - startTime;
      recordMetric('request_duration', duration, {
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
      });
      
      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Handles errors during request processing
   * 
   * @param error - Error object
   * @returns Error response
   */
  private handleError(error: Error): Response {
    logger.error('Request error', { error });
    
    if (error instanceof HttpError) {
      return new Response(error.message, {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Generic error response
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
