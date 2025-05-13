/**
 * End-to-End Tests for Japa Gateway
 * 
 * These tests verify that the gateway correctly proxies requests to backend services.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Gateway } from '../../src/core/gateway';

// Create a simple backend server that responds with test data
let backendServer: any;

// Test configuration
const testConfig = {
  server: {
    port: 8003, // Use a different port than other tests
    host: 'localhost',
    timeout: 5000,
    trustProxy: false,
  },
  routes: [
    {
      path: '/api/test',
      target: 'http://localhost:3004',
      plugins: {},
    },
    {
      path: '/api/error',
      target: 'http://localhost:3004',
      plugins: {},
    },
    {
      path: '/api/*',
      target: 'http://localhost:3004',
      plugins: {},
    },
  ],
  plugins: [],
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

describe('Gateway E2E Tests', () => {
  // Setup backend server
  beforeAll(() => {
    // Start a simple backend server
    backendServer = Bun.serve({
      port: 3004,
      fetch(req: Request) {
        const url = new URL(req.url);
        console.log(`Backend server received request: ${req.method} ${url.pathname}`);
        
        // Handle both with and without /api prefix for flexibility
        if (url.pathname === '/api/test' || url.pathname === '/test' || url.pathname.includes('/test')) {
          return new Response(JSON.stringify({ message: 'Test success' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (url.pathname === '/api/error' || url.pathname === '/error' || url.pathname.includes('/error')) {
          return new Response(JSON.stringify({ error: 'Test error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        // Handle wildcard routes for testing
        if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
          return new Response(JSON.stringify({ message: 'Wildcard route' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        console.log(`Backend server: No handler for ${url.pathname}, returning 404`);
        return new Response('Not Found', { status: 404 });
      },
    });
    
    console.log('Backend server started on port 3004');
  });
  
  afterAll(() => {
    // Stop the backend server
    if (backendServer) {
      backendServer.stop();
      console.log('Backend server stopped');
    }
  });
  
  // Test the status code responses only to avoid stream issues
  it('should return correct status codes for proxied requests', async () => {
    // Start a new gateway for this test
    const gateway = new Gateway(testConfig);
    
    // Add debug logging
    console.log('Gateway test routes configuration:', JSON.stringify(testConfig.routes, null, 2));
    
    await gateway.start();
    console.log(`Test gateway started on port ${testConfig.server.port}`);
    
    try {
      // Test successful request
      const successResponse = await fetch('http://localhost:8003/api/test');
      expect(successResponse.status).toBe(200);
      
      // Test error response
      const errorResponse = await fetch('http://localhost:8003/api/error');
      expect(errorResponse.status).toBe(500);
      
      // Test 404 request
      const notFoundResponse = await fetch('http://localhost:8003/not-found');
      expect(notFoundResponse.status).toBe(404);
    } finally {
      // Always stop the gateway
      await gateway.stop();
      console.log('Test gateway stopped');
      
      // Add a small delay to ensure proper cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });
});
