# Configuration

Japa Gateway provides flexible configuration options through YAML files and environment variables.

## Configuration File

The default configuration file is located at `config/config.yaml`. Here's an example of a complete configuration file:

```yaml
# Server configuration
server:
  port: ${GATEWAY_PORT:-8000}
  host: ${GATEWAY_HOST:-0.0.0.0}
  timeout: 30000
  trustProxy: false

# Routes configuration
routes:
  - path: "/api/users/*"
    methods: ["GET", "POST", "PUT", "DELETE"]
    target: "http://${USER_SERVICE_HOST:-user-service}:${USER_SERVICE_PORT:-3000}"
    plugins:
      auth:
        method: ${AUTH_METHOD:-"jwt"}
      rateLimit:
        limit: 100
        window: 60
  
  - path: "/api/products/*"
    target: "http://${PRODUCT_SERVICE_HOST:-product-service}:${PRODUCT_SERVICE_PORT:-3001}"
    plugins:
      auth:
        method: "none"

# Plugin configurations
plugins:
  # Authentication plugin
  auth:
    method: ${AUTH_METHOD:-"none"}
    jwt:
      secret: ${JWT_SECRET:-""}
      issuer: ${JWT_ISSUER:-"japa-gateway"}
      audience: ${JWT_AUDIENCE:-"japa-clients"}
      expiresIn: ${JWT_EXPIRES_IN:-"1h"}
  
  # Rate limiting plugin
  rateLimit:
    enabled: ${RATE_LIMIT_ENABLED:-true}
    limit: ${RATE_LIMIT_MAX_REQUESTS:-100}
    window: ${RATE_LIMIT_WINDOW:-60}
  
  # CORS plugin
  cors:
    enabled: ${CORS_ENABLED:-true}
    origins: ${CORS_ORIGINS:-["*"]}
    methods: ${CORS_METHODS:-["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]}
    allowedHeaders: ${CORS_ALLOWED_HEADERS:-["Content-Type", "Authorization", "X-Requested-With"]}
    exposedHeaders: ${CORS_EXPOSED_HEADERS:-["Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]}
    allowCredentials: false
    maxAge: 86400
    handlePreflight: true
  
  # Circuit breaker plugin
  circuitBreaker:
    enabled: true
    failureThreshold: 0.5
    resetTimeout: 10000

# Telemetry configuration
telemetry:
  enabled: true
  metrics: true
  tracing: true
  logging:
    level: ${LOG_LEVEL:-"info"}
    format: ${LOG_FORMAT:-"json"}
```

## Configuration Sections

### Server Configuration

The `server` section configures the core gateway server:

```yaml
server:
  port: 8000              # Port to listen on
  host: "0.0.0.0"         # Host to bind to
  timeout: 30000          # Request timeout in milliseconds
  trustProxy: false       # Whether to trust proxy headers
```

### Routes Configuration

The `routes` section defines the API routes and their targets:

```yaml
routes:
  - path: "/api/users/*"                   # Path pattern to match
    methods: ["GET", "POST", "PUT"]        # HTTP methods to match (optional)
    target: "http://user-service:3000"     # Target service URL
    plugins:                               # Route-specific plugin configuration
      auth:
        method: "jwt"
```

### Plugin Configuration

The `plugins` section configures global plugin settings:

```yaml
plugins:
  auth:
    method: "jwt"                # Authentication method
    jwt:
      secret: "your-secret-key"  # JWT secret
  
  rateLimit:
    enabled: true                # Enable rate limiting
    limit: 100                   # Request limit
    window: 60                   # Time window in seconds
```

### Telemetry Configuration

The `telemetry` section configures observability features:

```yaml
telemetry:
  enabled: true
  metrics: true
  tracing: true
  logging:
    level: "info"
    format: "json"
```

## Environment Variables

All configuration values can be overridden with environment variables. Japa Gateway supports the `${VAR_NAME:-default}` syntax for providing default values when environment variables are not set.

For example:

```yaml
server:
  port: ${GATEWAY_PORT:-8000}
  host: ${GATEWAY_HOST:-0.0.0.0}
```

See the [Environment Variables](../deployment/environment-variables.md) page for a complete list of supported variables.

## Configuration Precedence

Configuration values are applied in the following order of precedence (highest to lowest):

1. Environment variables
2. Route-specific plugin configuration
3. Global plugin configuration
4. Default values

This means that environment variables will always override values in the configuration file, and route-specific plugin configurations will override global plugin configurations.
