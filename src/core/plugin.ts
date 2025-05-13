/**
 * Plugin System
 * 
 * Manages plugins and their lifecycle in the Japa Gateway.
 * 
 * @module core/plugin
 */

import { Config } from './config';
import { logger } from '../plugins/observability/logger';
import { Plugin, RequestContext } from '../types';

/**
 * Plugin lifecycle hooks
 */
export enum PluginHook {
  PRE_ROUTING = 'preRouting',
  PRE_PROXY = 'preProxy',
  POST_PROXY = 'postProxy',
}

/**
 * Plugin manager for handling plugin lifecycle
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  
  /**
   * Creates a new PluginManager instance
   * 
   * @param config - Gateway configuration
   */
  constructor(private readonly config: Config) {}
  
  /**
   * Registers a plugin
   * 
   * @param name - Plugin name
   * @param plugin - Plugin instance
   */
  registerPlugin(name: string, plugin: Plugin): void {
    if (this.plugins.has(name)) {
      logger.warn(`Plugin ${name} is already registered, overwriting`);
    }
    
    this.plugins.set(name, plugin);
    logger.debug(`Registered plugin: ${name}`);
  }
  
  /**
   * Initializes all registered plugins
   */
  async initializePlugins(): Promise<void> {
    logger.info('Initializing plugins...');
    
    // Load built-in plugins
    await this.loadBuiltInPlugins();
    
    // Initialize each plugin
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        if (plugin.initialize) {
          await plugin.initialize(this.config);
          logger.debug(`Initialized plugin: ${name}`);
        }
      } catch (error) {
        logger.error(`Failed to initialize plugin: ${name}`, { error });
      }
    }
    
    logger.info(`Initialized ${this.plugins.size} plugins`);
  }
  
  /**
   * Loads built-in plugins
   */
  private async loadBuiltInPlugins(): Promise<void> {
    // Import built-in plugins
    const authPlugin = await import('../plugins/auth/auth-plugin');
    const rateLimitPlugin = await import('../plugins/security/rate-limit-plugin');
    const corsPlugin = await import('../plugins/security/cors-plugin');
    const circuitBreakerPlugin = await import('../plugins/traffic/circuit-breaker-plugin');
    const loggingPlugin = await import('../plugins/observability/logging-plugin');
    
    // Register built-in plugins
    this.registerPlugin('auth', authPlugin.default);
    this.registerPlugin('rateLimit', rateLimitPlugin.default);
    this.registerPlugin('cors', corsPlugin.default);
    this.registerPlugin('circuitBreaker', circuitBreakerPlugin.default);
    this.registerPlugin('logging', loggingPlugin.default);
  }
  
  /**
   * Runs pre-routing plugins
   * 
   * @param context - Request context
   */
  async runPreRoutingPlugins(context: RequestContext): Promise<void> {
    await this.runPluginHook(PluginHook.PRE_ROUTING, context);
  }
  
  /**
   * Runs pre-proxy plugins
   * 
   * @param context - Request context
   */
  async runPreProxyPlugins(context: RequestContext): Promise<void> {
    await this.runPluginHook(PluginHook.PRE_PROXY, context);
  }
  
  /**
   * Runs post-proxy plugins
   * 
   * @param context - Request context
   * @param response - Response from target service
   */
  async runPostProxyPlugins(
    context: RequestContext,
    response: Response
  ): Promise<void> {
    await this.runPluginHook(PluginHook.POST_PROXY, context, response);
  }
  
  /**
   * Runs a plugin hook for all plugins
   * 
   * @param hook - Plugin hook to run
   * @param context - Request context
   * @param response - Response (for post-proxy hooks)
   */
  private async runPluginHook(
    hook: PluginHook,
    context: RequestContext,
    response?: Response
  ): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        // Check if plugin has the hook
        if (plugin[hook]) {
          await plugin[hook](context, response);
        }
      } catch (error) {
        logger.error(`Plugin ${name} failed during ${hook}`, { error });
        // Continue with other plugins even if one fails
      }
    }
  }
  
  /**
   * Shuts down all registered plugins
   */
  async shutdownPlugins(): Promise<void> {
    logger.info('Shutting down plugins...');
    
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        if (plugin.shutdown) {
          await plugin.shutdown();
          logger.debug(`Shut down plugin: ${name}`);
        }
      } catch (error) {
        logger.error(`Failed to shut down plugin: ${name}`, { error });
      }
    }
    
    logger.info('All plugins shut down');
  }
  
  /**
   * Gets a registered plugin by name
   * 
   * @param name - Plugin name
   * @returns Plugin instance or undefined
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Gets all registered plugins
   * 
   * @returns Map of plugins
   */
  getPlugins(): Map<string, Plugin> {
    return new Map(this.plugins);
  }
}
