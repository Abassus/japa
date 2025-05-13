/**
 * Advanced Routing Types
 * 
 * Type definitions for enhanced routing capabilities.
 */

/**
 * Condition for rule-based routing
 */
export interface RoutingCondition {
  /**
   * Type of condition
   */
  type: 'header' | 'cookie' | 'query' | 'path' | 'method' | 'body' | 'ip' | 'time' | 'expression';
  
  /**
   * Name of the parameter to check (e.g., header name, cookie name)
   */
  name?: string;
  
  /**
   * Operator for comparison
   */
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'matches' | 'exists' | 'not_exists' | 'greater_than' | 'less_than';
  
  /**
   * Value to compare against
   */
  value?: string | number | boolean | string[];
  
  /**
   * Regular expression pattern for 'matches' operator
   */
  pattern?: string;
  
  /**
   * For complex expressions using a simple expression language
   */
  expression?: string;
}

/**
 * Logical group of conditions with AND/OR relationship
 */
export interface RoutingConditionGroup {
  /**
   * Logical operator for the conditions
   */
  operator: 'and' | 'or';
  
  /**
   * List of conditions or nested condition groups
   */
  conditions: (RoutingCondition | RoutingConditionGroup)[];
}

/**
 * Rule for conditional routing
 */
export interface RoutingRule {
  /**
   * Conditions that must be met for this rule
   */
  conditions: RoutingCondition | RoutingConditionGroup;
  
  /**
   * Target service to route to if conditions are met
   */
  target: string;
  
  /**
   * Priority of the rule (higher numbers have higher priority)
   */
  priority?: number;
  
  /**
   * Path rewriting rules
   */
  pathRewrite?: PathRewrite;
  
  /**
   * Additional headers to add to the request
   */
  requestHeaders?: Record<string, string>;
  
  /**
   * Plugin configurations specific to this rule
   */
  plugins?: Record<string, any>;
}

/**
 * Path rewriting configuration
 */
export interface PathRewrite {
  /**
   * Pattern to match
   */
  pattern: string;
  
  /**
   * Replacement string
   */
  replacement: string;
}

/**
 * Health check configuration for a backend service
 */
export interface HealthCheck {
  /**
   * Path to check on the target service
   */
  path: string;
  
  /**
   * Interval between checks in seconds
   */
  interval: number;
  
  /**
   * Timeout for health check in seconds
   */
  timeout: number;
  
  /**
   * Number of consecutive failures before marking as unhealthy
   */
  unhealthyThreshold: number;
  
  /**
   * Number of consecutive successes before marking as healthy
   */
  healthyThreshold: number;
  
  /**
   * Expected status code for a healthy response
   */
  expectedStatus?: number;
  
  /**
   * HTTP method to use for health check
   */
  method?: string;
}

/**
 * Configuration for response filtering
 */
export interface ResponseFilter {
  /**
   * Fields to include in the response (whitelist)
   */
  whitelist?: string[];
  
  /**
   * Fields to exclude from the response (blacklist)
   */
  blacklist?: string[];
  
  /**
   * Whether to remove null values
   */
  removeNulls?: boolean;
  
  /**
   * Whether to remove empty arrays
   */
  removeEmptyArrays?: boolean;
  
  /**
   * Whether to remove empty objects
   */
  removeEmptyObjects?: boolean;
}

/**
 * Backend service for composition
 */
export interface CompositionBackend {
  /**
   * Target URL for the backend service
   */
  target: string;
  
  /**
   * Path to call on the target service
   */
  path: string;
  
  /**
   * HTTP method to use
   */
  method?: string;
  
  /**
   * Key to store the response under in the composed response
   */
  outputKey: string;
  
  /**
   * Whether this backend is required (if it fails, the whole request fails)
   */
  required?: boolean;
  
  /**
   * Timeout for this specific backend in milliseconds
   */
  timeout?: number;
  
  /**
   * Response filter for this backend
   */
  filter?: ResponseFilter;
  
  /**
   * Parameters to extract from the original request and pass to this backend
   */
  extractParams?: {
    /**
     * Path parameters to extract
     */
    path?: Record<string, string>;
    
    /**
     * Query parameters to extract
     */
    query?: Record<string, string>;
    
    /**
     * Headers to extract
     */
    headers?: Record<string, string>;
    
    /**
     * Body fields to extract
     */
    body?: Record<string, string>;
  };
}

/**
 * Configuration for backend composition
 */
export interface CompositionConfig {
  /**
   * Backend services to call
   */
  backends: CompositionBackend[];
  
  /**
   * Strategy for merging responses
   */
  mergeStrategy: 'object' | 'array' | 'append' | 'custom';
  
  /**
   * Custom merge function name (if mergeStrategy is 'custom')
   */
  customMergeFunction?: string;
  
  /**
   * Timeout for the entire composition in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to execute backends in parallel or sequential
   */
  parallel?: boolean;
  
  /**
   * Response filter to apply to the final composed response
   */
  responseFilter?: ResponseFilter;
}
