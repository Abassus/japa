/**
 * Proxy Engine
 * 
 * Handles forwarding requests to backend services.
 * 
 * @module core/proxy
 */

import { Config } from './config';
import { logger } from '../plugins/observability/logger';
import { RequestContext, ProxyOptions } from '../types';
import { HttpError } from '../utils/errors';

/**
 * Proxy engine for forwarding requests to backend services
 */
export class ProxyEngine {
  /**
   * Creates a new ProxyEngine instance
   * 
   * @param config - Gateway configuration
   */
  constructor(private readonly config: Config) {}
  
  /**
   * Proxies a request to a target service
   * 
   * @param context - Request context
   * @param options - Proxy options
   * @returns Response from target service
   */
  async proxyRequest(
    context: RequestContext,
    options: ProxyOptions = {}
  ): Promise<Response> {
    const { request, route } = context;
    
    if (!route) {
      throw new HttpError('Route not found', 404);
    }
    
    try {
      // Create target URL
      const targetUrl = this.buildTargetUrl(request, route.target);
      
      // Create headers for proxied request
      const headers = this.buildProxyHeaders(request.headers, options);
      
      // Set timeout
      const timeout = options.timeout ?? this.config.server.timeout;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Log proxy attempt
      logger.debug(`Proxying request to ${targetUrl}`, {
        method: request.method,
        originalUrl: request.url,
        targetUrl,
      });
      
      // Create proxy request
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers,
        body: this.shouldForwardBody(request.method) ? request.body : null,
        signal: controller.signal,
      });

      // Add detailed log before fetch
      console.log(`[ProxyEngine] Attempting to fetch: ${proxyRequest.method} ${proxyRequest.url}`);
      
      // Send request to target
      const response = await fetch(proxyRequest);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Create response with original headers
      const proxyResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: this.buildResponseHeaders(response.headers, options),
      });
      
      return proxyResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn(`Request to ${route.target} timed out`);
        throw new HttpError('Gateway Timeout', 504);
      }
      
      logger.error(`Proxy error for ${route.target}`, { error });
      throw new HttpError('Bad Gateway', 502);
    }
  }
  
  /**
   * Builds the target URL for the proxied request
   * 
   * @param request - Original request
   * @param targetBase - Target base URL
   * @returns Target URL
   */
  private buildTargetUrl(request: Request, targetBase: string): string {
    const originalUrl = new URL(request.url);
    const targetUrl = new URL(targetBase);
    
    // Add debug logging
    console.log(`Building target URL: Original URL: ${originalUrl.toString()}, Target base: ${targetBase}`);
    
    // Preserve path and query parameters
    // Handle the case where the target URL already has a path
    if (targetUrl.pathname === '/' || targetUrl.pathname === '') {
      targetUrl.pathname = originalUrl.pathname;
    } else {
      // If the target has a specific path, use it as is
      targetUrl.pathname = targetUrl.pathname.replace(/\/$/, '');
    }
    
    targetUrl.search = originalUrl.search;
    
    console.log(`Final target URL: ${targetUrl.toString()}`);
    return targetUrl.toString();
  }
  
  /**
   * Builds headers for the proxied request
   * 
   * @param originalHeaders - Original request headers
   * @param options - Proxy options
   * @returns Headers for proxied request
   */
  private buildProxyHeaders(
    originalHeaders: Headers,
    options: ProxyOptions
  ): Headers {
    const headers = new Headers();
    
    // Copy original headers
    for (const [key, value] of originalHeaders.entries()) {
      // Skip hop-by-hop headers
      if (this.isHopByHopHeader(key)) {
        continue;
      }
      
      headers.set(key, value);
    }
    
    // Add X-Forwarded headers
    const forwardedFor = originalHeaders.get('X-Forwarded-For');
    const clientIp = options.clientIp || '127.0.0.1';
    
    if (forwardedFor) {
      headers.set('X-Forwarded-For', `${forwardedFor}, ${clientIp}`);
    } else {
      headers.set('X-Forwarded-For', clientIp);
    }
    
    // Add X-Forwarded-Host if not present
    if (!headers.has('X-Forwarded-Host')) {
      const originalHost = originalHeaders.get('Host');
      if (originalHost) {
        headers.set('X-Forwarded-Host', originalHost);
      }
    }
    
    // Add X-Forwarded-Proto if not present
    if (!headers.has('X-Forwarded-Proto')) {
      const proto = options.originalScheme || 'http';
      headers.set('X-Forwarded-Proto', proto);
    }
    
    // Add Via header
    const via = `1.1 japa-gateway`;
    const existingVia = headers.get('Via');
    headers.set('Via', existingVia ? `${existingVia}, ${via}` : via);
    
    return headers;
  }
  
  /**
   * Builds headers for the response
   * 
   * @param responseHeaders - Original response headers
   * @param options - Proxy options
   * @returns Headers for response
   */
  private buildResponseHeaders(
    responseHeaders: Headers,
    options: ProxyOptions
  ): Headers {
    const headers = new Headers();
    
    // Copy original headers
    for (const [key, value] of responseHeaders.entries()) {
      // Skip hop-by-hop headers
      if (this.isHopByHopHeader(key)) {
        continue;
      }
      
      headers.set(key, value);
    }
    
    // Add Via header
    const via = `1.1 japa-gateway`;
    const existingVia = headers.get('Via');
    headers.set('Via', existingVia ? `${existingVia}, ${via}` : via);
    
    return headers;
  }
  
  /**
   * Checks if a header is a hop-by-hop header
   * 
   * @param header - Header name
   * @returns Whether the header is hop-by-hop
   */
  private isHopByHopHeader(header: string): boolean {
    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
    ];
    
    return hopByHopHeaders.includes(header.toLowerCase());
  }
  
  /**
   * Checks if the request body should be forwarded
   * 
   * @param method - HTTP method
   * @returns Whether to forward the body
   */
  private shouldForwardBody(method: string): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
  }
}
