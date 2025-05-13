# Troubleshooting

This guide provides solutions for common issues you might encounter when using Japa Gateway.

## Startup Issues

### Gateway Fails to Start

**Symptoms:**
- Gateway process exits immediately after starting
- Error messages in logs about configuration or port binding

**Possible Causes and Solutions:**

1. **Port Already in Use**

   ```
   Error: listen EADDRINUSE: address already in use :::8000
   ```

   **Solution:** Change the port in your configuration or stop the process using the current port:

   ```bash
   # Find the process using the port
   lsof -i :8000
   
   # Kill the process
   kill -9 <PID>
   ```

2. **Invalid Configuration**

   ```
   Error: Configuration validation failed
   ```

   **Solution:** Check your configuration file for syntax errors or invalid values:

   ```bash
   # Validate your configuration
   bun run japa-gateway validate --config ./config.yaml
   ```

3. **Missing Environment Variables**

   ```
   Error: Environment variable JWT_SECRET is required but not provided
   ```

   **Solution:** Ensure all required environment variables are set:

   ```bash
   # Set missing environment variables
   export JWT_SECRET=your-secret-key
   ```

4. **Permission Issues**

   ```
   Error: EACCES: permission denied
   ```

   **Solution:** Ensure the gateway has appropriate permissions:

   ```bash
   # Check file permissions
   chmod 644 config.yaml
   
   # If using a privileged port (<1024)
   sudo bun run japa-gateway
   ```

## Routing Issues

### Requests Not Reaching Backend Services

**Symptoms:**
- Gateway returns 404 or 502 errors
- Backend service logs show no incoming requests

**Possible Causes and Solutions:**

1. **Route Path Mismatch**

   **Solution:** Check your route path patterns and ensure they match the incoming requests:

   ```yaml
   # Correct path pattern
   routes:
     - path: "/api/users/*"  # Use wildcard for all paths under /api/users/
       target: "http://user-service:3000"
   ```

2. **Backend Service Unreachable**

   **Solution:** Verify the backend service is running and reachable from the gateway:

   ```bash
   # Test connectivity to backend service
   curl -v http://user-service:3000/health
   ```

3. **DNS Resolution Issues**

   **Solution:** Use IP addresses instead of hostnames or configure proper DNS resolution:

   ```yaml
   routes:
     - path: "/api/users/*"
       target: "http://192.168.1.100:3000"  # Use IP address instead of hostname
   ```

4. **Method Not Allowed**

   **Solution:** Ensure your route configuration includes the appropriate HTTP methods:

   ```yaml
   routes:
     - path: "/api/users/*"
       methods: ["GET", "POST", "PUT", "DELETE"]  # Include all needed methods
       target: "http://user-service:3000"
   ```

## Authentication Issues

### Authentication Failures

**Symptoms:**
- Gateway returns 401 Unauthorized errors
- Authentication-related errors in logs

**Possible Causes and Solutions:**

1. **Invalid JWT Secret**

   **Solution:** Ensure the JWT secret matches between the token issuer and gateway:

   ```yaml
   plugins:
     auth:
       method: "jwt"
       jwt:
         secret: "${JWT_SECRET}"  # Must match the secret used to sign tokens
   ```

2. **Expired Tokens**

   **Solution:** Check token expiration and implement token refresh:

   ```yaml
   plugins:
     auth:
       method: "jwt"
       jwt:
         clockTolerance: 30  # Allow 30 seconds of clock skew
   ```

3. **Missing or Malformed Authorization Header**

   **Solution:** Ensure clients are sending the correct Authorization header:

   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **API Key Not Found**

   **Solution:** Verify the API key is correctly configured:

   ```yaml
   plugins:
     auth:
       method: "api_key"
       apiKey:
         keys: ["${API_KEY}"]  # Ensure this matches the key sent by clients
         header: "X-API-Key"   # Check the header name
   ```

## Performance Issues

### High Latency

**Symptoms:**
- Requests take longer than expected to complete
- Increasing response times over time

**Possible Causes and Solutions:**

1. **Backend Service Slow**

   **Solution:** Monitor backend service performance and optimize as needed:

   ```yaml
   telemetry:
     tracing:
       enabled: true  # Enable tracing to identify slow services
   ```

2. **Gateway Resource Constraints**

   **Solution:** Increase resources allocated to the gateway:

   ```bash
   # If using Docker, increase resource limits
   docker run -p 8000:8000 --memory=1g --cpus=2 japa-gateway
   ```

3. **Connection Pool Exhaustion**

   **Solution:** Configure appropriate connection pooling:

   ```yaml
   server:
     http:
       maxConnections: 1000
       keepAliveTimeout: 5000
   ```

