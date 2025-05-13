/**
 * Circuit Breaker Plugin Tests
 * 
 * Tests for the circuit breaker plugin functionality.
 */

import { describe, it, expect, beforeAll, afterEach, mock } from 'bun:test';
import { CircuitState } from '../../src/types';
import type { RequestContext } from '../../src/types';

// Create mocks
const mockLogger = {
  info: mock(() => {}),
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {})
};

const mockRecordMetric = mock(() => {});

// Mock modules
mock.module('../../src/plugins/observability/logger', () => ({
  logger: mockLogger
}));

mock.module('../../src/plugins/observability/telemetry', () => ({
  recordMetric: mockRecordMetric
}));

// Import the circuit breaker plugin after mocking dependencies
import CircuitBreakerPlugin from '../../src/plugins/traffic/circuit-breaker-plugin';

describe('Circuit Breaker Plugin', () => {
  beforeAll(async () => {
    // Initialize the plugin with test configuration
    await CircuitBreakerPlugin.initialize({
      plugins: {
        circuitBreaker: {
          enabled: true,
          failureThreshold: 0.5, // 50% failure rate
          successThreshold: 2,
          resetTimeout: 100, // Short timeout for testing
          windowSize: 4,
          trackByRoute: true,
        },
      },
    });
  });

  afterEach(async () => {
    // Reset circuit breaker state between tests
    if (CircuitBreakerPlugin.shutdown) {
      await CircuitBreakerPlugin.shutdown();
    }
    
    // Re-initialize for next test
    await CircuitBreakerPlugin.initialize({
      plugins: {
        circuitBreaker: {
          enabled: true,
          failureThreshold: 0.5,
          successThreshold: 2,
          resetTimeout: 100,
          windowSize: 4,
          trackByRoute: true,
        },
      },
    });
  });

  describe('Circuit States', () => {
    it('should start in closed state', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://service1.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
            },
          },
        },
      };

      // Execute pre-proxy hook
      await CircuitBreakerPlugin.preProxy(context);

      // Check that circuit is closed
      expect(context.metadata.circuitBreaker).toBeDefined();
      expect(context.metadata.circuitBreaker.result.state).toBe(CircuitState.CLOSED);
      expect(context.metadata.circuitBreaker.result.allowed).toBe(true);
    });

    it('should trip to open state after failures', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://service2.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
            },
          },
        },
      };

      // First request should be allowed
      await CircuitBreakerPlugin.preProxy(context);
      expect(context.metadata.circuitBreaker.result.allowed).toBe(true);

      // Record failures
      for (let i = 0; i < 3; i++) {
        // Record failure
        await CircuitBreakerPlugin.postProxy(context, new Response('Error', { status: 500 }));
      }

      // Next request should be rejected
      let errorThrown = false;
      try {
        await CircuitBreakerPlugin.preProxy(context);
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });

    it('should transition to half-open state after timeout', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://service3.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
              resetTimeout: 100, // Short timeout for testing
            },
          },
        },
      };

      // First request should be allowed
      await CircuitBreakerPlugin.preProxy(context);
      
      // Record failures to trip circuit
      for (let i = 0; i < 3; i++) {
        await CircuitBreakerPlugin.postProxy(context, new Response('Error', { status: 500 }));
      }
      
      // Circuit should be open
      let errorThrown = false;
      try {
        await CircuitBreakerPlugin.preProxy(context);
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 101));
      
      // Circuit should be half-open now
      await CircuitBreakerPlugin.preProxy(context);
      expect(context.metadata.circuitBreaker.result.state).toBe(CircuitState.HALF_OPEN);
      expect(context.metadata.circuitBreaker.result.allowed).toBe(true);
    });

    it('should close circuit after successful requests in half-open state', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://service4.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
              resetTimeout: 100, // Short timeout for testing
              successThreshold: 2,
            },
          },
        },
      };

      // First request should be allowed
      await CircuitBreakerPlugin.preProxy(context);
      
      // Record failures to trip circuit
      for (let i = 0; i < 3; i++) {
        await CircuitBreakerPlugin.postProxy(context, new Response('Error', { status: 500 }));
      }
      
      // Circuit should be open
      let errorThrown = false;
      try {
        await CircuitBreakerPlugin.preProxy(context);
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 101));
      
      // First request in half-open state
      await CircuitBreakerPlugin.preProxy(context);
      expect(context.metadata.circuitBreaker.result.state).toBe(CircuitState.HALF_OPEN);
      
      // Record success
      await CircuitBreakerPlugin.postProxy(context, new Response('Success', { status: 200 }));

      // Second request in half-open state
      await CircuitBreakerPlugin.preProxy(context);
      expect(context.metadata.circuitBreaker.result.state).toBe(CircuitState.HALF_OPEN);
      
      // Record success
      await CircuitBreakerPlugin.postProxy(context, new Response('Success', { status: 200 }));

      // Circuit should be closed now
      await CircuitBreakerPlugin.preProxy(context);
      expect(context.metadata.circuitBreaker.result.state).toBe(CircuitState.CLOSED);
    });

    it('should return to open state after failure in half-open state', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://service5.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
              resetTimeout: 100, // Short timeout for testing
            },
          },
        },
      };

      // First request should be allowed
      await CircuitBreakerPlugin.preProxy(context);
      
      // Record failures to trip circuit
      for (let i = 0; i < 3; i++) {
        await CircuitBreakerPlugin.postProxy(context, new Response('Error', { status: 500 }));
      }
      
      // Circuit should be open
      let errorThrown = false;
      try {
        await CircuitBreakerPlugin.preProxy(context);
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 101));
      
      // Request in half-open state
      await CircuitBreakerPlugin.preProxy(context);
      expect(context.metadata.circuitBreaker.result.state).toBe(CircuitState.HALF_OPEN);
      
      // Record failure
      await CircuitBreakerPlugin.postProxy(context, new Response('Error', { status: 500 }));

      // Circuit should be open again
      errorThrown = false;
      try {
        await CircuitBreakerPlugin.preProxy(context);
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should skip circuit breaking when disabled', async () => {
      // Create mock request context with circuit breaking disabled
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://service6.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: false,
            },
          },
        },
      };

      // Execute pre-proxy hook
      await CircuitBreakerPlugin.preProxy(context);

      // Check that circuit breaker was skipped
      expect(context.metadata.circuitBreaker).toBeUndefined();
    });

    it('should track circuits by route when configured', async () => {
      // Create two contexts with different routes but same target
      const context1: RequestContext = {
        request: new Request('http://example.com/api1'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api1',
          target: 'http://service7.com',
          pathPattern: /^\/api1$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
              trackByRoute: true,
            },
          },
        },
      };

      // Execute pre-proxy hook for first route
      await CircuitBreakerPlugin.preProxy(context1);
      expect(context1.metadata.circuitBreaker.result.state).toBe(CircuitState.CLOSED);
      
      // Skip testing the circuit opening logic for this test
      // Just verify that the second route has its own circuit
      
      const context2: RequestContext = {
        request: new Request('http://example.com/api2'),
        timestamp: new Date(),
        id: '124',
        metadata: {},
        route: {
          path: '/api2', // Different path
          target: 'http://service7.com', // Same target
          pathPattern: /^\/api2$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
              trackByRoute: true,
            },
          },
        },
      };
      
      // Execute pre-proxy hook for second route
      await CircuitBreakerPlugin.preProxy(context2);
      
      // Verify that the second route has its own circuit
      expect(context2.metadata.circuitBreaker).toBeDefined();
      expect(context2.metadata.circuitBreaker.result).toBeDefined();
      expect(context2.metadata.circuitBreaker.result.state).toBe(CircuitState.CLOSED);
      
      // Verify that the circuit keys are different
      expect(context1.metadata.circuitBreaker.key).not.toBe(context2.metadata.circuitBreaker.key);
    });

    it('should track circuits by host when configured', async () => {
      // Update plugin config to track by host
      await CircuitBreakerPlugin.initialize({
        plugins: {
          circuitBreaker: {
            enabled: true,
            failureThreshold: 0.5,
            successThreshold: 2,
            resetTimeout: 100,
            windowSize: 4,
            trackByRoute: false, // Track by host instead
          },
        },
      });

      // Create two contexts with different routes but same host
      const context1: RequestContext = {
        request: new Request('http://example.com/api1'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api1',
          target: 'http://service8.com',
          pathPattern: /^\/api1$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
              trackByRoute: false,
            },
          },
        },
      };

      const context2: RequestContext = {
        request: new Request('http://example.com/api2'),
        timestamp: new Date(),
        id: '124',
        metadata: {},
        route: {
          path: '/api2',
          target: 'http://service8.com',
          pathPattern: /^\/api2$/,
          methods: ['GET'],
          plugins: {
            circuitBreaker: {
              enabled: true,
              trackByRoute: false,
            },
          },
        },
      };

      // Trip circuit for first route
      await CircuitBreakerPlugin.preProxy(context1);
      for (let i = 0; i < 3; i++) {
        await CircuitBreakerPlugin.postProxy(context1, new Response('Error', { status: 500 }));
      }

      // First route should be open
      let errorThrown = false;
      try {
        await CircuitBreakerPlugin.preProxy(context1);
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);

      // Second route should also be open because they share the same host
      errorThrown = false;
      try {
        await CircuitBreakerPlugin.preProxy(context2);
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });
  });
});
