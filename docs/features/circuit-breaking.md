# Circuit Breaking

Circuit breaking is a critical resilience pattern that prevents cascading failures in microservices architectures.

## Overview

The circuit breaker pattern works like an electrical circuit breaker:

1. When the failure rate exceeds a threshold, the circuit "trips" (opens)
2. While open, requests are rejected immediately without calling the failing service
3. After a timeout period, the circuit switches to "half-open" state
4. A limited number of test requests are allowed through
5. If these succeed, the circuit closes; if they fail, it reopens

## Configuration

### Global Configuration

Configure circuit breaking globally in the `plugins` section:

```yaml
plugins:
  circuitBreaker:
    enabled: ${CIRCUIT_BREAKER_ENABLED:-true}
    failureThreshold: ${CIRCUIT_BREAKER_THRESHOLD:-0.5}  # 50% failure rate
    resetTimeout: ${CIRCUIT_BREAKER_RESET_TIMEOUT:-10000}  # 10 seconds
    halfOpenRequests: 5  # Number of requests to try in half-open state
    failureStatusCodes: [500, 502, 503, 504]  # Status codes counted as failures
    fallbackResponse:  # Optional response when circuit is open
      statusCode: 503
      body: {"error": "Service temporarily unavailable"}
```

### Route-Specific Configuration

Apply different circuit breaker settings to specific routes:

```yaml
routes:
  - path: "/api/critical/*"
    target: "http://critical-service:3000"
    plugins:
      circuitBreaker:
        failureThreshold: 0.3  # More sensitive threshold
        resetTimeout: 30000    # Longer reset timeout
  
  - path: "/api/non-critical/*"
    target: "http://non-critical-service:3001"
    plugins:
      circuitBreaker:
        failureThreshold: 0.7  # Less sensitive threshold
        resetTimeout: 5000     # Shorter reset timeout
```

## Circuit States

The circuit breaker has three states:

1. **Closed**: Normal operation, all requests pass through
2. **Open**: Circuit has tripped, all requests are rejected immediately
3. **Half-Open**: Testing if the service has recovered

## Monitoring

Japa Gateway provides metrics and logs for circuit breaker events:

- Circuit trip events
- State transitions
- Success/failure rates
- Current circuit state per route

These can be accessed through the telemetry system.

## Headers

When a circuit breaker is active, Japa Gateway adds the following headers to responses:

- `X-Circuit-State`: Current state of the circuit (closed, open, half-open)
- `X-Circuit-Failure-Rate`: Current failure rate (when available)

## Best Practices

1. **Appropriate Thresholds**: Set thresholds based on the expected reliability of the service
2. **Timeout Tuning**: Adjust reset timeouts based on how long services typically take to recover
3. **Fallback Responses**: Configure meaningful fallback responses for critical endpoints
4. **Monitoring**: Actively monitor circuit breaker events to identify problematic services
5. **Gradual Recovery**: Use the half-open state effectively to prevent overwhelming recovering services
