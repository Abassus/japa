# Authentication

Japa Gateway provides robust authentication capabilities to secure your APIs.

## Authentication Methods

Japa Gateway supports the following authentication methods:

- **JWT (JSON Web Tokens)**: Token-based authentication
- **API Key**: Simple key-based authentication
- **None**: No authentication (public endpoints)

## JWT Authentication

JWT authentication verifies JSON Web Tokens provided in the `Authorization` header.

### Configuration

```yaml
plugins:
  auth:
    method: "jwt"
    jwt:
      secret: ${JWT_SECRET:-"your-secret-key"}
      issuer: ${JWT_ISSUER:-"japa-gateway"}
      audience: ${JWT_AUDIENCE:-"japa-clients"}
      expiresIn: ${JWT_EXPIRES_IN:-"1h"}
```

### Usage

Clients should include a JWT in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Structure

The JWT should contain:

- `sub`: Subject (user ID)
- `iss`: Issuer (should match the configured issuer)
- `aud`: Audience (should match the configured audience)
- `exp`: Expiration time
- `iat`: Issued at time

Optional claims:

- `scope`: Space-separated list of permissions
- `roles`: Array of user roles

### Route-Specific Configuration

You can configure authentication per route:

```yaml
routes:
  - path: "/api/public/*"
    target: "http://public-service:3000"
    plugins:
      auth:
        method: "none"
  
  - path: "/api/admin/*"
    target: "http://admin-service:3001"
    plugins:
      auth:
        method: "jwt"
        requiredScopes: ["admin"]
```

## API Key Authentication

API Key authentication verifies a key provided in the `X-API-Key` header.

### Configuration

```yaml
plugins:
  auth:
    method: "api_key"
    apiKey:
      keys: ["key1", "key2"]
      header: "X-API-Key"  # Optional, defaults to X-API-Key
```

### Usage

Clients should include the API key in the specified header:

```
X-API-Key: your-api-key
```

## User Information

When authentication succeeds, Japa Gateway adds user information to the request context, which can be accessed by other plugins or forwarded to backend services.

The user information includes:

- `id`: User ID
- `name`: User name (if available)
- `scope`: User permissions
- `roles`: User roles (if available)

## Forwarding Authentication

Japa Gateway can forward authentication information to backend services in different ways:

### Headers

```yaml
plugins:
  auth:
    method: "jwt"
    forwardAuth: true
    forwardHeaders:
      - "X-User-ID"
      - "X-User-Roles"
```

### JWT Passthrough

```yaml
plugins:
  auth:
    method: "jwt"
    passthrough: true  # Passes the original JWT to the backend
```

## Security Best Practices

1. **Use Environment Variables**: Store secrets in environment variables
2. **Strong Secrets**: Use strong, unique secrets for JWT signing
3. **HTTPS**: Always use HTTPS in production
4. **Token Expiration**: Set reasonable expiration times for tokens
5. **Required Scopes**: Specify required scopes for sensitive endpoints
