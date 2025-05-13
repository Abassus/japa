/**
 * Gateway Core
 * 
 * The main engine of the Japa Gateway that coordinates all components.
 * 
 * @module core/gateway
 */

import type { Server } from 'bun';
import type { Config } from './config';
import { AdvancedRouter } from './advanced-router';
import { ProxyEngine } from './proxy';
import { CompositionEngine } from './composition-engine';
import type { Plugin, RequestContext } from '../types';
import { logger } from '../plugins/observability/logger';
import { generateId } from '../utils/id';
import { initTelemetry, recordMetric } from '../plugins/observability/telemetry';
import { HttpError } from '../utils/errors';

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
  private router: AdvancedRouter;
  private proxy: ProxyEngine;
  private composition: CompositionEngine;
  private plugins: Plugin[] = [];
  private server: Server | null = null;
  private isRunning = false;

  /**
   * Creates a new Gateway instance
   * 
   * @param config - Gateway configuration
   */
  constructor(private readonly config: Config) {
    // Initialize components
    this.router = new AdvancedRouter(config);
    this.proxy = new ProxyEngine(config);
    this.composition = new CompositionEngine(config);

    // Initialize telemetry if enabled
    if (config.telemetry.enabled) {
      initTelemetry(config.telemetry);
    }
  }

  /**
   * Loads and initializes plugins
   * 
   * @returns Initialized plugins
   */
  private async loadPlugins(): Promise<Plugin[]> {
    const plugins: Plugin[] = [];
    
    // Load plugins from configuration
    for (const pluginConfig of this.config.plugins || []) {
      try {
        // Import plugin module
        const pluginModule = await import(pluginConfig.module);
        const PluginClass = pluginModule.default;
        
        // Create plugin instance
        const plugin = new PluginClass(pluginConfig.options || {});
        
        // Initialize plugin
        if (plugin.initialize) {
          await plugin.initialize(this.config);
        }
        
        plugins.push(plugin);
        logger.info(`Loaded plugin: ${pluginConfig.module}`);
      } catch (error) {
        logger.error(`Failed to load plugin: ${pluginConfig.module}`, { error });
        throw error;
      }
    }
    
    return plugins;
  }
  
  /**
   * Runs pre-routing plugins
   * 
   * @param context - Request context
   */
  private async runPreRoutingPlugins(context: RequestContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.preRouting) {
        await plugin.preRouting(context);
      }
    }
  }
  
  /**
   * Runs pre-proxy plugins
   * 
   * @param context - Request context
   */
  private async runPreProxyPlugins(context: RequestContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.preProxy) {
        await plugin.preProxy(context);
      }
    }
  }
  
  /**
   * Shuts down plugins
   */
  private async shutdownPlugins(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.shutdown) {
        try {
          await plugin.shutdown();
        } catch (error) {
          logger.error(`Failed to shutdown plugin`, { error });
        }
      }
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
      this.plugins = await this.loadPlugins();

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
      await this.shutdownPlugins();

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
    const url = new URL(request.url);
    
    // Add debug logging
    console.log(`Gateway handling request: ${request.method} ${url.pathname}`);
    logger.debug(`Gateway handling request: ${request.method} ${url.pathname}`, { url: url.toString() });
    
    logger.debug(`Gateway received request: ${request.method} ${url.pathname}`);
    logger.debug(`Available routes: ${JSON.stringify(this.router.getRoutes().map(r => r.path))}`);

    try {
      // Create request context
      const context: RequestContext = {
        request,
        timestamp: new Date(),
        id: generateId(),
        metadata: {},
      };

      // Run pre-routing plugins
      await this.runPreRoutingPlugins(context);

      // Find matching route
      const route = this.router.findRoute(request);
      if (!route) {
        logger.debug(`No route found for ${request.method} ${url.pathname}`);
        return new Response('Not Found', { status: 404 });
      }
      
      logger.debug(`Found route for ${request.method} ${url.pathname}: ${route.path} -> ${route.target}`);

      // Add route to context
      context.route = route;

      // Run pre-proxy plugins
      await this.runPreProxyPlugins(context);

      // Check if this route uses composition
      let response;
      if (context.route?.composition) {
        // Use composition engine to aggregate responses
        response = await this.composition.composeResponse(context);
      } else {
        // Forward request to target service
        response = await this.proxy.proxyRequest(context);
      }

      // Run post-proxy hooks
      for (const plugin of this.plugins) {
        if (plugin.postProxy) {
          await plugin.postProxy(context, response);
        }
      }

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
   * Handles errors in the HTTP server
   * 
   * @param error - Error object
   */
  private handleError(error: unknown): Response {
    logger.error('Server error', { error });
    
    // Return appropriate error response
    let status = 500;
    let message = 'Internal Server Error';
    
    if (error instanceof HttpError) {
      status = error.statusCode;
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }  
}
