# Traffic Management

Effective traffic management is crucial for maintaining service reliability, preventing overload, and ensuring fair resource allocation. Japa Gateway provides several features to help you manage traffic to your backend services.

## Rate Limiting

Rate limiting restricts the number of requests a client can make in a given time period, protecting your services from abuse and ensuring fair resource allocation.

### Basic Rate Limiting

```yaml
plugins:
  rateLimit:
    enabled: true
    limit: 100       # 100 requests
    window: 60       # per 60 seconds
    keyGenerator: "ip"  # Rate limit by IP address
```

### Custom Rate Limit Keys

You can rate limit based on different client identifiers:

```yaml
plugins:
  rateLimit:
    enabled: true
    limit: 100
    window: 60
    keyGenerator: "header"  # Rate limit by header value
    keyHeader: "X-API-Key"  # Header to use for rate limit key
```

This configuration applies rate limits based on the API key, allowing different limits for different clients.

### Route-Specific Rate Limits

Apply different rate limits to different routes:

```yaml
routes:
  # Public API with strict rate limits
  - path: "/api/public/*"
    target: "http://public-service:3000"
    plugins:
      rateLimit:
        enabled: true
        limit: 50
        window: 60
  
  # Internal API with higher limits
  - path: "/api/internal/*"
    target: "http://internal-service:3000"
    plugins:
      rateLimit:
        enabled: true
        limit: 1000
        window: 60
```

### Tiered Rate Limiting

Implement different rate limits for different user tiers:

```yaml
routes:
  - path: "/api/*"
    target: "http://api-service:3000"
    plugins:
      rateLimit:
        enabled: true
        tiers:
          - key: "basic"
            limit: 100
            window: 60
          - key: "premium"
            limit: 1000
            window: 60
          - key: "enterprise"
            limit: 10000
            window: 60
        tierHeader: "X-User-Tier"  # Header containing the user tier
        defaultTier: "basic"       # Default tier if header is missing
```

### Rate Limit Response Customization

Customize the response when rate limits are exceeded:

```yaml
plugins:
  rateLimit:
    enabled: true
    limit: 100
    window: 60
    statusCode: 429  # HTTP 429 Too Many Requests
    message: "Rate limit exceeded. Please try again later."
    headers:
      - name: "X-RateLimit-Limit"
        value: "{limit}"
      - name: "X-RateLimit-Remaining"
        value: "{remaining}"
      - name: "X-RateLimit-Reset"
        value: "{reset}"
```

### Excluding Paths from Rate Limiting

Exclude certain paths from rate limiting:

```yaml
plugins:
  rateLimit:
    enabled: true
    limit: 100
    window: 60
    excludePaths:
      - "/health"
      - "/metrics"
      - "/api/public/*"
```

## Circuit Breaking

Circuit breaking prevents cascading failures by temporarily disabling requests to failing backend services.

### Basic Circuit Breaker

```yaml
plugins:
  circuitBreaker:
    enabled: true
    failureThreshold: 0.5   # 50% failure rate triggers open circuit
    resetTimeout: 30000     # 30 seconds before trying again
```

### Customizing Circuit Breaker Behavior

```yaml
plugins:
  circuitBreaker:
    enabled: true
    failureThreshold: 0.5
    resetTimeout: 30000
    halfOpenRequests: 5     # Number of requests to allow in half-open state
    failureStatusCodes: [500, 502, 503, 504]  # Status codes that count as failures
    minimumRequests: 10     # Minimum requests before circuit can open
```

### Fallback Responses

Configure fallback responses when the circuit is open:

```yaml
plugins:
  circuitBreaker:
    enabled: true
    failureThreshold: 0.5
    resetTimeout: 30000
    fallbackResponse:
      statusCode: 503
      body: {"error": "Service temporarily unavailable"}
      headers:
        - name: "Retry-After"
          value: "30"
```

### Service-Specific Circuit Breakers

Apply different circuit breaker configurations to different services:

```yaml
routes:
  - path: "/api/users/*"
    target: "http://user-service:3000"
    plugins:
      circuitBreaker:
        enabled: true
        failureThreshold: 0.3  # More sensitive for critical service
        resetTimeout: 15000    # Faster recovery attempts
  
  - path: "/api/reports/*"
    target: "http://report-service:3000"
    plugins:
      circuitBreaker:
        enabled: true
        failureThreshold: 0.7  # Less sensitive for non-critical service
        resetTimeout: 60000    # Longer recovery time
```

