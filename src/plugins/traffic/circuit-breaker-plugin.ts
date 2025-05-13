/**
 * Circuit Breaker Plugin
 * 
 * Provides circuit breaking capabilities for the Japa Gateway.
 * 
 * @module plugins/traffic/circuit-breaker-plugin
 */

import { type Plugin, type RequestContext } from '../../types';
import { CircuitState, type CircuitBreakerResult } from '../../types';
import { logger } from '../observability/logger';
import { CircuitBreakerOpenError } from '../../utils/errors';
import { recordMetric } from '../observability/telemetry';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Whether circuit breaking is enabled
   */
  enabled: boolean;
  
  /**
   * Failure threshold to trip the circuit
   */
  failureThreshold: number;
  
  /**
   * Success threshold to reset the circuit
   */
  successThreshold: number;
  
  /**
   * Timeout in milliseconds before transitioning to half-open
   */
  resetTimeout: number;
  
  /**
   * Window size for failure rate calculation
   */
  windowSize: number;
  
  /**
   * Whether to track failures by route
   */
  trackByRoute: boolean;
}

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000,
  windowSize: 10,
  trackByRoute: true,
};

/**
 * Circuit state information
 */
interface CircuitInfo {
  /**
   * Current state
   */
  state: CircuitState;
  
  /**
   * Failure count
   */
  failures: number;
  
  /**
   * Success count
   */
  successes: number;
  
  /**
   * Last failure timestamp
   */
  lastFailure: number;
  
  /**
   * Last state change timestamp
   */
  lastStateChange: number;
  
  /**
   * Recent request results (true = success, false = failure)
   */
  recentResults: boolean[];
}

/**
 * In-memory store for circuit breakers
 * In production, this would use a distributed store
 */
const circuitStore: Map<string, CircuitInfo> = new Map();

// Plugin configuration
let pluginConfig: CircuitBreakerConfig = { ...DEFAULT_CONFIG };

/**
 * Gets circuit key for a target
 * 
 * @param target - Target service URL
 * @param config - Circuit breaker configuration
 * @returns Circuit key
 */
function getCircuitKey(target: string, config: CircuitBreakerConfig, route?: { path: string }): string {
  if (config.trackByRoute && route) {
    // Track by route - include both target and route path
    return `circuit:${target}:${route.path}`;
  }
  
  // Track by host
  const url = new URL(target);
  return `circuit:${url.hostname}`;
}

/**
 * Gets or creates a circuit info object
 * 
 * @param key - Circuit key
 * @returns Circuit info
 */
function getOrCreateCircuit(key: string): CircuitInfo {
  if (!circuitStore.has(key)) {
    circuitStore.set(key, {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailure: 0,
      lastStateChange: Date.now(),
      recentResults: [],
    });
  }
  
  return circuitStore.get(key)!;
}

/**
 * Gets the current circuit state
 * 
 * @param key - Circuit key
 * @returns Circuit state
 */
function getCircuitState(key: string): CircuitState {
  return getOrCreateCircuit(key).state;
}

/**
 * Calculates the failure rate for a circuit
 * 
 * @param circuit - Circuit info
 * @returns Failure rate
 */
function calculateFailureRate(circuit: CircuitInfo): number {
  if (circuit.recentResults.length === 0) {
    return 0;
  }
  
  const failures = circuit.recentResults.filter(result => !result).length;
  return failures / circuit.recentResults.length;
}

/**
 * Records a request result
 * 
 * @param key - Circuit key
 * @param success - Whether the request was successful
 */
function recordResult(key: string, success: boolean): void {
  // Get circuit info
  const circuit = getOrCreateCircuit(key);
  const now = Date.now();
  
  // Update recent results
  circuit.recentResults.push(success);
  if (circuit.recentResults.length > pluginConfig.windowSize) {
    circuit.recentResults.shift();
  }
  
  // Update success/failure counts
  if (success) {
    circuit.successes++;
  } else {
    circuit.failures++;
    circuit.lastFailure = now;
  }
  
  // Update circuit state based on results
  switch (circuit.state) {
    case CircuitState.CLOSED:
      // Check if failure threshold is reached
      const failureRate = calculateFailureRate(circuit);
      if (failureRate >= pluginConfig.failureThreshold) {
        // Trip the circuit
        circuit.state = CircuitState.OPEN;
        circuit.lastStateChange = now;
        circuit.successes = 0;
        
        logger.info('Circuit tripped to open', {
          key,
          failureRate,
          threshold: pluginConfig.failureThreshold,
        });
      }
      break;
    
    case CircuitState.HALF_OPEN:
      if (!success) {
        // Any failure in half-open state trips the circuit again
        circuit.state = CircuitState.OPEN;
        circuit.lastStateChange = now;
        circuit.successes = 0;
        
        logger.info('Circuit returned to open from half-open', { key });
      } else if (circuit.successes >= pluginConfig.successThreshold) {
        // Success threshold reached, close the circuit
        circuit.state = CircuitState.CLOSED;
        circuit.lastStateChange = now;
        circuit.failures = 0;
        
        logger.info('Circuit closed from half-open', { key });
      }
      break;
  }
  
  // Update circuit store
  circuitStore.set(key, circuit);
}

