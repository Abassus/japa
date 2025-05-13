# Authentication Strategies

Securing your APIs is a critical aspect of API gateway management. Japa Gateway provides flexible authentication options to protect your services from unauthorized access.

## Authentication Methods

Japa Gateway supports the following authentication methods:

- **JWT (JSON Web Tokens)**: Token-based authentication with signature verification
- **API Keys**: Simple key-based authentication
- **Passthrough**: Forward authentication headers to backend services
- **None**: No authentication (for public endpoints)

## JWT Authentication

JWT is a popular token-based authentication method that allows for stateless verification of user identity.

### Basic JWT Configuration

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
      issuer: "japa-gateway"
      audience: "japa-clients"
```

### JWT Verification Options

You can configure various JWT verification options:

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
      issuer: "japa-gateway"
      audience: "japa-clients"
      expiresIn: "1h"
      algorithms: ["HS256"]
      clockTolerance: 30  # 30 seconds tolerance for clock skew
```

### Route-Specific JWT Configuration

Apply different JWT configurations to specific routes:

```yaml
routes:
  - path: "/api/public/*"
    target: "http://public-service:3000"
    plugins:
      auth:
        method: "none"  # No authentication for public endpoints
  
  - path: "/api/admin/*"
    target: "http://admin-service:3000"
    plugins:
      auth:
        method: "jwt"
        jwt:
          secret: "${ADMIN_JWT_SECRET}"
          audience: "admin-panel"
```

### JWT with Public/Private Keys

For enhanced security, use public/private key pairs:

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      publicKey: "${JWT_PUBLIC_KEY}"  # Public key for verification
      algorithms: ["RS256"]
```

The public key should be in PEM format and can be provided as an environment variable.

## API Key Authentication

API keys provide a simpler authentication method suitable for service-to-service communication or developer APIs.

### Basic API Key Configuration

```yaml
plugins:
  auth:
    method: "api_key"
    apiKey:
      keys: ["${API_KEY_1}", "${API_KEY_2}"]
      header: "X-API-Key"  # Default is "Authorization"
```

### Multiple API Key Sources

Configure API keys to be accepted from different sources:

```yaml
plugins:
  auth:
    method: "api_key"
    apiKey:
      keys: ["${API_KEY_1}", "${API_KEY_2}"]
      sources:
        - type: "header"
          name: "X-API-Key"
        - type: "query"
          name: "api_key"
```

This allows API keys to be provided either in the `X-API-Key` header or as a query parameter `?api_key=xxx`.

### API Key with Scopes

Implement basic authorization with API key scopes:

```yaml
plugins:
  auth:
    method: "api_key"
    apiKey:
      keys:
        - key: "${READONLY_API_KEY}"
          scopes: ["read"]
        - key: "${READWRITE_API_KEY}"
          scopes: ["read", "write"]
      scopeEnforcement:
        enabled: true
        headerName: "X-Required-Scopes"
```

Backend services can specify required scopes using the `X-Required-Scopes` header.

## Passthrough Authentication

For complex authentication scenarios, you might want to delegate authentication to a backend service:

```yaml
plugins:
  auth:
    method: "passthrough"
    passthrough:
      headers: ["Authorization", "X-User-ID", "X-Role"]
```

This forwards authentication headers to backend services without validation.

## Combining Authentication Methods

Implement multiple authentication methods for different routes:

```yaml
# Global default: JWT authentication
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"

routes:
  # Public endpoints: no authentication
  - path: "/api/public/*"
    target: "http://public-service:3000"
    plugins:
      auth:
        method: "none"
  
  # Internal API: API key authentication
  - path: "/api/internal/*"
    target: "http://internal-service:3000"
    plugins:
      auth:
        method: "api_key"
        apiKey:
          keys: ["${INTERNAL_API_KEY}"]
  
  # Admin API: Stricter JWT configuration
  - path: "/api/admin/*"
    target: "http://admin-service:3000"
    plugins:
      auth:
        method: "jwt"
        jwt:
          secret: "${ADMIN_JWT_SECRET}"
          audience: "admin-panel"
```

## Authentication with User Context

Extract user information from tokens and forward it to backend services:

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
    userContext:
      enabled: true
      extract:
        - from: "token.payload.sub"
          to: "header.X-User-ID"
        - from: "token.payload.roles"
          to: "header.X-User-Roles"
```

This extracts the `sub` claim from the JWT payload and adds it as an `X-User-ID` header to backend requests.

## Custom Authentication Logic

For complex authentication requirements, you can implement a custom authentication plugin:

```typescript
// custom-auth-plugin.ts
import { Plugin, Config, RequestContext } from 'japa-gateway';

class CustomAuthPlugin implements Plugin {
  name = 'custom-auth';
  
  async initialize(config: Config): Promise<void> {
    // Initialize your authentication logic
  }
  
  async preProxy(context: RequestContext): Promise<void> {
    const authHeader = context.request.headers.get('Authorization');
    
    // Implement your custom authentication logic
    if (!authHeader || !this.validateAuth(authHeader)) {
      // Reject unauthorized requests
      context.response = new Response('Unauthorized', { status: 401 });
      return;
    }
    
    // Add user context to forwarded request
    context.request.headers.set('X-User-ID', this.extractUserId(authHeader));
  }
  
  private validateAuth(authHeader: string): boolean {
    // Your custom validation logic
    return true;
  }
  
  private extractUserId(authHeader: string): string {
    // Your custom extraction logic
    return 'user-123';
  }
}

export default new CustomAuthPlugin();
```

## Authentication with External Identity Provider

Integrate with external identity providers like Auth0, Okta, or AWS Cognito:

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      jwksUri: "https://your-tenant.auth0.com/.well-known/jwks.json"
      issuer: "https://your-tenant.auth0.com/"
      audience: "your-api-identifier"
```

This configuration uses JWKS (JSON Web Key Set) to dynamically fetch public keys from your identity provider.

## Security Best Practices

1. **Use Environment Variables**: Never hardcode secrets in your configuration files
2. **Implement Rate Limiting**: Protect authentication endpoints from brute force attacks
3. **Set Appropriate Token Expiration**: Balance security and user experience
4. **Use HTTPS**: Always use HTTPS to protect authentication credentials in transit
5. **Implement Proper Logging**: Log authentication failures for security monitoring
6. **Rotate Keys Regularly**: Change API keys and JWT secrets periodically
7. **Use Strong Algorithms**: Prefer RS256 over HS256 for JWT when possible

## Troubleshooting Authentication

Common authentication issues and solutions:

### JWT Verification Failures

- **Clock Skew**: Set `clockTolerance` to accommodate time differences
- **Algorithm Mismatch**: Ensure the algorithm in the token matches the configured algorithm
- **Expired Tokens**: Check token expiration and implement refresh token flows

### API Key Issues

- **Header Case Sensitivity**: Some clients may send headers with different casing
- **Multiple Keys**: Ensure all valid API keys are included in the configuration

## Next Steps

Now that you've secured your APIs, learn about:

- [Traffic management](traffic-management.md) with rate limiting and circuit breaking
- [Security best practices](security.md) for comprehensive API protection
- [Monitoring and observability](monitoring.md) to track authentication activity
