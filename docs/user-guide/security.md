# Security Best Practices

Securing your API gateway is critical for protecting your backend services and data. This guide outlines security best practices for Japa Gateway deployments.

## Secure Gateway Configuration

### Use HTTPS

Always use HTTPS to encrypt data in transit:

```yaml
server:
  port: 443
  host: "0.0.0.0"
  tls:
    enabled: true
    certFile: "/path/to/cert.pem"
    keyFile: "/path/to/key.pem"
```

For local development, you can use self-signed certificates, but in production, always use certificates from a trusted certificate authority.

### Secure Headers

Configure security headers to protect against common web vulnerabilities:

```yaml
plugins:
  securityHeaders:
    enabled: true
    headers:
      - name: "Strict-Transport-Security"
        value: "max-age=31536000; includeSubDomains"
      - name: "X-Content-Type-Options"
        value: "nosniff"
      - name: "X-Frame-Options"
        value: "DENY"
      - name: "Content-Security-Policy"
        value: "default-src 'self'"
      - name: "X-XSS-Protection"
        value: "1; mode=block"
```

### Environment Variables for Secrets

Never hardcode sensitive information in your configuration files. Use environment variables instead:

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
```

### Secure Docker Deployment

When deploying with Docker, follow these security practices:

1. Use non-root users in your Dockerfile:

```dockerfile
# Create a non-root user
RUN addgroup --system japa && \
    adduser --system --ingroup japa japa

# Switch to non-root user
USER japa
```

2. Mount secrets as volumes or use Docker secrets:

```bash
docker run -p 8000:8000 \
  -v /path/to/secrets:/app/secrets:ro \
  japa-gateway
```

## Authentication and Authorization

### Multi-Layer Authentication

Implement multiple layers of authentication for critical services:

```yaml
routes:
  - path: "/api/admin/*"
    target: "http://admin-service:3000"
    plugins:
      auth:
        method: "jwt"
        jwt:
          secret: "${JWT_SECRET}"
      ipAllowList:
        enabled: true
        ips: ["10.0.0.0/8", "192.168.1.0/24"]
```

This configuration requires both a valid JWT and an allowed IP address.

### Role-Based Access Control

Implement role-based access control using JWT claims:

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
    rbac:
      enabled: true
      rules:
        - path: "/api/admin/*"
          requiredRoles: ["admin"]
        - path: "/api/reports/*"
          requiredRoles: ["analyst", "admin"]
      rolesPath: "token.payload.roles"
```

### Token Validation

Ensure comprehensive token validation:

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
      issuer: "japa-auth"
      audience: "japa-api"
      clockTolerance: 30
      validateClaims:
        notBefore: true
        expiresIn: true
        issuer: true
        audience: true
```

### API Key Rotation

Implement API key rotation to limit the impact of compromised keys:

```yaml
plugins:
  auth:
    method: "api_key"
    apiKey:
      keys:
        - key: "${API_KEY_CURRENT}"
          status: "active"
        - key: "${API_KEY_PREVIOUS}"
          status: "deprecated"
          expiresAt: "2025-06-30T00:00:00Z"
```

## Request and Response Protection

### Request Validation

Validate incoming requests to prevent malformed or malicious data:

```yaml
plugins:
  requestValidation:
    enabled: true
    schemas:
      - path: "/api/users"
        method: "POST"
        schema:
          type: "object"
          required: ["username", "email"]
          properties:
            username:
              type: "string"
              minLength: 3
            email:
              type: "string"
              format: "email"
```

### Response Sanitization

Sanitize responses to prevent sensitive data leakage:

```yaml
plugins:
  responseSanitization:
    enabled: true
    rules:
      - path: "/api/users/*"
        removeFields: ["password", "ssn", "creditCard"]
```

### Content Security

Scan request content for security threats:

```yaml
plugins:
  contentSecurity:
    enabled: true
    scanUploads: true
    maxFileSize: 10485760  # 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"]
```

## Network Security

### IP Filtering

Restrict access based on IP addresses:

```yaml
plugins:
  ipFilter:
    enabled: true
    allowList: ["10.0.0.0/8", "192.168.1.0/24"]
    denyList: ["1.2.3.4"]
    defaultPolicy: "deny"  # "allow" or "deny"
```

### Rate Limiting for Security

Use rate limiting to prevent brute force attacks:

```yaml
routes:
  - path: "/api/auth/*"
    target: "http://auth-service:3000"
    plugins:
      rateLimit:
        enabled: true
        limit: 10
        window: 60
        keyGenerator: "ip"