## Load Balancing

Distribute traffic across multiple instances of a backend service.

### Simple Load Balancing

```yaml
routes:
  - path: "/api/users/*"
    target: "http://user-service"  # Service name for DNS-based load balancing
```

### Weighted Load Balancing

Distribute traffic with specific weights:

```yaml
routes:
  - path: "/api/*"
    loadBalancing:
      method: "weighted"
      targets:
        - url: "http://service-instance-1:3000"
          weight: 3  # 60% of traffic
        - url: "http://service-instance-2:3000"
          weight: 2  # 40% of traffic
```

### Health-Aware Load Balancing

Only route traffic to healthy instances:

```yaml
routes:
  - path: "/api/*"
    loadBalancing:
      method: "healthAware"
      targets:
        - url: "http://service-instance-1:3000"
          healthCheck: "/health"
        - url: "http://service-instance-2:3000"
          healthCheck: "/health"
      healthCheckInterval: 10000  # Check every 10 seconds
```

## Request Throttling

Control the concurrency of requests to prevent overwhelming backend services:

```yaml
plugins:
  throttling:
    enabled: true
    maxConcurrent: 100  # Maximum concurrent requests
    queueSize: 50       # Queue size for pending requests
    timeout: 5000       # Queue timeout in milliseconds
```

## Traffic Shaping

Prioritize certain types of traffic:

```yaml
plugins:
  trafficShaping:
    enabled: true
    priorities:
      - name: "high"
        conditions:
          - type: "header"
            name: "X-Priority"
            value: "high"
        maxConcurrent: 50
        queueSize: 100
      - name: "normal"
        conditions: []  # Default priority
        maxConcurrent: 30
        queueSize: 50
```

## Request Timeouts

Configure timeouts to prevent long-running requests:

```yaml
server:
  timeout: 30000  # Global timeout (30 seconds)

routes:
  - path: "/api/quick/*"
    target: "http://quick-service:3000"
    timeout: 5000  # 5 second timeout for quick operations
  
  - path: "/api/reports/*"
    target: "http://report-service:3000"
    timeout: 120000  # 2 minute timeout for report generation
```

## Retry Policies

Automatically retry failed requests:

```yaml
routes:
  - path: "/api/orders/*"
    target: "http://order-service:3000"
    retry:
      attempts: 3
      initialDelay: 100  # 100ms initial delay
      maxDelay: 1000     # 1000ms maximum delay
      backoff: 2         # Exponential backoff multiplier
      statusCodes: [502, 503, 504]  # Retry on these status codes
```

## Combining Traffic Management Features

Create a comprehensive traffic management strategy by combining multiple features:

```yaml
plugins:
  # Global rate limiting
  rateLimit:
    enabled: true
    limit: 1000
    window: 60
  
  # Global circuit breaking
  circuitBreaker:
    enabled: true
    failureThreshold: 0.5
    resetTimeout: 30000

routes:
  # Critical API with strict controls
  - path: "/api/payments/*"
    target: "http://payment-service:3000"
    timeout: 10000
    retry:
      attempts: 2
      statusCodes: [502, 503, 504]
    plugins:
      rateLimit:
        enabled: true
        limit: 50
        window: 60
      circuitBreaker:
        enabled: true
        failureThreshold: 0.3
        resetTimeout: 15000
  
  # High-volume API with load balancing
  - path: "/api/products/*"
    loadBalancing:
      method: "weighted"
      targets:
        - url: "http://product-service-1:3000"
          weight: 2
        - url: "http://product-service-2:3000"
          weight: 3
    plugins:
      rateLimit:
        enabled: true
        limit: 500
        window: 60
```

## Traffic Management Best Practices

1. **Start Conservative**: Begin with conservative limits and adjust based on actual usage
2. **Monitor Closely**: Track rate limit hits, circuit breaker activations, and other traffic events
3. **Communicate Limits**: Use response headers to communicate limits to API consumers
4. **Graceful Degradation**: Design your system to degrade gracefully under load
5. **Test Failure Scenarios**: Regularly test how your system behaves when services fail
6. **Document Policies**: Clearly document your traffic management policies for API consumers

## Next Steps

Now that you understand traffic management, learn about:

- [Security best practices](security.md) for comprehensive API protection
- [Monitoring and observability](monitoring.md) to track traffic patterns and service health
- [Troubleshooting](troubleshooting.md) common traffic management issues
