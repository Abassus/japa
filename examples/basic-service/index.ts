/**
 * Basic Example Service
 * 
 * A simple service to demonstrate the Japa Gateway.
 */

const port = parseInt(process.env.PORT || '3000');

// Create a simple HTTP server
const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    console.log(`[Example Service] ${req.method} ${path}`);
    
    // Handle different routes
    switch (path) {
      case '/':
        return new Response(JSON.stringify({
          message: 'Example service is running',
          version: '1.0.0',
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      
      case '/users':
        if (req.method === 'GET') {
          return new Response(JSON.stringify({
            users: [
              { id: 1, name: 'Alice', role: 'admin' },
              { id: 2, name: 'Bob', role: 'user' },
              { id: 3, name: 'Charlie', role: 'user' },
            ],
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (req.method === 'POST') {
          return new Response(JSON.stringify({
            message: 'User created successfully',
            id: 4,
          }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Method not allowed', { status: 405 });
      
      case '/slow':
        // Simulate a slow response
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(new Response(JSON.stringify({
              message: 'This was a slow response',
              delay: '2 seconds',
            }), {
              headers: { 'Content-Type': 'application/json' },
            }));
          }, 2000);
        });
      
      case '/error':
        // Simulate a server error
        return new Response(JSON.stringify({
          error: 'Internal Server Error',
          message: 'This is a simulated error',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      
      default:
        return new Response('Not Found', { status: 404 });
    }
  },
});

console.log(`Example service running at http://localhost:${port}`);
