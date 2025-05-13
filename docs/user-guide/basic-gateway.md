# Basic Gateway Setup

This guide will walk you through setting up a basic Japa Gateway instance to route traffic to your backend services.

## Prerequisites

- Japa Gateway [installed](../getting-started/installation.md)
- One or more backend services to route traffic to

## Basic Configuration

Let's start with a simple configuration that routes traffic to a single backend service.

### Step 1: Create a Configuration File

Create a file named `config.yaml` in your project directory:

```yaml
server:
  port: 8000
  host: "0.0.0.0"
  timeout: 30000

routes:
  - path: "/*"
    target: "http://my-backend-service:3000"

plugins:
  # No plugins enabled yet

telemetry:
  enabled: true
  logging:
    level: "info"
    format: "json"
```

This configuration:
- Sets up the gateway to listen on port 8000
- Routes all traffic (`/*`) to a backend service at `http://my-backend-service:3000`
- Enables basic telemetry with JSON-formatted logs

### Step 2: Start the Gateway

Start the gateway with:

```bash
bun run japa-gateway --config ./config.yaml
```

That's it! Your gateway is now running and routing traffic to your backend service.

## Multiple Services Example

Let's expand our configuration to route traffic to multiple backend services based on the path:

```yaml
server:
  port: 8000
  host: "0.0.0.0"
  timeout: 30000

routes:
  - path: "/api/users/*"
    target: "http://user-service:3000"
  
  - path: "/api/products/*"
    target: "http://product-service:3001"
  
  - path: "/api/orders/*"
    target: "http://order-service:3002"

plugins:
  # No plugins enabled yet

telemetry:
  enabled: true
  logging:
    level: "info"
    format: "json"
```

This configuration routes traffic to different backend services based on the path prefix.

## Path Parameters

Japa Gateway supports path parameters that can be extracted and forwarded to your backend services:

```yaml
routes:
  - path: "/api/users/:userId"
    target: "http://user-service:3000/users/:userId"
  
  - path: "/api/products/:category/:productId"
    target: "http://product-service:3001/products/:category/:productId"
```

In this example:
- A request to `/api/users/123` will be forwarded to `http://user-service:3000/users/123`
- A request to `/api/products/electronics/456` will be forwarded to `http://product-service:3001/products/electronics/456`

## Method-Based Routing

You can also route based on HTTP methods:

```yaml
routes:
  - path: "/api/products"
    methods: ["GET"]
    target: "http://product-read-service:3001"
  
  - path: "/api/products"
    methods: ["POST", "PUT", "DELETE"]
    target: "http://product-write-service:3002"
```

This configuration routes:
- GET requests to a read-optimized service
- POST, PUT, and DELETE requests to a write-optimized service

## Health Checks

It's important to set up health checks for your gateway:

```yaml
server:
  port: 8000
  host: "0.0.0.0"
  timeout: 30000
  healthCheck:
    enabled: true
    path: "/health"
    interval: 30000  # Check every 30 seconds
```

This adds a `/health` endpoint that returns the gateway's health status.

## Configuring Timeouts

Configure timeouts to prevent long-running requests from affecting your gateway:

```yaml
server:
  port: 8000
  host: "0.0.0.0"
  timeout: 30000  # Global timeout for all requests (30 seconds)

routes:
  - path: "/api/users/*"
    target: "http://user-service:3000"
    timeout: 5000  # Route-specific timeout (5 seconds)
  
  - path: "/api/reports/*"
    target: "http://report-service:3001"
    timeout: 60000  # Longer timeout for report generation (60 seconds)
```

## Using Environment Variables

For flexibility across environments, use environment variables in your configuration:

```yaml
server:
  port: ${PORT:-8000}
  host: ${HOST:-0.0.0.0}
  timeout: ${TIMEOUT:-30000}

routes:
  - path: "/api/users/*"
    target: "${USER_SERVICE_URL:-http://user-service:3000}"
  
  - path: "/api/products/*"
    target: "${PRODUCT_SERVICE_URL:-http://product-service:3001}"
```

This allows you to override settings with environment variables, with fallback values if the variables aren't set.

## Basic Logging Configuration

Configure logging to suit your environment:

```yaml
telemetry:
  enabled: true
  logging:
    level: "${LOG_LEVEL:-info}"  # debug, info, warn, error
    format: "${LOG_FORMAT:-json}"  # json or pretty
```

## Next Steps

Now that you have a basic gateway setup, you can:

- Add [authentication](authentication.md) to secure your APIs
- Implement [advanced routing](advanced-routing.md) strategies
- Configure [traffic management](traffic-management.md) with rate limiting and circuit breaking
- Set up [monitoring and observability](monitoring.md) for your gateway

For a complete configuration reference, see the [Configuration Schema](../api-reference/configuration-schema.md).
