# Configuration Schema

This page documents the complete configuration schema for Japa Gateway.

## Top-Level Schema

```typescript
interface Config {
  server: ServerConfig;
  routes: RouteConfig[];
  plugins: PluginConfig;
  telemetry: TelemetryConfig;
}
```

## Server Configuration

```typescript
interface ServerConfig {
  port: number;          // Port to listen on (default: 8000)
  host: string;          // Host to bind to (default: "0.0.0.0")
  timeout: number;       // Request timeout in milliseconds (default: 30000)
  trustProxy: boolean;   // Whether to trust proxy headers (default: false)
}
```

## Route Configuration

```typescript
interface RouteConfig {
  path: string;                  // Path pattern to match
  methods?: string[];            // HTTP methods to match (optional)
  target: string;                // Target service URL
  pathPattern?: RegExp;          // Compiled path pattern (internal use)
  plugins?: RoutePluginConfig;   // Route-specific plugin configuration
  rules?: RouteRule[];           // Advanced routing rules (optional)
}

interface RouteRule {
  target: string;                // Target service URL for this rule
  priority: number;              // Rule priority (higher values take precedence)
  conditions: RuleCondition[];   // Conditions for this rule
  plugins?: RoutePluginConfig;   // Rule-specific plugin configuration
}

interface RuleCondition {
  type: 'header' | 'query' | 'path' | 'method' | 'group';
  name?: string;                 // Header/query parameter name
  value?: string | RegExp;       // Value to match
  operator?: 'eq' | 'neq' | 'regex' | 'contains';
  conditions?: RuleCondition[];  // For 'group' type
  logic?: 'and' | 'or';          // For 'group' type
}
```

## Plugin Configuration

```typescript
interface PluginConfig {
  auth?: AuthPluginConfig;
  rateLimit?: RateLimitPluginConfig;
  cors?: CorsPluginConfig;
  circuitBreaker?: CircuitBreakerPluginConfig;
  [key: string]: any;            // Other plugin configurations
}
```

### Authentication Plugin

```typescript
interface AuthPluginConfig {
  method: 'none' | 'jwt' | 'api_key';
  jwt?: JwtConfig;
  apiKey?: ApiKeyConfig;
  forwardAuth?: boolean;
  forwardHeaders?: string[];
  passthrough?: boolean;
}

interface JwtConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string;
}

interface ApiKeyConfig {
  keys: string[];
  header?: string;
}
```

### Rate Limiting Plugin

```typescript
interface RateLimitPluginConfig {
  enabled: boolean;
  limit: number;
  window: number;
  keyGenerator?: 'ip' | 'header' | 'custom';
  keyHeader?: string;
  skipMethods?: string[];
  statusCode?: number;
  message?: string;
}
```

### CORS Plugin

```typescript
interface CorsPluginConfig {
  enabled: boolean;
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
  handlePreflight: boolean;
}
```

### Circuit Breaker Plugin

```typescript
interface CircuitBreakerPluginConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests?: number;
  failureStatusCodes?: number[];
  fallbackResponse?: {
    statusCode: number;
    body: any;
  };
}
```

## Telemetry Configuration

```typescript
interface TelemetryConfig {
  enabled: boolean;
  metrics: boolean;
  tracing: boolean;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
  };
}
```

## Complete YAML Example

```yaml
server:
  port: 8000
  host: "0.0.0.0"
  timeout: 30000
  trustProxy: false

routes:
  - path: "/api/users/*"
    methods: ["GET", "POST", "PUT", "DELETE"]
    target: "http://user-service:3000"
    plugins:
      auth:
        method: "jwt"
      rateLimit:
        limit: 100
        window: 60
    rules:
      - target: "http://premium-user-service:3000"
        priority: 10
        conditions:
          - type: "header"
            name: "X-User-Tier"
            value: "premium"
  
  - path: "/api/products/*"
    target: "http://product-service:3001"
    plugins:
      auth:
        method: "none"

plugins:
  auth:
    method: "jwt"
    jwt:
      secret: "your-secret-key"
      issuer: "japa-gateway"
      audience: "japa-clients"
      expiresIn: "1h"
  
  rateLimit:
    enabled: true
    limit: 100
    window: 60
  
  cors:
    enabled: true
    origins: ["*"]
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allowedHeaders: ["Content-Type", "Authorization"]
    exposedHeaders: ["Content-Length"]
    allowCredentials: false
    maxAge: 86400
    handlePreflight: true
  
  circuitBreaker:
    enabled: true
    failureThreshold: 0.5
    resetTimeout: 10000

telemetry:
  enabled: true
  metrics: true
  tracing: true
  logging:
    level: "info"
    format: "json"
```
