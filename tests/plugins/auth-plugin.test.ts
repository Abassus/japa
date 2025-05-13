/**
 * Authentication Plugin Tests
 * 
 * Tests for the authentication plugin functionality.
 */

import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { AuthMethod } from '../../src/plugins/auth/auth-plugin';
import type { RequestContext } from '../../src/types';

// Create mocks
const mockLogger = {
  info: mock(() => {}),
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {})
};

const mockVerifyJwt = mock(async (token: string, secret: string) => {
  if (token === 'valid-token' && secret === 'test-secret') {
    return { id: '123', name: 'Test User', scope: ['read', 'write'] };
  }
  throw new Error('Invalid token');
});

const mockVerifyApiKey = mock(async (apiKey: string, validKeys: string[]) => {
  if (apiKey === 'valid-api-key' && validKeys.includes('valid-api-key')) {
    return { id: '456', name: 'API User', scope: ['read'] };
  }
  return undefined;
});

// Mock modules
mock.module('../../src/plugins/observability/logger', () => ({
  logger: mockLogger
}));

mock.module('../../src/plugins/auth/jwt-provider', () => ({
  verifyJwt: mockVerifyJwt
}));

mock.module('../../src/plugins/auth/api-key-provider', () => ({
  verifyApiKey: mockVerifyApiKey
}));

// Import the auth plugin after mocking dependencies
import AuthPlugin from '../../src/plugins/auth/auth-plugin';

describe('Authentication Plugin', () => {
  beforeAll(async () => {
    // Initialize the plugin with test configuration
    await AuthPlugin?.initialize({
      plugins: {
        auth: {
          method: AuthMethod.NONE,
          jwt: {
            secret: 'test-secret',
          },
          apiKey: {
            keys: ['valid-api-key'],
          },
        },
      },
    });
  });

  describe('JWT Authentication', () => {
    it('should authenticate with valid JWT token', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            Authorization: 'Bearer valid-token',
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
            auth: {
              method: AuthMethod.JWT,
            },
          },
        },
      };

      // Execute plugin
      await AuthPlugin.preProxy(context);

      // Check that user info was added to context
      expect(context.metadata.user).toBeDefined();
      expect(context.metadata.user.id).toBe('123');
      expect(context.metadata.scope).toContain('read');
      expect(context.metadata.scope).toContain('write');
    });

    it('should reject with invalid JWT token', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            Authorization: 'Bearer invalid-token',
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
            auth: {
              method: AuthMethod.JWT,
            },
          },
        },
      };

      // Execute plugin and expect error
      await expect(AuthPlugin.preProxy(context)).rejects.toThrow();
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate with valid API key', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-API-Key': 'valid-api-key',
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
            auth: {
              method: AuthMethod.API_KEY,
            },
          },
        },
      };

      // Execute plugin
      await AuthPlugin.preProxy(context);

      // Check that user info was added to context
      expect(context.metadata.user).toBeDefined();
      expect(context.metadata.user.id).toBe('456');
      expect(context.metadata.scope).toContain('read');
    });

    it('should reject with invalid API key', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api', {
          headers: {
            'X-API-Key': 'invalid-api-key',
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
            auth: {
              method: AuthMethod.API_KEY,
            },
          },
        },
      };

      // Execute plugin and expect error
      await expect(AuthPlugin.preProxy(context)).rejects.toThrow();
    });
  });

  describe('No Authentication', () => {
    it('should skip authentication when method is NONE', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {
            auth: {
              method: AuthMethod.NONE,
            },
          },
        },
      };

      // Execute plugin
      await AuthPlugin.preProxy(context);

      // Check that no user info was added
      expect(context.metadata.user).toBeUndefined();
    });

    it('should skip authentication when no auth config is present', async () => {
      // Create mock request context
      const context: RequestContext = {
        request: new Request('http://example.com/api'),
        timestamp: new Date(),
        id: '123',
        metadata: {},
        route: {
          path: '/api',
          target: 'http://backend.com',
          pathPattern: /^\/api$/,
          methods: ['GET'],
          plugins: {},
        },
      };

      // Execute plugin
      await AuthPlugin.preProxy(context);

      // Check that no user info was added
      expect(context.metadata.user).toBeUndefined();
    });
  });
});
