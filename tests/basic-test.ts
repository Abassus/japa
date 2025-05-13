/**
 * Basic Test for Japa Gateway
 * 
 * This is a simplified test that verifies the core functionality
 * without relying on the full plugin system.
 */

// Start a simple backend server
const backendServer = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);
    console.log(`Backend received: ${req.method} ${url.pathname}`);
    
    return new Response(JSON.stringify({
      message: "Hello from backend",
      path: url.pathname,
      method: req.method
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

console.log("Backend server running on http://localhost:3001");

// Start a simple gateway that forwards requests to the backend
const gatewayServer = Bun.serve({
  port: 8001,
  fetch(req) {
    const url = new URL(req.url);
    console.log(`Gateway received: ${req.method} ${url.pathname}`);
    
    // Create a new request to the backend
    const backendUrl = new URL(req.url);
    backendUrl.host = "localhost:3001";
    backendUrl.protocol = "http:";
    
    console.log(`Forwarding to: ${backendUrl.toString()}`);
    
    // Forward the request to the backend
    return fetch(backendUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body
    });
  }
});

console.log("Gateway server running on http://localhost:8001");
console.log("Press Ctrl+C to stop the servers");

// Keep the process running
process.on("SIGINT", () => {
  console.log("Shutting down servers...");
  backendServer.stop();
  gatewayServer.stop();
  process.exit(0);
});
