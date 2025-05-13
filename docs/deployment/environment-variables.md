# Environment Variables

Japa Gateway supports extensive configuration through environment variables, making it ideal for cloud-native deployments. This page documents all available environment variables and their usage.

## Core Server Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GATEWAY_PORT` | Port the gateway listens on | `8000` | `GATEWAY_PORT=9000` |
| `GATEWAY_HOST` | Host the gateway binds to | `0.0.0.0` | `GATEWAY_HOST=127.0.0.1` |
| `CONFIG_PATH` | Path to the configuration file | `./config/config.yaml` | `CONFIG_PATH=/etc/japa/config.yaml` |

## Authentication Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `AUTH_METHOD` | Authentication method | `none` | `AUTH_METHOD=jwt` |
| `JWT_SECRET` | Secret for JWT authentication | `""` | `JWT_SECRET=your-secret-key` |
| `JWT_ISSUER` | Issuer for JWT tokens | `japa-gateway` | `JWT_ISSUER=my-api` |
| `JWT_AUDIENCE` | Audience for JWT tokens | `japa-clients` | `JWT_AUDIENCE=my-clients` |
| `JWT_EXPIRES_IN` | JWT token expiration | `1h` | `JWT_EXPIRES_IN=24h` |

## CORS Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CORS_ENABLED` | Enable CORS support | `true` | `CORS_ENABLED=false` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `["*"]` | `CORS_ORIGINS=example.com,api.example.com` |
| `CORS_METHODS` | Allowed methods (comma-separated) | `["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]` | `CORS_METHODS=GET,POST` |
| `CORS_ALLOWED_HEADERS` | Allowed headers (comma-separated) | `["Content-Type", "Authorization"]` | `CORS_ALLOWED_HEADERS=Content-Type,X-API-Key` |
| `CORS_EXPOSED_HEADERS` | Exposed headers (comma-separated) | `["Content-Length"]` | `CORS_EXPOSED_HEADERS=X-RateLimit-Limit` |

## Rate Limiting Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `false` | `RATE_LIMIT_ENABLED=true` |
| `RATE_LIMIT_WINDOW` | Time window in seconds | `60` | `RATE_LIMIT_WINDOW=300` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | `RATE_LIMIT_MAX_REQUESTS=50` |

## Circuit Breaker Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CIRCUIT_BREAKER_ENABLED` | Enable circuit breaker | `true` | `CIRCUIT_BREAKER_ENABLED=false` |
| `CIRCUIT_BREAKER_THRESHOLD` | Failure threshold percentage | `0.5` | `CIRCUIT_BREAKER_THRESHOLD=0.3` |
| `CIRCUIT_BREAKER_RESET_TIMEOUT` | Reset timeout in ms | `10000` | `CIRCUIT_BREAKER_RESET_TIMEOUT=30000` |

## Telemetry Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `TELEMETRY_ENABLED` | Enable telemetry | `true` | `TELEMETRY_ENABLED=false` |
| `LOG_LEVEL` | Logging level | `info` | `LOG_LEVEL=debug` |
| `LOG_FORMAT` | Logging format | `json` | `LOG_FORMAT=pretty` |

## Route-Specific Settings

You can also configure specific routes using environment variables by following this pattern:

```
ROUTE_<INDEX>_PATH=/api/*
ROUTE_<INDEX>_TARGET=http://api-service:3000
ROUTE_<INDEX>_AUTH_METHOD=jwt
```

For example:

```bash
ROUTE_0_PATH=/api/users/*
ROUTE_0_TARGET=http://user-service:3000
ROUTE_0_AUTH_METHOD=jwt

ROUTE_1_PATH=/api/products/*
ROUTE_1_TARGET=http://product-service:3001
ROUTE_1_RATE_LIMIT_MAX_REQUESTS=200
```

## Using Default Values

Japa Gateway supports default values for environment variables using the `${VAR_NAME:-default}` syntax in the configuration file:

```yaml
server:
  port: ${GATEWAY_PORT:-8000}
  host: ${GATEWAY_HOST:-0.0.0.0}
```

This allows you to specify fallback values when environment variables are not set.
