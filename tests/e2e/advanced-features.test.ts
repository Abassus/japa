/**
 * End-to-End Tests for Advanced Features
 * 
 * These tests verify that the advanced routing and composition features
 * work correctly in a real-world scenario.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Gateway } from '../../src/core/gateway';

// Backend servers
let userServer: any;
let productServer: any;
let premiumProductServer: any;

// Test configuration
const testConfig = {
  server: {
    port: 8002, // Use a different port than other tests
    host: 'localhost',
    timeout: 5000,
    trustProxy: false,
  },
  plugins: [],
  routes: [
    // Route with rule-based routing
    {
      path: '/api/products',
      methods: ['GET'],
      target: 'http://localhost:3001', // Default product server
      plugins: {},
      rules: [
        {
          conditions: {
            type: 'header',
            name: 'x-user-tier',
            operator: 'equals',
            value: 'premium',
          },
          target: 'http://localhost:3002', // Premium product server
          priority: 100,
        },
      ],
    },
    // Route with backend composition
    {
      path: '/api/dashboard',
      methods: ['GET'],
      target: 'http://localhost:3001',
      plugins: {},
      composition: {
        backends: [
          {
            target: 'http://localhost:3000',
            path: '/users/123', // Use a fixed ID for simplicity in testing
            method: 'GET',
            outputKey: 'user',
            required: true,
          },
          {
            target: 'http://localhost:3001',
            path: '/products',
            method: 'GET',
            outputKey: 'products',
            required: true,
          },
        ],
        mergeStrategy: 'object',
        parallel: true,
        timeout: 5000,
      },
    },
  ],
  telemetry: {
    enabled: true,
    metrics: false,
    tracing: false,
    logging: {
      level: "debug" as "info" | "debug" | "warn" | "error",
      format: "json" as "json" | "pretty",
    },
  },
};

describe('Advanced Features E2E Tests', () => {
  // Setup backend servers
  beforeAll(() => {
    // User server
    userServer = Bun.serve({
      port: 3000,
      fetch(req: Request) {
        const url = new URL(req.url);
        console.log(`User server received request: ${req.method} ${url.pathname}`);
        console.log(`Full user server request URL: ${req.url}`);
        
        // Handle all user-related paths - be very flexible with paths
        if (url.pathname.includes('users')) {
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
        
        console.log(`User server: No handler for ${url.pathname}, returning 404`);
        return new Response('Not Found', { status: 404 });
      },
    });
    
    // Regular product server
    productServer = Bun.serve({
      port: 3001,
      fetch(req: Request) {
        const url = new URL(req.url);
        console.log(`[productServer:3001 ADVANCED_FEATURES_MARKER] ENTERED. Path: ${url.pathname}, Full URL: ${req.url}`);
        
        if (url.pathname.includes('products')) {
          console.log(`[productServer:3001 ADVANCED_FEATURES_MARKER] Matched 'products' in path: ${url.pathname}`);
          return new Response(JSON.stringify([
            { id: 'p1', name: 'Regular Product 1', price: 10 },
            { id: 'p2', name: 'Regular Product 2', price: 20 }
          ]), { 
            headers: { 
              'Content-Type': 'application/json',
              'X-Source-Server': 'Advanced-Features-Product-Server' 
            }, 
            status: 200 
          });
        }
        
        console.log(`[productServer:3001 ADVANCED_FEATURES_MARKER] No 'products' match for path: ${url.pathname}. Returning 404.`);
        return new Response('Not Found from productServer - Advanced Features Test', { 
          status: 404,
          headers: { 'X-Source-Server': 'Advanced-Features-Product-Server-404' } 
        });
      },
      error(error: Error) { 
        console.error(`[productServer:3001 ADVANCED_FEATURES_MARKER] Bun.serve ERROR: ${error.message}`, error);
        return new Response("Internal Server Error in productServer - Advanced Features Test", { 
          status: 500,
          headers: { 'X-Source-Server': 'Advanced-Features-Product-Server-Error' } 
        });
      }
    });
    if (productServer) {
      console.log(`[AdvancedFeaturesTestSetup] productServer instance CREATED for target port 3001. Actual listening port: ${productServer.port}, hostname: ${productServer.hostname}`);
    } else {
      console.error('[AdvancedFeaturesTestSetup] FAILED to create productServer instance for port 3001.');
    }

    // Premium product server
    premiumProductServer = Bun.serve({
      port: 3002,
      fetch(req: Request) {
        const url = new URL(req.url);
        console.log(`Premium product server received request: ${req.method} ${url.pathname}`);
        console.log(`Full premium product server request URL: ${req.url}`);
        
        // Handle all product-related paths - be very flexible with paths
        if (url.pathname.includes('products')) {
          return new Response(JSON.stringify([
            { id: 'p1', name: 'Premium Product 1', price: 100 },
            { id: 'p2', name: 'Premium Product 2', price: 200 },
            { id: 'p3', name: 'Premium Product 3', price: 300 },
          ]), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        console.log(`Premium product server: No handler for ${url.pathname}, returning 404`);
        return new Response('Not Found', { status: 404 });
      },
    });
    
    console.log('Backend servers started');
  });
  
  afterAll(() => {
    // Stop the backend servers
    userServer.stop();
    productServer.stop();
    premiumProductServer.stop();
    console.log('Backend servers stopped');
  });
  
  it('should route to different backends based on headers', async () => {
    // Start a new gateway for this test
    const gateway = new Gateway(testConfig);
    
    // Add debug logging
    console.log('Routes configuration:', JSON.stringify(testConfig.routes, null, 2));
    
    await gateway.start();
    console.log(`Test gateway started on port ${testConfig.server.port}`);
    
    try {
      // Test regular product request
      const regularResponse = await fetch('http://localhost:8002/api/products', {
        method: 'GET',
      });
      
      // Log details of the regularResponse
      console.log(`[TestLog] Regular response status: ${regularResponse.status}`);
      const responseBodyText = await regularResponse.text();
      console.log(`[TestLog] Regular response body: ${responseBodyText}`);
      console.log('[TestLog] Regular response headers:');
      regularResponse.headers.forEach((value, key) => {
        console.log(`[TestLog]   ${key}: ${value}`);
      });

      // Assert the unique header from the correct server
      expect(regularResponse.headers.get('X-Source-Server')).toBe('Advanced-Features-Product-Server');
      expect(regularResponse.status).toBe(200);
      // Re-parse body if needed for further assertions, ensuring it's the unique one
      const regularData = JSON.parse(responseBodyText); 
      expect(regularData.length).toBe(2); // Expecting 2 products
      expect(regularData[0].name).toBe('Regular Product 1');
      
      // Test premium product request
      const premiumResponse = await fetch('http://localhost:8002/api/products', {
        method: 'GET',
        headers: {
          'x-user-tier': 'premium',
        },
      });
      
      expect(premiumResponse.status).toBe(200);
      const premiumData = await premiumResponse.json();
      expect(premiumData.length).toBe(3);
      expect(premiumData[0].name).toContain('Premium');
    } finally {
      // Always stop the gateway
      await gateway.stop();
      console.log('Test gateway stopped');
      
      // Add a small delay to ensure proper cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });
  
  it('should compose responses from multiple backends', async () => {
    // Start a new gateway for this test
    const gateway = new Gateway(testConfig);
    await gateway.start();
    console.log(`Test gateway started on port ${testConfig.server.port}`);
    
    try {
      // Test dashboard request
      const response = await fetch('http://localhost:8002/api/dashboard?id=123', {
        method: 'GET',
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Verify user data
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('123');
      expect(data.user.name).toBe('Test User');
      
      // Verify products data
      expect(data.products).toBeDefined();
      expect(data.products.length).toBe(2);
      expect(data.products[0].name).toContain('Regular');
    } finally {
      // Always stop the gateway
      await gateway.stop();
      console.log('Test gateway stopped');
      
      // Add a small delay to ensure proper cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });
});