4. **Inefficient Routing Rules**

   **Solution:** Simplify complex routing rules and prioritize them efficiently:

   ```yaml
   routes:
     # Put most frequently accessed routes first
     - path: "/api/products/*"
       target: "http://product-service:3000"
   ```

## Rate Limiting Issues

### Unexpected Rate Limiting

**Symptoms:**
- Legitimate requests are being rate limited
- 429 Too Many Requests errors

**Possible Causes and Solutions:**

1. **Rate Limit Too Low**

   **Solution:** Adjust rate limits based on actual usage patterns:

   ```yaml
   plugins:
     rateLimit:
       limit: 1000  # Increase limit
       window: 60   # Per minute
   ```

2. **Incorrect Rate Limit Key**

   **Solution:** Use a more appropriate key for rate limiting:

   ```yaml
   plugins:
     rateLimit:
       keyGenerator: "header"  # Rate limit by API key instead of IP
       keyHeader: "X-API-Key"
   ```

3. **Shared IP Address**

   **Solution:** If clients share IP addresses (e.g., behind NAT), use a different rate limit key:

   ```yaml
   plugins:
     rateLimit:
       keyGenerator: "header"
       keyHeader: "X-Client-ID"  # Use a client identifier header
   ```

## Circuit Breaker Issues

### Circuit Breaker Opening Too Frequently

**Symptoms:**
- Circuit breaker opens frequently
- Many requests fail with 503 Service Unavailable

**Possible Causes and Solutions:**

1. **Threshold Too Low**

   **Solution:** Adjust the failure threshold:

   ```yaml
   plugins:
     circuitBreaker:
       failureThreshold: 0.5  # 50% failure rate before opening
       minimumRequests: 20    # Require at least 20 requests before opening
   ```

2. **Reset Timeout Too Short**

   **Solution:** Increase the reset timeout to allow backend services to recover:

   ```yaml
   plugins:
     circuitBreaker:
       resetTimeout: 30000  # 30 seconds before trying again
   ```

3. **Incorrect Failure Status Codes**

   **Solution:** Configure appropriate status codes that should count as failures:

   ```yaml
   plugins:
     circuitBreaker:
       failureStatusCodes: [500, 502, 503, 504]  # Only count server errors
   ```

## CORS Issues

### CORS Preflight Failures

**Symptoms:**
- Browser console shows CORS errors
- Preflight OPTIONS requests fail

**Possible Causes and Solutions:**

1. **Missing CORS Headers**

   **Solution:** Configure appropriate CORS headers:

   ```yaml
   plugins:
     cors:
       enabled: true
       origins: ["https://your-frontend.com"]
       methods: ["GET", "POST", "PUT", "DELETE"]
       allowedHeaders: ["Content-Type", "Authorization"]
       exposedHeaders: ["X-Total-Count"]
       allowCredentials: true
   ```

2. **Incorrect Origin Configuration**

   **Solution:** Ensure the client's origin is in the allowed origins list:

   ```yaml
   plugins:
     cors:
       origins: ["*"]  # Allow all origins (for development only)
       # OR
       origins: ["https://app.example.com", "https://admin.example.com"]
   ```

3. **Missing OPTIONS Method in Route**

   **Solution:** Ensure OPTIONS method is allowed for routes:

   ```yaml
   routes:
     - path: "/api/*"
       methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]  # Include OPTIONS
       target: "http://backend-service:3000"
   ```

## Logging and Monitoring Issues

### Missing or Insufficient Logs

**Symptoms:**
- Difficult to troubleshoot issues
- Logs don't contain relevant information

**Possible Causes and Solutions:**

1. **Log Level Too High**

   **Solution:** Lower the log level to capture more information:

   ```yaml
   telemetry:
     logging:
       level: "debug"  # Set to debug for more detailed logs
   ```

2. **Missing Request Logging**

   **Solution:** Enable detailed request logging:

   ```yaml
   telemetry:
     logging:
       requests:
         enabled: true
         includeHeaders: true
         includeBody: true  # Be careful with sensitive data
   ```

3. **Log Format Issues**

   **Solution:** Use the appropriate log format for your environment:

   ```yaml
   telemetry:
     logging:
       format: "json"  # Use JSON for machine processing
       # OR
       format: "pretty"  # Use pretty format for development
   ```

## Deployment Issues

### Docker Deployment Problems

**Symptoms:**
- Container exits unexpectedly
- Configuration not applied correctly

**Possible Causes and Solutions:**

