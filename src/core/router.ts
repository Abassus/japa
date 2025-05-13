/**
 * Router Component
 * 
 * Handles request routing based on configured routes.
 * 
 * @module core/router
 */

import { Config } from './config';
import { logger } from '../plugins/observability/logger';
import { Route, RouteConfig } from '../types';

/**
 * Router class for handling request routing
 */
export class Router {
  private routes: Route[] = [];
  
  /**
   * Creates a new Router instance
   * 
   * @param config - Gateway configuration
   */
  constructor(private readonly config: Config) {}
  
  /**
   * Loads routes from configuration
   * 
   * @param routeConfigs - Route configurations
   */
  loadRoutes(routeConfigs: RouteConfig[]): void {
    this.routes = routeConfigs.map(config => this.createRoute(config));
    logger.info(`Loaded ${this.routes.length} routes`);
  }
  
  /**
   * Creates a route from configuration
   * 
   * @param config - Route configuration
   * @returns Route object
   */
  private createRoute(config: RouteConfig): Route {
    // Create path matcher
    const pathPattern = this.createPathPattern(config.path);
    
    // Create method matcher
    const methods = config.methods?.map(m => m.toUpperCase()) || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    
    return {
      ...config,
      pathPattern,
      methods,
    };
  }
  
  /**
   * Creates a path pattern for matching
   * 
   * @param path - Route path
   * @returns Path pattern
   */
  private createPathPattern(path: string): RegExp {
    // Convert path params to regex pattern
    // e.g. /users/:id -> /users/([^/]+)
    const regexPath = path
      .replace(/:[a-zA-Z0-9_]+/g, '([^/]+)')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexPath}$`);
  }
  
  /**
   * Finds a matching route for a request
   * 
   * @param request - HTTP request
   * @returns Matching route or undefined
   */
  findRoute(request: Request): Route | undefined {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    
    // Find first matching route
    const route = this.routes.find(route => {
      // Check if method matches
      if (!route.methods.includes(method)) {
        return false;
      }
      
      // Check if path matches
      return route.pathPattern.test(path);
    });
    
    if (route) {
      logger.debug(`Found route for ${method} ${path}`, { route: route.path });
    } else {
      logger.debug(`No route found for ${method} ${path}`);
    }
    
    return route;
  }
  
  /**
   * Extracts path parameters from a request
   * 
   * @param route - Matched route
   * @param request - HTTP request
   * @returns Path parameters
   */
  extractPathParams(route: Route, request: Request): Record<string, string> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Extract param names from route path
    const paramNames = (route.path.match(/:[a-zA-Z0-9_]+/g) || [])
      .map(param => param.substring(1));
    
    // Extract param values from actual path
    const paramValues = path.match(route.pathPattern)?.slice(1) || [];
    
    // Create params object
    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = paramValues[index] || '';
    });
    
    return params;
  }
  
  /**
   * Gets all registered routes
   * 
   * @returns Array of routes
   */
  getRoutes(): Route[] {
    return [...this.routes];
  }
}
