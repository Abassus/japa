/**
 * Tests for Advanced Router
 * 
 * These tests verify that the advanced router correctly handles rule-based routing.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AdvancedRouter } from '../../src/core/advanced-router';
import type { Config, Route, RouteConfig, RoutingRule } from '../../src/types';

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

describe('AdvancedRouter', () => {
  let router: AdvancedRouter;

  beforeEach(() => {
    router = new AdvancedRouter(testConfig);
  });

  it('should find a basic route without rules', () => {
    // Setup a basic route
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://product-service:8080',
      },
    ];

    router.loadRoutes(routes);

    // Create a test request
    const request = new Request('http://localhost:8001/api/products', {
      method: 'GET',
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the route was found
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://product-service:8080');
  });

  it('should match a route with a header condition', () => {
    // Setup a route with rules
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        rules: [
          {
            conditions: {
              type: 'header',
              name: 'x-user-tier',
              operator: 'equals',
              value: 'premium',
            },
            target: 'http://premium-product-service:8080',
            priority: 100,
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request with the premium header
    const request = new Request('http://localhost:8001/api/products', {
      method: 'GET',
      headers: {
        'x-user-tier': 'premium',
      },
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the premium route was selected
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://premium-product-service:8080');
  });

  it('should match a route with a query parameter condition', () => {
    // Setup a route with rules
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        rules: [
          {
            conditions: {
              type: 'query',
              name: 'beta',
              operator: 'exists',
            },
            target: 'http://beta-product-service:8080',
            priority: 90,
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request with the beta query parameter
    const request = new Request('http://localhost:8001/api/products?beta=true', {
      method: 'GET',
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the beta route was selected
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://beta-product-service:8080');
  });

  it('should match a route with a path condition', () => {
    // Setup a route with rules
    const routes: RouteConfig[] = [
      {
        path: '/api/products/*',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        rules: [
          {
            conditions: {
              type: 'path',
              operator: 'matches',
              pattern: '.*\\/premium\\/.*',
            },
            target: 'http://premium-product-service:8080',
            priority: 100,
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request with a premium path
    const request = new Request('http://localhost:8001/api/products/premium/123', {
      method: 'GET',
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the premium route was selected
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://premium-product-service:8080');
  });

  it('should match a route with a complex condition group (AND)', () => {
    // Setup a route with rules
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        rules: [
          {
            conditions: {
              operator: 'and',
              conditions: [
                {
                  type: 'header',
                  name: 'x-region',
                  operator: 'equals',
                  value: 'eu',
                },
                {
                  type: 'header',
                  name: 'x-user-tier',
                  operator: 'equals',
                  value: 'premium',
                },
              ],
            },
            target: 'http://eu-premium-product-service:8080',
            priority: 100,
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request with both headers
    const request = new Request('http://localhost:8001/api/products', {
      method: 'GET',
      headers: {
        'x-region': 'eu',
        'x-user-tier': 'premium',
      },
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the EU premium route was selected
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://eu-premium-product-service:8080');
  });

  it('should match a route with a complex condition group (OR)', () => {
    // Setup a route with rules
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        rules: [
          {
            conditions: {
              operator: 'or',
              conditions: [
                {
                  type: 'header',
                  name: 'x-user-tier',
                  operator: 'equals',
                  value: 'premium',
                },
                {
                  type: 'query',
                  name: 'premium',
                  operator: 'exists',
                },
              ],
            },
            target: 'http://premium-product-service:8080',
            priority: 100,
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request with the query parameter but not the header
    const request = new Request('http://localhost:8001/api/products?premium=true', {
      method: 'GET',
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the premium route was selected
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://premium-product-service:8080');
  });

  it('should select the rule with the highest priority', () => {
    // Setup a route with multiple rules
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        rules: [
          {
            conditions: {
              type: 'header',
              name: 'x-user-tier',
              operator: 'equals',
              value: 'premium',
            },
            target: 'http://premium-product-service:8080',
            priority: 100,
          },
          {
            conditions: {
              type: 'header',
              name: 'x-user-tier',
              operator: 'equals',
              value: 'premium',
            },
            target: 'http://another-premium-service:8080',
            priority: 200, // Higher priority
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request with the premium header
    const request = new Request('http://localhost:8001/api/products', {
      method: 'GET',
      headers: {
        'x-user-tier': 'premium',
      },
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the higher priority route was selected
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://another-premium-service:8080');
  });

  it('should fall back to the default target if no rules match', () => {
    // Setup a route with rules
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        rules: [
          {
            conditions: {
              type: 'header',
              name: 'x-user-tier',
              operator: 'equals',
              value: 'premium',
            },
            target: 'http://premium-product-service:8080',
            priority: 100,
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request without the premium header
    const request = new Request('http://localhost:8001/api/products', {
      method: 'GET',
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the default route was selected
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://default-product-service:8080');
  });

  it('should merge plugins from the rule and the route', () => {
    // Setup a route with rules and plugins
    const routes: RouteConfig[] = [
      {
        path: '/api/products',
        methods: ['GET'],
        target: 'http://default-product-service:8080',
        plugins: {
          cors: {
            allowOrigins: ['*'],
          },
        },
        rules: [
          {
            conditions: {
              type: 'header',
              name: 'x-user-tier',
              operator: 'equals',
              value: 'premium',
            },
            target: 'http://premium-product-service:8080',
            plugins: {
              rateLimit: {
                max: 200,
              },
            },
            priority: 100,
          },
        ],
      },
    ];

    router.loadRoutes(routes);

    // Create a test request with the premium header
    const request = new Request('http://localhost:8001/api/products', {
      method: 'GET',
      headers: {
        'x-user-tier': 'premium',
      },
    });

    // Find the route
    const route = router.findRoute(request);

    // Verify the plugins were merged
    expect(route).not.toBeUndefined();
    expect(route?.target).toBe('http://premium-product-service:8080');
    expect(route?.plugins).toEqual({
      cors: {
        allowOrigins: ['*'],
      },
      rateLimit: {
        max: 200,
      },
    });
  });
});
