/**
 * CORS Plugin Tests
 * 
 * Tests for the CORS plugin functionality.
 */

import { describe, it, expect, beforeAll, afterEach, mock } from 'bun:test';
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

// Import the CORS plugin after mocking dependencies
import CorsPlugin from '../../src/plugins/security/cors-plugin';

describe('CORS Plugin', () => {
  beforeAll(async () => {
    // Initialize the plugin with test configuration
    await CorsPlugin.initialize({
      plugins: {
        cors: {
          enabled: true,
          origins: ['https://example.com'],
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          exposedHeaders: ['X-Custom-Header'],
          allowCredentials: true,
          maxAge: 86400,
          handlePreflight: true,
        },
      },
    });
  });

  describe('CORS Headers', () => {
    it('should add CORS headers to response for allowed origin', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://api.example.com/users', {
          headers: {
            'Origin': 'https://example.com',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/users',
          target: 'http://backend.com',
          pathPattern: /^\/users$/,
          methods: ['GET'],
          plugins: {
            cors: {
              enabled: true,
            },
          },
        },
      };

      // Execute pre-routing hook
      await CorsPlugin.preRouting(context);

      // Create mock response
      const response = new Response('Test response');

      // Execute post-proxy hook
      const modifiedResponse = await CorsPlugin.postProxy(context, response);

      // Check CORS headers
      expect(modifiedResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(modifiedResponse.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(modifiedResponse.headers.get('Access-Control-Expose-Headers')).toBe('X-Custom-Header');
    });

    it('should handle wildcard origins', async () => {
      // Update plugin config to use wildcard
      await CorsPlugin.initialize({
        plugins: {
          cors: {
            enabled: true,
            origins: ['*'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['X-Custom-Header'],
            allowCredentials: false,
            maxAge: 86400,
            handlePreflight: true,
          },
        },
      });

      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://api.example.com/users', {
          headers: {
            'Origin': 'https://unknown-origin.com',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/users',
          target: 'http://backend.com',
          pathPattern: /^\/users$/,
          methods: ['GET'],
          plugins: {
            cors: {
              enabled: true,
            },
          },
        },
      };

      // Execute pre-routing hook
      await CorsPlugin.preRouting(context);

      // Create mock response
      const response = new Response('Test response');

      // Execute post-proxy hook
      const modifiedResponse = await CorsPlugin.postProxy(context, response);

      // Check CORS headers
      expect(modifiedResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(modifiedResponse.headers.get('Access-Control-Allow-Credentials')).toBe(null);
    });

    it('should not add CORS headers for disallowed origin', async () => {
      // Update plugin config to use specific origins
      await CorsPlugin.initialize({
        plugins: {
          cors: {
            enabled: true,
            origins: ['https://example.com'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['X-Custom-Header'],
            allowCredentials: true,
            maxAge: 86400,
            handlePreflight: true,
          },
        },
      });

      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://api.example.com/users', {
          headers: {
            'Origin': 'https://malicious-site.com',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/users',
          target: 'http://backend.com',
          pathPattern: /^\/users$/,
          methods: ['GET'],
          plugins: {
            cors: {
              enabled: true,
            },
          },
        },
      };

      // Execute pre-routing hook
      await CorsPlugin.preRouting(context);

      // Create mock response
      const response = new Response('Test response');

      // Execute post-proxy hook
      const modifiedResponse = await CorsPlugin.postProxy(context, response);

      // Check CORS headers
      expect(modifiedResponse.headers.get('Access-Control-Allow-Origin')).toBe(null);
    });
  });

  describe('Preflight Requests', () => {
    it('should handle preflight requests', async () => {
      // Create mock preflight request context
      const context: RequestContext = {
        request: new Request('http://api.example.com/users', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/users',
          target: 'http://backend.com',
          pathPattern: /^\/users$/,
          methods: ['OPTIONS', 'POST'],
          plugins: {
            cors: {
              enabled: true,
            },
          },
        },
      };

      // Execute pre-routing hook
      await CorsPlugin.preRouting(context);

      // Check if preflight response was created
      expect(context.metadata.corsPreflightResponse).toBeDefined();

      // Get preflight response
      const preflightResponse = context.metadata.corsPreflightResponse;

      // Check preflight response
      expect(preflightResponse.status).toBe(204);
      expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(preflightResponse.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(preflightResponse.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
      expect(preflightResponse.headers.get('Access-Control-Max-Age')).toBe('86400');
      expect(preflightResponse.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should return preflight response from post-proxy hook', async () => {
      // Create mock preflight request context
      const context: RequestContext = {
        request: new Request('http://api.example.com/users', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/users',
          target: 'http://backend.com',
          pathPattern: /^\/users$/,
          methods: ['OPTIONS', 'POST'],
          plugins: {
            cors: {
              enabled: true,
            },
          },
        },
      };

      // Execute pre-routing hook
      await CorsPlugin.preRouting(context);

      // Create mock response
      const response = new Response('This should be ignored');

      // Execute post-proxy hook
      const finalResponse = await CorsPlugin.postProxy(context, response);

      // Check that the preflight response was returned
      expect(finalResponse.status).toBe(204);
      expect(finalResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });

  describe('Configuration', () => {
    it('should skip CORS when disabled', async () => {
      // Update plugin config to disable CORS
      await CorsPlugin.initialize({
        plugins: {
          cors: {
            enabled: false,
          },
        },
      });

      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://api.example.com/users', {
          headers: {
            'Origin': 'https://example.com',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/users',
          target: 'http://backend.com',
          pathPattern: /^\/users$/,
          methods: ['GET'],
          plugins: {
            cors: {
              enabled: false,
            },
          },
        },
      };

      // Execute pre-routing hook
      await CorsPlugin.preRouting(context);

      // Create mock response
      const response = new Response('Test response');

      // Execute post-proxy hook
      const modifiedResponse = await CorsPlugin.postProxy(context, response);

      // Check that no CORS headers were added
      expect(modifiedResponse.headers.get('Access-Control-Allow-Origin')).toBe(null);
    });

    it('should use route-specific configuration', async () => {
      // Update plugin config with default settings
      await CorsPlugin.initialize({
        plugins: {
          cors: {
            enabled: true,
            origins: ['https://default.com'],
            methods: ['GET'],
            allowedHeaders: ['Content-Type'],
            exposedHeaders: [],
            allowCredentials: false,
            maxAge: 3600,
            handlePreflight: true,
          },
        },
      });

      // Create mock request context with route-specific config
      const context: RequestContext = {
        request: new Request('http://api.example.com/users', {
          headers: {
            'Origin': 'https://custom.com',
          },
        }),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/users',
          target: 'http://backend.com',
          pathPattern: /^\/users$/,
          methods: ['GET'],
          plugins: {
            cors: {
              enabled: true,
              origins: ['https://custom.com'],
              allowCredentials: true,
            },
          },
        },
      };

      // Execute pre-routing hook
      await CorsPlugin.preRouting(context);

      // Create mock response
      const response = new Response('Test response');

      // Execute post-proxy hook
      const modifiedResponse = await CorsPlugin.postProxy(context, response);

      // Check that route-specific config was used
      expect(modifiedResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://custom.com');
      expect(modifiedResponse.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
  });
});