/**
 * Checks circuit state
 * 
 * @param key - Circuit key
 * @param config - Circuit breaker configuration
 * @returns Circuit breaker result
 */
function checkCircuit(key: string, config: CircuitBreakerConfig): CircuitBreakerResult {
  // Get or create circuit info
  const circuit = getOrCreateCircuit(key);
  const now = Date.now();
  
  // Check circuit state
  switch (circuit.state) {
    case CircuitState.OPEN:
      // Check if reset timeout has passed
      if (now - circuit.lastStateChange > config.resetTimeout) {
        // Transition to half-open
        circuit.state = CircuitState.HALF_OPEN;
        circuit.lastStateChange = now;
        
        // Update circuit store
        circuitStore.set(key, circuit);
        
        logger.info('Circuit transitioned to half-open', { key });
        
        // Allow the request
        return {
          state: CircuitState.HALF_OPEN,
          allowed: true,
        };
      }
      
      // Circuit is still open
      return {
        state: CircuitState.OPEN,
        allowed: false,
        error: 'Circuit is open',
      };
    
    case CircuitState.HALF_OPEN:
      // Allow limited traffic in half-open state
      return {
        state: CircuitState.HALF_OPEN,
        allowed: true,
      };
    
    case CircuitState.CLOSED:
      // Circuit is closed, allow the request
      return {
        state: CircuitState.CLOSED,
        allowed: true,
      };
    
    default:
      // Unknown state, default to closed
      return {
        state: CircuitState.CLOSED,
        allowed: true,
      };
  }
}

/**
 * Circuit breaker plugin implementation
 */
const CircuitBreakerPlugin: Plugin = {
  /**
   * Initialize the plugin
   * 
   * @param config - Plugin configuration
   */
  async initialize(config: any): Promise<void> {
    logger.info('Initializing circuit breaker plugin');
    
    // Merge with default config
    pluginConfig = {
      ...DEFAULT_CONFIG,
      ...config.plugins?.circuitBreaker,
    };
    
    logger.debug('Circuit breaker plugin configured', {
      enabled: pluginConfig.enabled,
      failureThreshold: pluginConfig.failureThreshold,
      resetTimeout: pluginConfig.resetTimeout,
    });
  },
  
  /**
   * Run before proxying
   * 
   * @param context - Request context
   */
  async preProxy(context: RequestContext): Promise<void> {
    const { route } = context;
    
    // Skip if circuit breaking is not enabled or no route
    if (!pluginConfig.enabled || !route) {
      return;
    }
    
    // Get route-specific circuit breaker config
    const routeConfig = {
      ...pluginConfig,
      ...route.plugins?.circuitBreaker,
    };
    
    // Skip if circuit breaking is disabled for this route
    if (!routeConfig.enabled) {
      return;
    }
    
    // Get circuit key
    const circuitKey = getCircuitKey(route.target, routeConfig, route);
    
    // Check circuit state
    const result = checkCircuit(circuitKey, routeConfig);
    
    // Store result in context
    context.metadata = context.metadata || {};
    context.metadata.circuitBreaker = {
      key: circuitKey,
      result,
    };
    
    // If circuit is open, throw error
    if (!result.allowed) {
      logger.warn('Circuit is open', {
        target: route.target,
        state: result.state,
      });
      
      recordMetric('circuit_breaker_rejection', 1, {
        target: route.target,
        state: result.state,
      });
      
      throw new CircuitBreakerOpenError(
        result.error || 'Service temporarily unavailable'
      );
    }
  },
  
  /**
   * Run after proxying
   * 
   * @param context - Request context
   * @param response - Response from target service
   */
  async postProxy(context: RequestContext, response: Response): Promise<void> {
    const { metadata } = context;
    
    // Skip if no circuit breaker info
    if (!metadata?.circuitBreaker) {
      return;
    }
    
    const { key, result } = metadata.circuitBreaker;
    
    // Record success or failure
    const success = response.status < 500;
    recordResult(key, success);
    
    // Log circuit state change
    if (result.state !== getCircuitState(key)) {
      logger.info('Circuit state changed', {
        target: context.route?.target,
        from: result.state,
        to: getCircuitState(key),
      });
      
      recordMetric('circuit_breaker_state_change', 1, {
        target: context.route?.target,
        from: result.state,
        to: getCircuitState(key),
      });
    }
  },
  
  /**
   * Shutdown the plugin
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down circuit breaker plugin');
    circuitStore.clear();
  },
};

export default CircuitBreakerPlugin;
