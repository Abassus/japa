/**
 * Rate Limiting Plugin Tests
 * 
 * Tests for the rate limiting plugin functionality.
 */

import { describe, it, expect, beforeAll, afterEach, mock } from 'bun:test';
import { RateLimitAlgorithm } from '../../src/plugins/security/rate-limit-plugin';
import type { RequestContext } from '../../src/types';

// Create mocks
const mockLogger = {
  info: mock(() => {}),
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {})
};

// Mock modules
mock.module('../../src/plugins/observability/logger', () => ({
  logger: mockLogger
}));

// Import the rate limit plugin after mocking dependencies
import RateLimitPlugin from '../../src/plugins/security/rate-limit-plugin';

describe('Rate Limit Plugin', () => {
  beforeAll(async () => {
    // Initialize the plugin with test configuration
    await RateLimitPlugin.initialize({
      plugins: {
        rateLimit: {
          enabled: true,
          algorithm: RateLimitAlgorithm.FIXED_WINDOW,
          limit: 2, // Set a low limit for testing
          window: 60,
          identifierKey: 'ip',
          headers: true,
        },
      },
    });
  });

  afterEach(() => {
    // Clear rate limit store between tests
    if (RateLimitPlugin.shutdown) {
      RateLimitPlugin.shutdown();
    }
    
    // Re-initialize for next test
    RateLimitPlugin.initialize({
      plugins: {
        rateLimit: {
          enabled: true,
          algorithm: RateLimitAlgorithm.FIXED_WINDOW,
          limit: 2,
          window: 60,
          identifierKey: 'ip',
          headers: true,
        },
      },
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-Forwarded-For': '127.0.0.1',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            rateLimit: {
              enabled: true,
              limit: 2,
            },
          },
        },
      };

      // First request should be allowed
      await RateLimitPlugin.preProxy(context);
      expect(context.metadata.rateLimit).toBeDefined();
      expect(context.metadata.rateLimit.allowed).toBe(true);
      expect(context.metadata.rateLimit.remaining).toBe(1);

      // Second request should be allowed
      await RateLimitPlugin.preProxy(context);
      expect(context.metadata.rateLimit.allowed).toBe(true);
      expect(context.metadata.rateLimit.remaining).toBe(0);
    });

    it('should reject requests over the limit', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-Forwarded-For': '127.0.0.2',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            rateLimit: {
              enabled: true,
              limit: 2,
            },
          },
        },
      };

      // First request should be allowed
      await RateLimitPlugin.preProxy(context);
      expect(context.metadata.rateLimit.allowed).toBe(true);

      // Second request should be allowed
      await RateLimitPlugin.preProxy(context);
      expect(context.metadata.rateLimit.allowed).toBe(true);

      // Third request should be rejected
      await expect(RateLimitPlugin.preProxy(context)).rejects.toThrow();
    });

    it('should use route-specific configuration', async () => {
      // Create mock request context with higher limit
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-Forwarded-For': '127.0.0.3',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            rateLimit: {
              enabled: true,
              limit: 5, // Higher than global limit
            },
          },
        },
      };

      // First request should be allowed
      await RateLimitPlugin.preProxy(context);
      expect(context.metadata.rateLimit.allowed).toBe(true);
      expect(context.metadata.rateLimit.remaining).toBe(4);

      // Second request should be allowed
      await RateLimitPlugin.preProxy(context);
      expect(context.metadata.rateLimit.allowed).toBe(true);
      expect(context.metadata.rateLimit.remaining).toBe(3);

      // Third request should still be allowed (because of higher limit)
      await RateLimitPlugin.preProxy(context);
      expect(context.metadata.rateLimit.allowed).toBe(true);
      expect(context.metadata.rateLimit.remaining).toBe(2);
    });

    it('should skip rate limiting when disabled', async () => {
      // Create mock request context with rate limiting disabled
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-Forwarded-For': '127.0.0.4',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            rateLimit: {
              enabled: false,
            },
          },
        },
      };

      // Multiple requests should be allowed
      for (let i = 0; i < 10; i++) {
        await RateLimitPlugin.preProxy(context);
        expect(context.metadata.rateLimit).toBeUndefined();
      }
    });
  });

  describe('Response Headers', () => {
    it('should add rate limit headers to response', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-Forwarded-For': '127.0.0.5',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            rateLimit: {
              enabled: true,
              headers: true,
            },
          },
        },
      };

      // Execute pre-proxy hook
      await RateLimitPlugin.preProxy(context);

      // Create mock response
      const response = new Response('Test response');

      // Execute post-proxy hook
      const modifiedResponse = await RateLimitPlugin.postProxy(context, response);

      // Check headers
      expect(modifiedResponse.headers.has('X-RateLimit-Limit')).toBe(true);
      expect(modifiedResponse.headers.has('X-RateLimit-Remaining')).toBe(true);
      expect(modifiedResponse.headers.has('X-RateLimit-Reset')).toBe(true);
    });

    it('should not add headers when disabled', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-Forwarded-For': '127.0.0.6',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            rateLimit: {
              enabled: true,
              headers: false,
            },
          },
        },
      };

      // Execute pre-proxy hook
      await RateLimitPlugin.preProxy(context);

      // Create mock response
      const response = new Response('Test response');

      // Execute post-proxy hook
      const modifiedResponse = await RateLimitPlugin.postProxy(context, response);

      // Check headers
      expect(modifiedResponse.headers.has('X-RateLimit-Limit')).toBe(false);
      expect(modifiedResponse.headers.has('X-RateLimit-Remaining')).toBe(false);
      expect(modifiedResponse.headers.has('X-RateLimit-Reset')).toBe(false);
    });
  });
});