1. **Environment Variables Not Set**

   **Solution:** Ensure environment variables are passed to the container:

   ```bash
   docker run -p 8000:8000 \
     -e JWT_SECRET=your-secret-key \
     -e PORT=8000 \
     japa-gateway
   ```

2. **Volume Mounting Issues**

   **Solution:** Check volume mounts for configuration files:

   ```bash
   docker run -p 8000:8000 \
     -v $(pwd)/config.yaml:/app/config/config.yaml \
     japa-gateway
   ```

3. **Container Networking**

   **Solution:** Ensure the container can reach backend services:

   ```bash
   # If using Docker Compose, use the service name
   docker-compose up -d
   
   # If using standalone Docker, use the appropriate network
   docker run --network=my-network -p 8000:8000 japa-gateway
   ```

### Kubernetes Deployment Issues

**Symptoms:**
- Pods fail to start or crash
- Service discovery issues

**Possible Causes and Solutions:**

1. **ConfigMap or Secret Issues**

   **Solution:** Verify ConfigMaps and Secrets are correctly created and mounted:

   ```bash
   kubectl describe configmap japa-gateway-config
   kubectl describe secret japa-gateway-secrets
   ```

2. **Service Discovery**

   **Solution:** Use Kubernetes service names for backend services:

   ```yaml
   routes:
     - path: "/api/users/*"
       target: "http://user-service.default.svc.cluster.local:3000"
   ```

3. **Resource Limits**

   **Solution:** Ensure appropriate resource requests and limits:

   ```yaml
   resources:
     requests:
       memory: "256Mi"
       cpu: "100m"
     limits:
       memory: "512Mi"
       cpu: "500m"
   ```

## Common Error Codes and Solutions

### 401 Unauthorized

**Possible Causes:**
- Invalid or expired JWT
- Missing or incorrect API key

**Solutions:**
- Check authentication configuration
- Verify client is sending correct credentials
- Implement token refresh for expired JWTs

### 403 Forbidden

**Possible Causes:**
- User authenticated but lacks required permissions
- IP address blocked by IP filter

**Solutions:**
- Check RBAC configuration
- Verify user has necessary roles
- Check IP filter configuration

### 429 Too Many Requests

**Possible Causes:**
- Rate limit exceeded
- Client sending too many requests

**Solutions:**
- Adjust rate limit configuration
- Implement client-side throttling
- Use different rate limit keys for different clients

### 502 Bad Gateway

**Possible Causes:**
- Backend service unreachable
- Backend service returned invalid response

**Solutions:**
- Check backend service health
- Verify network connectivity
- Check for backend service errors

### 503 Service Unavailable

**Possible Causes:**
- Circuit breaker open
- Backend service overloaded

**Solutions:**
- Check circuit breaker configuration
- Investigate backend service issues
- Implement retry with backoff in clients

### 504 Gateway Timeout

**Possible Causes:**
- Backend service took too long to respond
- Request timeout too short

**Solutions:**
- Increase timeout configuration
- Optimize backend service performance
- Implement asynchronous processing for long-running operations

## Diagnostic Tools

### Gateway Diagnostics Endpoint

Enable the diagnostics endpoint for troubleshooting:

```yaml
server:
  diagnostics:
    enabled: true
    path: "/diagnostics"
    requireAuth: true  # Require authentication to access diagnostics
```

This endpoint provides:
- Configuration (with sensitive data redacted)
- Route table
- Plugin status
- System information

### Traffic Replay

Use the traffic replay tool to reproduce issues:

```bash
# Capture traffic for replay
bun run japa-gateway capture --output ./captured-traffic.json

# Replay traffic
bun run japa-gateway replay --input ./captured-traffic.json
```

### Configuration Validation

Validate your configuration before deployment:

```bash
bun run japa-gateway validate --config ./config.yaml
```

## Getting Help

If you're still experiencing issues:

1. **Check Documentation**: Review the [API Reference](../api-reference/configuration-schema.md) for detailed configuration options
2. **Search Issues**: Check the [GitHub Issues](https://github.com/your-org/japa-gateway/issues) for similar problems
3. **Community Support**: Ask for help in the [Community Forum](https://forum.japa-gateway.io)
4. **Open an Issue**: If you've found a bug, [open an issue](https://github.com/your-org/japa-gateway/issues/new) with detailed reproduction steps

## Contributing to Troubleshooting

If you've solved an issue that isn't documented here:

1. [Fork the documentation repository](https://github.com/your-org/japa-gateway-docs)
2. Add your solution to this troubleshooting guide
3. Submit a pull request

Your contributions help the entire Japa Gateway community!
