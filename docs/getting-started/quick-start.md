# Quick Start

This guide will help you get Japa Gateway up and running quickly.

## Installation

First, install Japa Gateway:

```bash
# Using bun (recommended)
bun install japa-gateway

# Using npm
npm install japa-gateway

# Using Docker
docker pull japa-gateway/japa-gateway:latest
```

## Basic Configuration

Create a basic configuration file named `config.yaml`:

```yaml
server:
  port: 8000
  host: "0.0.0.0"

routes:
  - path: "/api/*"
    target: "http://localhost:3000"
```

## Starting the Gateway

### Using Bun

```bash
bun start
```

### Using Docker

```bash
docker run -p 8000:8000 -v $(pwd)/config.yaml:/app/config/config.yaml japa-gateway/japa-gateway:latest
```

## Testing the Gateway

Once the gateway is running, you can test it by sending a request:

```bash
curl http://localhost:8000/api/test
```

This will proxy the request to `http://localhost:3000/api/test`.

## Adding Authentication

To add JWT authentication, update your configuration:

```yaml
server:
  port: 8000
  host: "0.0.0.0"

routes:
  - path: "/api/*"
    target: "http://localhost:3000"
    plugins:
      auth:
        method: "jwt"

plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "your-secret-key"
```

Then restart the gateway and make an authenticated request:

```bash
curl -H "Authorization: Bearer your-jwt-token" http://localhost:8000/api/test
```

## Adding Rate Limiting

To add rate limiting, update your configuration:

```yaml
plugins:
  rateLimit:
    enabled: true
    limit: 100
    window: 60
```

## Next Steps

- [Configuration Guide](configuration.md) - Learn about all configuration options
- [Authentication](../features/authentication.md) - Learn about authentication options
- [Rate Limiting](../features/rate-limiting.md) - Learn about rate limiting options
