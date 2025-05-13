/**
 * Composition Engine
 * 
 * Handles aggregating responses from multiple backend services.
 * 
 * @module core/composition-engine
 */

import type { Config } from './config';
import { logger } from '../plugins/observability/logger';
import { ProxyEngine } from './proxy';
import type { RequestContext, CompositionConfig, CompositionBackend, ResponseFilter } from '../types';
import { HttpError } from '../utils/errors';

/**
 * Composition engine for aggregating responses from multiple backend services
 */
export class CompositionEngine {
  private proxyEngine: ProxyEngine;
  
  /**
   * Creates a new CompositionEngine instance
   * 
   * @param config - Gateway configuration
   */
  constructor(private readonly config: Config) {
    this.proxyEngine = new ProxyEngine(config);
  }
  
  /**
   * Composes responses from multiple backend services
   * 
   * @param context - Request context
   * @returns Composed response
   */
  async composeResponse(context: RequestContext): Promise<Response> {
    const { request, route } = context;
    
    if (!route) {
      throw new HttpError('Route not found', 404);
    }
    
    if (!route.composition) {
      throw new HttpError('Composition configuration not found', 500);
    }
    
    try {
      const composition = route.composition;
      const results: Record<string, any> = {};
      
      // Extract path parameters
      const url = new URL(request.url);
      const pathParams = this.extractPathParams(route.path, url.pathname);
      
      // Extract query parameters
      const queryParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      
      // Extract headers
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      // Extract body (if available)
      let body: any = {};
      if (this.shouldParseBody(request.method)) {
        try {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            // Clone the request to avoid locking the body stream
            const clonedRequest = request.clone();
            const text = await clonedRequest.text();
            if (text) {
              body = JSON.parse(text);
            }
          }
        } catch (error: unknown) {
          logger.error('Failed to parse request body', { error });
          throw error;
        }
      }
      
      // Execute backend requests
      if (composition.parallel) {
        // Execute in parallel
        const promises = composition.backends.map((backend: any) => 
          this.executeBackendRequest(backend, context, { pathParams, queryParams, headers, body })
            .then(result => {
              results[backend.outputKey] = result;
            })
            .catch(error => {
              if (backend.required) {
                throw error;
              }
              logger.warn(`Non-critical backend request failed: ${backend.target}${backend.path}`, { error });
              results[backend.outputKey] = null;
            })
        );
        
        // Wait for all requests to complete or timeout
        const timeout = composition.timeout || this.config.server.timeout;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Composition timeout')), timeout);
        });
        
