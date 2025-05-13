/**
 * Tests for Composition Engine
 * 
 * These tests verify that the composition engine correctly aggregates responses
 * from multiple backend services.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CompositionEngine } from '../../src/core/composition-engine';
import type { Config, RequestContext, Route, CompositionConfig } from '../../src/types';
import { HttpError } from '../../src/utils/errors';

// Test configuration
const testConfig: Config = {
  server: {
    port: 8001,
    host: 'localhost',
    timeout: 5000,
  },
  routes: [],
  telemetry: {
    enabled: false,
  },
};

describe('CompositionEngine', () => {
  let compositionEngine: CompositionEngine;
  let userServer: any;
  let ordersServer: any;
  let recommendationsServer: any;

  beforeEach(() => {
    compositionEngine = new CompositionEngine(testConfig);

    // Setup mock backend servers
    userServer = Bun.serve({
      port: 3005,
      fetch(req: Request) {
        const url = new URL(req.url);
        
        if (url.pathname.startsWith('/api/users/')) {
          const userId = url.pathname.split('/').pop();
          return new Response(JSON.stringify({
            id: userId,
            name: 'Test User',
            email: 'user@example.com',
            tier: 'premium',
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Not Found', { status: 404 });
      },
    });

    ordersServer = Bun.serve({
      port: 3006,
      fetch(req: Request) {
        const url = new URL(req.url);
        
        if (url.pathname === '/api/orders') {
          const userId = url.searchParams.get('userId');
          const limit = url.searchParams.get('limit') || '5';
          
          const orders = Array.from({ length: parseInt(limit) }, (_, i) => ({
            id: `order-${i + 1}`,
            userId,
            date: new Date().toISOString(),
            total: 100 + i * 10,
            status: 'completed',
            items: [
              { id: `item-${i}-1`, name: 'Product 1', price: 50 },
              { id: `item-${i}-2`, name: 'Product 2', price: 50 + i * 10 },
            ],
          }));
          
          return new Response(JSON.stringify(orders), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Not Found', { status: 404 });
      },
    });

    recommendationsServer = Bun.serve({
      port: 3007,
      fetch(req: Request) {
        const url = new URL(req.url);
        
        if (url.pathname === '/api/recommendations') {
          const userId = url.searchParams.get('userId');
          
          const recommendations = [
            { id: 'rec-1', name: 'Recommended Product 1', score: 0.95 },
            { id: 'rec-2', name: 'Recommended Product 2', score: 0.85 },
            { id: 'rec-3', name: 'Recommended Product 3', score: 0.75 },
          ];
          
          return new Response(JSON.stringify(recommendations), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Not Found', { status: 404 });
      },
    });
  });

  afterEach(() => {
    // Stop the mock backend servers
    userServer.stop();
    ordersServer.stop();
    recommendationsServer.stop();
  });

  it('should compose responses from multiple backends', async () => {
    // Create a composition configuration
    const composition: CompositionConfig = {
      backends: [
        {
          target: 'http://localhost:3005',
          path: '/api/users/123',
          method: 'GET',
          outputKey: 'user',
          required: true,
        },
        {
          target: 'http://localhost:3006',
          path: '/api/orders',
          method: 'GET',
          outputKey: 'orders',
          extractParams: {
            query: {
              'userId': 'id',
              'limit': 'limit',
            },
          },
        },
        {
          target: 'http://localhost:3007',
          path: '/api/recommendations',
          method: 'GET',
          outputKey: 'recommendations',
          required: false,
          extractParams: {
            query: {
              'userId': 'id',
            },
          },
        },
      ],
      mergeStrategy: 'object',
      parallel: true,
      timeout: 5000,
    };

    // Create a request context
    const request = new Request('http://localhost:8001/api/dashboard?id=123&limit=3', {
      method: 'GET',
    });

    const route: Route = {
      path: '/api/dashboard',
      pathPattern: new RegExp('^/api/dashboard$'),
      methods: ['GET'],
      target: 'http://localhost:3000',
      composition,
    };

    const context: RequestContext = {
      request,
      timestamp: new Date(),
      id: 'test-request-id',
      route,
      metadata: {},
    };

    // Compose the response
    const response = await compositionEngine.composeResponse(context);
    
    // Verify the response
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    
    // Check user data
    expect(responseData.user).toBeDefined();
    expect(responseData.user.id).toBe('123');
    expect(responseData.user.name).toBe('Test User');
    
    // Check orders data
    expect(responseData.orders).toBeDefined();
    expect(responseData.orders.length).toBe(3);
    expect(responseData.orders[0].userId).toBe('123');
    
    // Check recommendations data
    expect(responseData.recommendations).toBeDefined();
    expect(responseData.recommendations.length).toBe(3);
  });

  it('should apply response filters to the composed response', async () => {
    // Create a composition configuration with response filters
    const composition: CompositionConfig = {
      backends: [
        {
          target: 'http://localhost:3005',
          path: '/api/users/123',
          method: 'GET',
          outputKey: 'user',
          required: true,
          filter: {
            whitelist: ['id', 'name'], // Only include id and name
          },
        },
        {
          target: 'http://localhost:3006',
          path: '/api/orders',
          method: 'GET',
          outputKey: 'orders',
          extractParams: {
            query: {
              'userId': 'id',
            },
          },
          filter: {
            blacklist: ['items'], // Exclude items
          },
        },
      ],
      mergeStrategy: 'object',
      parallel: true,
      timeout: 5000,
      responseFilter: {
        removeNulls: true,
        removeEmptyArrays: true,
      },
    };

    // Create a request context
    const request = new Request('http://localhost:8001/api/dashboard?id=123', {
      method: 'GET',
    });

    const route: Route = {
      path: '/api/dashboard',
      pathPattern: new RegExp('^/api/dashboard$'),
      methods: ['GET'],
      target: 'http://localhost:3000',
      composition,
    };

    const context: RequestContext = {
      request,
      timestamp: new Date(),
      id: 'test-request-id',
      route,
      metadata: {},
    };

    // Compose the response
    const response = await compositionEngine.composeResponse(context);
    
    // Verify the response
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    
    // Check user data has only id and name
    expect(responseData.user).toBeDefined();
    expect(responseData.user.id).toBe('123');
    expect(responseData.user.name).toBe('Test User');
    expect(responseData.user.email).toBeUndefined();
    expect(responseData.user.tier).toBeUndefined();
    
    // Check orders data doesn't have items
    expect(responseData.orders).toBeDefined();
    expect(responseData.orders.length).toBeGreaterThan(0);
    expect(responseData.orders[0].id).toBeDefined();
    expect(responseData.orders[0].items).toBeUndefined();
  });

  it('should handle errors from required backends', async () => {
    // Create a composition configuration with a non-existent required backend
    const composition: CompositionConfig = {
      backends: [
        {
          target: 'http://localhost:3005',
          path: '/api/non-existent',
          method: 'GET',
          outputKey: 'data',
          required: true,
        },
      ],
      mergeStrategy: 'object',
      parallel: true,
      timeout: 5000,
    };

    // Create a request context
    const request = new Request('http://localhost:8001/api/dashboard', {
      method: 'GET',
    });

    const route: Route = {
      path: '/api/dashboard',
      pathPattern: new RegExp('^/api/dashboard$'),
      methods: ['GET'],
      target: 'http://localhost:3000',
      composition,
    };

    const context: RequestContext = {
      request,
      timestamp: new Date(),
      id: 'test-request-id',
      route,
      metadata: {},
    };

    // Expect the composition to fail
    await expect(compositionEngine.composeResponse(context)).rejects.toThrow(HttpError);
  });

  it('should continue if non-required backends fail', async () => {
    // Create a composition configuration with a non-existent non-required backend
    const composition: CompositionConfig = {
      backends: [
        {
          target: 'http://localhost:3005',
          path: '/api/users/123',
          method: 'GET',
          outputKey: 'user',
          required: true,
        },
        {
          target: 'http://localhost:9998',
          path: '/api/non-existent',
          method: 'GET',
          outputKey: 'missing',
          required: false,
        },
      ],
      mergeStrategy: 'object',
      parallel: true,
      timeout: 5000,
    };

    // Create a request context
    const request = new Request('http://localhost:8001/api/dashboard?id=123', {
      method: 'GET',
    });

    const route: Route = {
      path: '/api/dashboard',
      pathPattern: new RegExp('^/api/dashboard$'),
      methods: ['GET'],
      target: 'http://localhost:3000',
      composition,
    };

    const context: RequestContext = {
      request,
      timestamp: new Date(),
      id: 'test-request-id',
      route,
      metadata: {},
    };

    // Compose the response
    const response = await compositionEngine.composeResponse(context);
    
    // Verify the response
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    
    // Check user data is present
    expect(responseData.user).toBeDefined();
    expect(responseData.user.id).toBe('123');
    
    // Check missing data is null
    expect(responseData.missing).toBeNull();
  });

  it('should support different merge strategies', async () => {
    // Test array merge strategy
    const arrayComposition: CompositionConfig = {
      backends: [
        {
          target: 'http://localhost:3005',
          path: '/api/users/123',
          method: 'GET',
          outputKey: 'user',
        },
        {
          target: 'http://localhost:3006',
          path: '/api/orders',
          method: 'GET',
          outputKey: 'orders',
          extractParams: {
            query: {
              'userId': 'id',
              'limit': 'limit',
            },
          },
        },
      ],
      mergeStrategy: 'array',
      parallel: true,
      timeout: 5000,
    };

    // Create a request context
    const request = new Request('http://localhost:8001/api/dashboard?id=123&limit=2', {
      method: 'GET',
    });

    const route: Route = {
      path: '/api/dashboard',
      pathPattern: new RegExp('^/api/dashboard$'),
      methods: ['GET'],
      target: 'http://localhost:3000',
      composition: arrayComposition,
    };

    const context: RequestContext = {
      request,
      timestamp: new Date(),
      id: 'test-request-id',
      route,
      metadata: {},
    };

    // Compose the response
    const response = await compositionEngine.composeResponse(context);
    
    // Verify the response
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    
    // Check the response is an array
    expect(Array.isArray(responseData)).toBe(true);
    expect(responseData.length).toBe(2);
  });
});
