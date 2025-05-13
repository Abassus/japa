# Japa Gateway Documentation

Welcome to the Japa Gateway documentation. This guide will help you understand how to install, configure, and use Japa Gateway in your microservices architecture.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Server Configuration](#server-configuration)
  - [Routes Configuration](#routes-configuration)
  - [Plugin Configuration](#plugin-configuration)
  - [Telemetry Configuration](#telemetry-configuration)
- [Features](#features)
  - [Routing](#routing)
  - [Authentication](#authentication)
  - [Rate Limiting](#rate-limiting)
  - [Circuit Breaking](#circuit-breaking)
  - [CORS](#cors)
  - [Observability](#observability)
- [Plugins](#plugins)
  - [Built-in Plugins](#built-in-plugins)
  - [Creating Custom Plugins](#creating-custom-plugins)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Introduction

Japa Gateway is a cloud-native API Gateway built with Bun. It's designed to be fast, extensible, and feature-rich, providing all the capabilities needed for modern microservices architectures.

Key features include:
- High-performance request routing and proxying
- Robust authentication and authorization
- Rate limiting and throttling
- Circuit breaking for resilience
- Comprehensive observability with logging, metrics, and tracing
- Extensible plugin system

## Installation

To install Japa Gateway, you need to have [Bun](https://bun.sh) installed (version 1.0.0 or higher).

```bash
# Clone the repository
git clone https://github.com/username/japa-gateway.git
cd japa-gateway

# Install dependencies
bun install

# Build the gateway
bun run build
```

## Configuration

Japa Gateway is configured using YAML or JSON files. By default, it looks for a `config.yaml` file in the `config` directory, but you can specify a different path using the `CONFIG_PATH` environment variable.

### Server Configuration

```yaml
server:
  port: 8000              # Port to listen on
  host: 0.0.0.0           # Host to bind to
  timeout: 30000          # Request timeout in milliseconds
  trustProxy: true        # Whether to trust X-Forwarded-* headers
```

### Routes Configuration

Routes define how incoming requests are mapped to backend services.

```yaml
routes:
  - path: "/api/users"                # Route path pattern
    methods: ["GET", "POST"]          # HTTP methods to match
    target: "http://user-service:3000" # Target service URL
    plugins:                          # Route-specific plugin configs
      auth:
        method: "jwt"
        jwt:
          secret: "${JWT_SECRET}"
      rateLimit:
        limit: 100
        window: 60
```

### Plugin Configuration

Global plugin configurations apply to all routes unless overridden at the route level.

```yaml
plugins:
  auth:
    method: "none"  # Default: no authentication
  
  rateLimit:
    enabled: true
    algorithm: "fixed-window"
    limit: 1000
    window: 60
```

### Telemetry Configuration

Configure observability features:

```yaml
telemetry:
  enabled: true
  metrics: true
  tracing: true
  logging:
    level: "info"
    format: "json"
```

## Features

### Routing

Japa Gateway supports advanced routing patterns including:
- Path-based routing with wildcards and parameters
- Method-based routing
- Header-based routing
- Query parameter-based routing

Example:
```yaml
routes:
  - path: "/api/users/:id"  # Path parameter
    methods: ["GET"]
    target: "http://user-service:3000"
  
  - path: "/api/products/*" # Wildcard
    target: "http://product-service:3000"
```

### Authentication

Multiple authentication methods are supported:
- JWT (JSON Web Tokens)
- API Keys
- Basic Authentication
- OAuth 2.0 (coming soon)

Example JWT configuration:
```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
      tokenLocation: "header"
      tokenName: "Authorization"
```

### Rate Limiting

Protect your services from overload with rate limiting:
- Multiple algorithms (fixed window, sliding window)
- Configurable limits and windows
- Client identification by IP, user, or API key

Example:
```yaml
plugins:
  rateLimit:
    enabled: true
    algorithm: "fixed-window"
    limit: 100
    window: 60
    identifierKey: "ip"
```

### Circuit Breaking

Improve resilience with circuit breaking:
- Automatic detection of failing services
- Configurable failure thresholds
- Half-open state for recovery testing

Example:
```yaml
plugins:
  circuitBreaker:
    enabled: true
    failureThreshold: 0.5
    successThreshold: 2
    resetTimeout: 30000
```

### CORS

Enable cross-origin requests for web applications:
- Configurable origins, methods, and headers
- Automatic handling of preflight requests
- Credentials support

Example:
```yaml
plugins:
  cors:
    enabled: true
    origins: ["https://example.com"]
    methods: ["GET", "POST"]
    allowCredentials: true
```

### Observability

Comprehensive observability features:
- Structured logging
- Metrics collection
- Distributed tracing
- Health checks

## Plugins

### Built-in Plugins

Japa Gateway comes with several built-in plugins:
- Authentication Plugin
- Rate Limiting Plugin
- CORS Plugin
- Circuit Breaker Plugin
- Logging Plugin

### Creating Custom Plugins

You can extend Japa Gateway with custom plugins by implementing the Plugin interface:

```typescript
interface Plugin {
  initialize?(config: any): Promise<void>;
  preRouting?(context: RequestContext): Promise<void>;
  preProxy?(context: RequestContext): Promise<void>;
  postProxy?(context: RequestContext, response: Response): Promise<void>;
  shutdown?(): Promise<void>;
}
```

## Examples

See the `examples` directory for sample configurations and use cases:
- Basic Service Example
- Authentication Example
- Rate Limiting Example
- Circuit Breaking Example

To run the basic example:
```bash
./examples/basic-service/run-example.sh
```

## API Reference

For detailed API documentation, see the generated API docs:
```bash
bun run docs
```

This will generate API documentation in the `docs/api` directory.

## Deployment

Japa Gateway can be deployed in various environments:
- Standalone server
- Docker container
- Kubernetes cluster
- Cloud environments (AWS, GCP, Azure)

Example Docker deployment:
```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY . .
RUN bun install --production
RUN bun run build

EXPOSE 8000
CMD ["bun", "run", "dist/index.js"]
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](../CONTRIBUTING.md) for more details on how to get involved.