        await Promise.race([
          Promise.all(promises),
          timeoutPromise
        ]);
      } else {
        // Execute sequentially
        for (const backend of composition.backends) {
          try {
            const result = await this.executeBackendRequest(
              backend, 
              context, 
              { pathParams, queryParams, headers, body, results }
            );
            results[backend.outputKey] = result;
          } catch (error) {
            if (backend.required) {
              throw error;
            }
            logger.warn(`Non-critical backend request failed: ${backend.target}${backend.path}`, { error });
            results[backend.outputKey] = null;
          }
        }
      }
      
      // Merge results based on strategy
      const mergedResult = this.mergeResults(results, composition);
      
      // Apply response filter if configured
      const filteredResult = composition.responseFilter 
        ? this.applyResponseFilter(mergedResult, composition.responseFilter)
        : mergedResult;
      
      // Create response
      return new Response(JSON.stringify(filteredResult), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Composition': 'true'
        }
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Composition timeout')) {
        logger.warn('Composition request timed out');
        throw new HttpError('Gateway Timeout', 504);
      }
      
      logger.error('Composition error', { error });
      throw new HttpError(
        error instanceof Error ? error.message : 'Composition Error', 
        502
      );
    }
  }
  
  /**
   * Executes a backend request
   * 
   * @param backend - Backend configuration
   * @param context - Request context
   * @param params - Request parameters
   * @returns Backend response data
   */
  private async executeBackendRequest(
    backend: CompositionBackend,
    context: RequestContext,
    params: {
      pathParams: Record<string, string>,
      queryParams: Record<string, string>,
      headers: Record<string, string>,
      body: any,
      results?: Record<string, any>
    }
  ): Promise<any> {
    const { pathParams, queryParams, headers, body, results } = params;
    
    // Build target URL with path parameters
    let path = backend.path;
    
    // Replace path parameters in format {param}
    path = path.replace(/{([^}]+)}/g, (match, param) => {
      // Check if parameter should be extracted from a specific source
      if (backend.extractParams?.path && backend.extractParams.path[param]) {
        const sourcePath = backend.extractParams.path[param];
        return pathParams[sourcePath] || match;
      }
      
      return pathParams[param] || match;
    });
    
    // Build query parameters
    const targetUrl = new URL(path, backend.target);
    
    // Add query parameters
    if (backend.extractParams?.query) {
      for (const [targetParam, sourceParam] of Object.entries(backend.extractParams.query)) {
        if (queryParams[sourceParam]) {
          targetUrl.searchParams.set(targetParam, queryParams[sourceParam]);
        }
      }
    }
    
    // Build headers
    const requestHeaders = new Headers();
    
    // Add extracted headers
    if (backend.extractParams?.headers) {
      for (const [targetHeader, sourceHeader] of Object.entries(backend.extractParams.headers)) {
        if (headers[sourceHeader]) {
          requestHeaders.set(targetHeader, headers[sourceHeader]);
        }
      }
    }
    
    // Build request body
    let requestBody: any = null;
    
    if (this.shouldParseBody(backend.method || 'GET') && backend.extractParams?.body) {
      const extractedBody: Record<string, any> = {};
      
      for (const [targetField, sourceField] of Object.entries(backend.extractParams.body)) {
        // Support dot notation for nested fields
        const value = this.getNestedValue(body, sourceField);
        if (value !== undefined) {
          this.setNestedValue(extractedBody, targetField, value);
        }
      }
      
      // If we have previous results, they can be referenced in the body
      if (results) {
        for (const [targetField, sourceField] of Object.entries(backend.extractParams.body)) {
          if (sourceField.startsWith('$.results.')) {
            const resultPath = sourceField.substring(10); // Remove '$.results.'
            const value = this.getNestedValue(results, resultPath);
            if (value !== undefined) {
              this.setNestedValue(extractedBody, targetField, value);
            }
          }
        }
      }
      
      if (Object.keys(extractedBody).length > 0) {
        requestBody = JSON.stringify(extractedBody);
        requestHeaders.set('Content-Type', 'application/json');
      }
    }
    
    // Create request
    const backendRequest = new Request(targetUrl.toString(), {
      method: backend.method || 'GET',
      headers: requestHeaders,
      body: requestBody
    });
    
    // Create a new context for the backend request
    const backendContext: RequestContext = {
      ...context,
      request: backendRequest,
      route: {
        ...context.route!,
        target: backend.target,
        path: backend.path
      }
    };
    
    // Set timeout
    const timeout = backend.timeout || this.config.server.timeout;
    
    // Execute request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Use the proxy engine to make the request
      const response = await this.proxyEngine.proxyRequest(backendContext, {
        timeout
      });
      
      // Parse response
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new HttpError(`Backend request failed: ${response.status} ${response.statusText}`, response.status);
      }
      
      // Parse JSON response
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch (error: unknown) {
        logger.warn(`Failed to parse backend response as JSON: ${responseText}`, { error });
        responseData = { text: responseText };
      }
      
      // Apply response filter if configured
      if (backend.filter) {
        responseData = this.applyResponseFilter(responseData, backend.filter);
      }
      
      return responseData;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  /**
   * Merges results based on the merge strategy
   * 
   * @param results - Backend results
   * @param composition - Composition configuration
   * @returns Merged result
   */
  private mergeResults(
    results: Record<string, any>,
    composition: CompositionConfig
  ): any {
    switch (composition.mergeStrategy) {
      case 'object':
        // Merge all results into a single object
        return results;
        
      case 'array':
        // Merge all results into an array
        return Object.values(results);
        
      case 'append':
        // Append all results together
        // This is useful for text-based results
        return Object.values(results).join('');
        
      case 'custom':
        // Custom merge function would be implemented here
        logger.warn('Custom merge strategy is not implemented yet');
        return results;
        
      default:
        return results;
    }
  }
  
  /**
   * Applies a response filter to the result
   * 
   * @param result - Result to filter
   * @param filter - Response filter configuration
   * @returns Filtered result
   */
  private applyResponseFilter(
    result: any,
    filter: ResponseFilter
  ): any {
    if (!result) {
      return result;
    }
    
    // Handle arrays
    if (Array.isArray(result)) {
      return result.map(item => this.applyResponseFilter(item, filter));
    }
    
    // Handle objects
    if (typeof result === 'object' && result !== null) {
      const filtered: Record<string, any> = {};
      
      // Apply whitelist if specified
      if (filter.whitelist && filter.whitelist.length > 0) {
        for (const key of filter.whitelist) {
          if (key in result) {
            filtered[key] = result[key];
          }
        }
        return filtered;
      }
      
      // Apply blacklist if specified
      if (filter.blacklist && filter.blacklist.length > 0) {
        for (const key in result) {
          if (!filter.blacklist.includes(key)) {
            filtered[key] = result[key];
          }
        }
        return filtered;
      }
      
      // Apply other filters
      for (const key in result) {
        const value = result[key];
        
        // Skip null values if configured
        if (filter.removeNulls && value === null) {
          continue;
        }
        
        // Skip empty arrays if configured
        if (filter.removeEmptyArrays && Array.isArray(value) && value.length === 0) {
          continue;
        }
        
        // Skip empty objects if configured
        if (filter.removeEmptyObjects && 
            typeof value === 'object' && 
            value !== null && 
            !Array.isArray(value) && 
            Object.keys(value).length === 0) {
          continue;
        }
        
        // Recursively filter nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          filtered[key] = this.applyResponseFilter(value, filter);
        } else {
          filtered[key] = value;
        }
      }
      
      return filtered;
    }
    
    // Return primitive values as is
    return result;
  }
  
  /**
   * Extracts path parameters from a URL path
   * 
   * @param routePath - Route path pattern
   * @param requestPath - Request path
   * @returns Path parameters
   */
  private extractPathParams(
    routePath: string,
    requestPath: string
  ): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Extract param names from route path
    const paramNames = (routePath.match(/:[a-zA-Z0-9_]+/g) || [])
      .map(param => param.substring(1));
    
    if (paramNames.length === 0) {
      return params;
    }
    
    // Create regex pattern from route path
    const regexPath = routePath
      .replace(/:[a-zA-Z0-9_]+/g, '([^/]+)')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPath}$`);
    
    // Extract param values from actual path
    const paramValues = requestPath.match(regex)?.slice(1) || [];
    
    // Create params object
    paramNames.forEach((name, index) => {
      params[name] = paramValues[index] || '';
    });
    
    return params;
  }
  
  /**
   * Checks if the request body should be parsed
   * 
   * @param method - HTTP method
   * @returns Whether to parse the body
   */
  private shouldParseBody(method: string): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
  }
  
  /**
   * Gets a nested value from an object using dot notation
   * 
   * @param obj - Object to get value from
   * @param path - Path to the value using dot notation
   * @returns Nested value or undefined
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Sets a nested value in an object using dot notation
   * 
   * @param obj - Object to set value in
   * @param path - Path to the value using dot notation
   * @param value - Value to set
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    if (!obj || !path) {
      return;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current)) {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}
