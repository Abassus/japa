/**
 * Advanced Routing Configuration Example
 * 
 * This example demonstrates how to use the advanced routing features
 * of Japa Gateway, including rule-based routing and backend composition.
 */

import type { Config } from '../src/types';

const config: Config = {
  server: {
    port: 3000,
    host: 'localhost',
    timeout: 30000,
  },
  
  plugins: [
    {
      module: '../src/plugins/security/cors-plugin',
      options: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['X-Request-ID'],
        maxAge: 86400,
      },
    },
    {
      module: '../src/plugins/observability/logging-plugin',
      options: {
        level: 'info',
        format: 'json',
      },
    },
    {
      module: '../src/plugins/security/rate-limit-plugin',
      options: {
        windowMs: 60000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
      },
    },
  ],
  
  routes: [
    // Basic route with rule-based routing
    {
      path: '/api/products',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      target: 'http://default-product-service:8080',
      
      // Rule-based routing based on conditions
      rules: [
        {
          // Route premium users to a different backend
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
          // Route beta feature requests to a different backend
          conditions: {
            type: 'query',
            name: 'beta',
            operator: 'exists',
          },
          target: 'http://beta-product-service:8080',
          priority: 90,
        },
        {
          // Route based on complex conditions
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
                type: 'time',
                value: '08:00-17:00', // Business hours
              },
            ],
          },
          target: 'http://eu-product-service:8080',
          priority: 80,
        },
      ],
      
      // Path rewriting
      pathRewrite: {
        pattern: '/api/products',
        replacement: '/v2/products',
      },
      
      // Plugin-specific configuration for this route
      plugins: {
        rateLimit: {
          windowMs: 60000,
          max: 200, // Higher limit for this route
        },
        cors: {
          allowOrigins: ['https://trusted-site.com'],
        },
      },
    },
    
    // Route with backend composition
    {
      path: '/api/dashboard',
      methods: ['GET'],
      target: 'http://dashboard-service:8080',
      
      // Composition configuration
      composition: {
        // Define backends to call
        backends: [
          {
            target: 'http://user-service:8080',
            path: '/api/users/{id}',
            method: 'GET',
            outputKey: 'user',
            required: true,
            extractParams: {
              path: {
                id: 'id', // Extract 'id' from original request path
              },
              headers: {
                'Authorization': 'Authorization', // Pass through Authorization header
              },
            },
          },
          {
            target: 'http://orders-service:8080',
            path: '/api/orders',
            method: 'GET',
            outputKey: 'orders',
            extractParams: {
              query: {
                'userId': 'id', // Use the id from the original request as userId
                'limit': 'limit', // Pass through limit query param
              },
            },
            filter: {
              whitelist: ['id', 'date', 'total', 'status'],
              removeNulls: true,
            },
          },
          {
            target: 'http://recommendations-service:8080',
            path: '/api/recommendations',
            method: 'GET',
            outputKey: 'recommendations',
            required: false, // Non-critical service
            timeout: 1000, // Short timeout for recommendations
            extractParams: {
              query: {
                'userId': 'id',
              },
            },
          },
        ],
        
        // Merge strategy
        mergeStrategy: 'object',
        
        // Parallel execution
        parallel: true,
        
        // Overall timeout
        timeout: 5000,
        
        // Response filtering
        responseFilter: {
          removeNulls: true,
          removeEmptyArrays: true,
        },
      },
    },
    
    // Route with content-based routing
    {
      path: '/api/payments',
      methods: ['POST'],
      target: 'http://payment-processor:8080',
      
      rules: [
        {
          // Route credit card payments
          conditions: {
            type: 'body',
            name: 'paymentMethod',
            operator: 'equals',
            value: 'credit_card',
          },
          target: 'http://credit-card-processor:8080',
          priority: 100,
        },
        {
          // Route PayPal payments
          conditions: {
            type: 'body',
            name: 'paymentMethod',
            operator: 'equals',
            value: 'paypal',
          },
          target: 'http://paypal-processor:8080',
          priority: 100,
        },
      ],
    },
    
    // Route with health check
    {
      path: '/api/inventory',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      target: 'http://inventory-service:8080',
      
      // Health check configuration
      healthCheck: {
        path: '/health',
        interval: 30,
        timeout: 5,
        unhealthyThreshold: 3,
        healthyThreshold: 2,
        expectedStatus: 200,
        method: 'GET',
      },
    },
  ],
  
  telemetry: {
    enabled: true,
    provider: 'prometheus',
    endpoint: '/metrics',
  },
};

export default config;