```

### DDoS Protection

Configure DDoS protection:

```yaml
plugins:
  ddosProtection:
    enabled: true
    burstLimit: 100
    averageRate: 50
    blockDuration: 300  # Block for 5 minutes
```

## Monitoring and Incident Response

### Security Logging

Configure comprehensive security logging:

```yaml
plugins:
  securityLogging:
    enabled: true
    logLevel: "info"
    events:
      - "authentication.failure"
      - "authorization.failure"
      - "rateLimit.exceeded"
      - "ipFilter.blocked"
    sensitiveHeaders: ["Authorization", "Cookie"]
```

### Intrusion Detection

Implement basic intrusion detection:

```yaml
plugins:
  intrusionDetection:
    enabled: true
    rules:
      - name: "SQL Injection"
        pattern: "\\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\\b"
        action: "block"
      - name: "XSS Attack"
        pattern: "<script[^>]*>.*</script>"
        action: "block"
```

### Automated Blocking

Automatically block suspicious clients:

```yaml
plugins:
  autoBlock:
    enabled: true
    thresholds:
      - type: "authentication.failure"
        count: 5
        window: 300  # 5 minutes
        blockDuration: 3600  # 1 hour
      - type: "rateLimit.exceeded"
        count: 10
        window: 60
        blockDuration: 1800  # 30 minutes
```

## Secure Development Practices

### Security Testing

Regularly test your gateway configuration for security vulnerabilities:

1. **Penetration Testing**: Conduct regular penetration tests
2. **Vulnerability Scanning**: Use automated tools to scan for vulnerabilities
3. **Configuration Auditing**: Audit your gateway configuration for security issues

### Security Updates

Keep your gateway and dependencies up to date:

```bash
# Update to the latest version
bun update japa-gateway

# Check for vulnerable dependencies
bun audit
```

## Comprehensive Security Example

Here's a comprehensive security configuration for a production environment:

```yaml
server:
  port: 443
  host: "0.0.0.0"
  tls:
    enabled: true
    certFile: "/app/certs/cert.pem"
    keyFile: "/app/certs/key.pem"

plugins:
  # Authentication
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
      issuer: "japa-auth"
      audience: "japa-api"
  
  # Rate limiting
  rateLimit:
    enabled: true
    limit: 100
    window: 60
    keyGenerator: "ip"
  
  # Security headers
  securityHeaders:
    enabled: true
    headers:
      - name: "Strict-Transport-Security"
        value: "max-age=31536000; includeSubDomains"
      - name: "X-Content-Type-Options"
        value: "nosniff"
      - name: "X-Frame-Options"
        value: "DENY"
  
  # IP filtering
  ipFilter:
    enabled: true
    allowList: ["10.0.0.0/8", "192.168.0.0/16"]
    defaultPolicy: "allow"
  
  # Security logging
  securityLogging:
    enabled: true
    logLevel: "info"
    events: ["authentication.failure", "authorization.failure", "rateLimit.exceeded"]

routes:
  # Public API
  - path: "/api/public/*"
    target: "http://public-service:3000"
    plugins:
      auth:
        method: "none"
      rateLimit:
        enabled: true
        limit: 200
        window: 60
  
  # User API with authentication
  - path: "/api/users/*"
    target: "http://user-service:3000"
    plugins:
      auth:
        method: "jwt"
      rateLimit:
        enabled: true
        limit: 50
        window: 60
  
  # Admin API with strict security
  - path: "/api/admin/*"
    target: "http://admin-service:3000"
    plugins:
      auth:
        method: "jwt"
        jwt:
          audience: "admin-panel"
        rbac:
          enabled: true
          requiredRoles: ["admin"]
      rateLimit:
        enabled: true
        limit: 20
        window: 60
      ipFilter:
        enabled: true
        allowList: ["10.0.1.0/24"]  # Admin subnet only
```

## Security Checklist

Use this checklist to ensure your Japa Gateway deployment is secure:

- [ ] HTTPS is enabled with valid certificates
- [ ] Authentication is configured for all non-public endpoints
- [ ] Rate limiting is applied to prevent abuse
- [ ] Security headers are configured
- [ ] Sensitive information is stored in environment variables
- [ ] IP filtering is configured for admin endpoints
- [ ] Request validation is implemented
- [ ] Security logging is enabled
- [ ] Gateway is running with minimal privileges
- [ ] Regular security updates are applied
- [ ] Security testing is conducted regularly

## Next Steps

Now that you understand security best practices, learn about:

- [Monitoring and observability](monitoring.md) to detect security incidents
- [Troubleshooting](troubleshooting.md) common security issues
