# Rate Limiting

Rate limiting is an essential feature for protecting your APIs from excessive traffic and potential abuse.

## Overview

Japa Gateway's rate limiting plugin allows you to:

- Limit the number of requests from a client in a specific time window
- Apply different rate limits to different routes
- Customize rate limit behavior based on client identification

## Configuration

### Global Configuration

Configure rate limiting globally in the `plugins` section:

```yaml
plugins:
  rateLimit:
    enabled: ${RATE_LIMIT_ENABLED:-true}
    limit: ${RATE_LIMIT_MAX_REQUESTS:-100}  # Maximum requests
    window: ${RATE_LIMIT_WINDOW:-60}        # Time window in seconds
    keyGenerator: "ip"                      # Method to identify clients (ip, header, or custom)
    skipMethods: ["OPTIONS", "HEAD"]        # HTTP methods to skip
    statusCode: 429                         # Status code when rate limit exceeded
    message: "Too many requests"            # Error message
```

### Route-Specific Configuration

Apply different rate limits to specific routes:

```yaml
routes:
  - path: "/api/public/*"
    target: "http://public-service:3000"
    plugins:
      rateLimit:
        limit: 200
        window: 60
  
  - path: "/api/admin/*"
    target: "http://admin-service:3001"
    plugins:
      rateLimit:
        limit: 50
        window: 60
```

## Client Identification Methods

The `keyGenerator` option determines how clients are identified for rate limiting:

- `ip`: Uses the client's IP address (default)
- `header`: Uses a specific header value (e.g., API key)
- `custom`: Uses a custom function to generate a key

### Using Headers for Identification

```yaml
plugins:
  rateLimit:
    enabled: true
    limit: 100
    window: 60
    keyGenerator: "header"
    keyHeader: "X-API-Key"  # Header to use for identification
```

## Response Headers

When rate limiting is enabled, Japa Gateway adds the following headers to responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Time (in seconds) until the rate limit resets

## Handling Rate Limit Exceeded

When a client exceeds the rate limit, Japa Gateway:

1. Returns a 429 Too Many Requests status code (customizable)
2. Includes a JSON response with an error message
3. Sets the `Retry-After` header with the number of seconds to wait

## Best Practices

1. **Set Appropriate Limits**: Consider the nature of your API and expected traffic
2. **Different Limits for Different Routes**: Apply stricter limits to resource-intensive endpoints
3. **Authenticated vs. Unauthenticated**: Consider different limits based on authentication status
4. **Monitor Rate Limiting**: Track rate limit events to identify potential issues or attacks
