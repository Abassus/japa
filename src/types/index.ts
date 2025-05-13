/**
 * Type Definitions for Japa Gateway
 * 
 * @module types
 */

// Import advanced routing types
export * from './advanced-routing';

/**
 * Route configuration from user config
 */
export interface RouteConfig {
  /**
   * Route path pattern
   */
  path: string;
  
  /**
   * HTTP methods to match
   */
  methods?: string[];
  
  /**
   * Target service URL
   */
  target: string;
  
  /**
   * Plugin configurations for this route
   */
  plugins?: Record<string, any>;
  
  /**
   * Rule-based routing configuration
   */
  rules?: RoutingRule[];
  
  /**
   * Path rewriting configuration
   */
  pathRewrite?: PathRewrite;
  
  /**
   * Response filtering configuration
   */
  responseFilter?: ResponseFilter;
  
  /**
   * Backend composition configuration
   */
  composition?: CompositionConfig;
  
  /**
   * Health check configuration
   */
  healthCheck?: HealthCheck;
}

/**
 * Internal route representation
 */
export interface Route extends RouteConfig {
  /**
   * Compiled path pattern for matching
   */
  pathPattern: RegExp;
  
  /**
   * Normalized HTTP methods
   */
  methods: string[];
}

/**
 * Request context passed through the request pipeline
 */
export interface RequestContext {
  /**
   * Original HTTP request
   */
  request: Request;
  
  /**
   * Request timestamp
   */
  timestamp: Date;
  
  /**
   * Unique request ID
   */
  id: string;
  
  /**
   * Matched route (if any)
   */
  route?: Route;
  
  /**
   * Request metadata for plugins
   */
  metadata: Record<string, any>;
}

/**
 * Plugin interface
 */
export interface Plugin {
  /**
   * Initialize the plugin
   */
  initialize?(config: any): Promise<void>;
  
  /**
   * Run before routing
   */
  preRouting?(context: RequestContext): Promise<void>;
  
  /**
   * Run before proxying
   */
  preProxy?(context: RequestContext): Promise<void>;
  
  /**
   * Run after proxying
   */
  postProxy?(context: RequestContext, response: Response): Promise<void>;
  
  /**
   * Shutdown the plugin
   */
  shutdown?(): Promise<void>;
}

/**
 * Proxy options
 */
export interface ProxyOptions {
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Client IP address
   */
  clientIp?: string;
  
  /**
   * Original request scheme (http/https)
   */
  originalScheme?: string;
  
  /**
   * Whether to preserve host header
   */
  preserveHostHeader?: boolean;
}

/**
 * Authentication result
 */
export interface AuthResult {
  /**
   * Whether authentication was successful
   */
  authenticated: boolean;
  
  /**
   * Authentication error message (if any)
   */
  error?: string;
  
  /**
   * User information (if authenticated)
   */
  user?: Record<string, any>;
  
  /**
   * Authentication scope or roles
   */
  scope?: string[];
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  
  /**
   * Remaining requests in the current window
   */
  remaining: number;
  
  /**
   * Total limit
   */
  limit: number;
  
  /**
   * Reset time in seconds
   */
  reset: number;
}

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

/**
 * Circuit breaker result
 */
export interface CircuitBreakerResult {
  /**
   * Current circuit state
   */
  state: CircuitState;
  
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  
  /**
   * Error message (if not allowed)
   */
  error?: string;
}
