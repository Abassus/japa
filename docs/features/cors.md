# CORS Support

Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the original page.

## Overview

Japa Gateway provides comprehensive CORS support to:

- Allow or restrict cross-origin requests
- Configure allowed origins, methods, and headers
- Handle preflight requests automatically

## Configuration

### Global Configuration

Configure CORS globally in the `plugins` section:

```yaml
plugins:
  cors:
    enabled: ${CORS_ENABLED:-true}
    origins: ${CORS_ORIGINS:-["*"]}  # Allowed origins (use ["*"] for all origins)
    methods: ${CORS_METHODS:-["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]}
    allowedHeaders: ${CORS_ALLOWED_HEADERS:-["Content-Type", "Authorization", "X-Requested-With"]}
    exposedHeaders: ${CORS_EXPOSED_HEADERS:-["Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining"]}
    allowCredentials: false  # Whether to allow cookies in cross-origin requests
    maxAge: 86400  # How long preflight results can be cached (in seconds)
    handlePreflight: true  # Whether to handle OPTIONS preflight requests automatically
```

### Route-Specific Configuration

Apply different CORS settings to specific routes:

```yaml
routes:
  - path: "/api/public/*"
    target: "http://public-service:3000"
    plugins:
      cors:
        origins: ["https://public.example.com"]
        allowCredentials: true
  
  - path: "/api/admin/*"
    target: "http://admin-service:3001"
    plugins:
      cors:
        origins: ["https://admin.example.com"]
        methods: ["GET", "POST"]
```

## Environment Variables

CORS settings can be configured through environment variables:

```bash
CORS_ENABLED=true
CORS_ORIGINS=example.com,api.example.com
CORS_METHODS=GET,POST,PUT
CORS_ALLOWED_HEADERS=Content-Type,Authorization
```

## CORS Headers

When CORS is enabled, Japa Gateway adds the following headers to responses:

- `Access-Control-Allow-Origin`: Allowed origins
- `Access-Control-Allow-Methods`: Allowed HTTP methods
- `Access-Control-Allow-Headers`: Allowed request headers
- `Access-Control-Expose-Headers`: Headers accessible to JavaScript
- `Access-Control-Allow-Credentials`: Whether credentials are allowed
- `Access-Control-Max-Age`: Preflight cache duration

## Preflight Requests

Browsers send preflight OPTIONS requests before certain cross-origin requests. Japa Gateway handles these automatically when `handlePreflight` is enabled, responding with appropriate CORS headers without forwarding to the backend service.

## Best Practices

1. **Specific Origins**: Avoid using `*` in production; specify exact domains
2. **Minimal Headers**: Only expose headers that are necessary
3. **Credentials**: Only enable `allowCredentials` when necessary, as it has security implications
4. **Cache Duration**: Set an appropriate `maxAge` to reduce preflight requests
5. **Testing**: Test CORS configuration with cross-origin requests during development
