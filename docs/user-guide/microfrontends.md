# Microfrontends with Japa Gateway

Microfrontends extend the microservices architecture to the frontend, allowing teams to develop, test, and deploy frontend components independently. Japa Gateway provides powerful features to support microfrontend architectures, enabling seamless integration of multiple frontend applications.

## What Are Microfrontends?

Microfrontends are an architectural approach where a frontend application is decomposed into smaller, semi-independent applications that can be developed, tested, and deployed by different teams. This approach offers several benefits:

- **Team Autonomy**: Different teams can work on different parts of the UI independently
- **Technology Flexibility**: Teams can choose the best technology for their specific microfrontend
- **Independent Deployment**: Microfrontends can be deployed without affecting the entire application
- **Scalable Development**: Large applications can be built and maintained by multiple teams

## How Japa Gateway Enables Microfrontends

Japa Gateway provides several key features that make it an ideal solution for microfrontend architectures:

1. **Advanced Routing**: Route requests to different microfrontend applications
2. **Header Manipulation**: Add, modify, or remove headers for proper integration
3. **Response Transformation**: Transform responses to ensure compatibility
4. **HTML Rewriting**: Modify HTML content to integrate microfrontends
5. **Asset Handling**: Serve static assets from different sources
6. **Authentication**: Provide consistent authentication across microfrontends

## Microfrontend Integration Patterns

### 1. Path-Based Routing

The simplest approach is to route different paths to different microfrontend applications:

```yaml
routes:
  # Main shell application
  - path: "/"
    target: "http://shell-app:3000"
  
  # Product microfrontend
  - path: "/products/*"
    target: "http://product-app:3001"
  
  # Cart microfrontend
  - path: "/cart/*"
    target: "http://cart-app:3002"
  
  # User account microfrontend
  - path: "/account/*"
    target: "http://account-app:3003"
```

This configuration routes requests to different microfrontend applications based on the URL path.

### 2. Domain-Based Routing

Route based on subdomains or domains:

```yaml
routes:
  # Main application
  - path: "/*"
    target: "http://shell-app:3000"
    rules:
      # Products microfrontend
      - target: "http://product-app:3001"
        priority: 10
        conditions:
          - type: "header"
            name: "Host"
            value: "products.example.com"
            operator: "eq"
      
      # Cart microfrontend
      - target: "http://cart-app:3002"
        priority: 10
        conditions:
          - type: "header"
            name: "Host"
            value: "cart.example.com"
            operator: "eq"
```

### 3. HTML Composition

Japa Gateway can compose HTML from multiple microfrontends using the HTML transformation plugin:

```yaml
routes:
  - path: "/"
    target: "http://shell-app:3000"
    plugins:
      htmlTransform:
        enabled: true
        transforms:
          - selector: "#product-container"
            action: "replace"
            source:
              type: "http"
              url: "http://product-app:3001/fragment"
          - selector: "#cart-container"
            action: "replace"
            source:
              type: "http"
              url: "http://cart-app:3002/fragment"
```

This configuration fetches the main page from the shell application, then replaces specific containers with content from other microfrontends.

## JavaScript Integration

### 1. Module Federation

For webpack-based microfrontends using Module Federation, configure the gateway to handle module requests:

```yaml
routes:
  # Shell application
  - path: "/"
    target: "http://shell-app:3000"
  
  # Product microfrontend remotes
  - path: "/products/remoteEntry.js"
    target: "http://product-app:3001/remoteEntry.js"
  
  # Cart microfrontend remotes
  - path: "/cart/remoteEntry.js"
    target: "http://cart-app:3002/remoteEntry.js"
```

### 2. Web Components

For Web Components-based microfrontends, ensure scripts are properly loaded:

```yaml
routes:
  # Main application
  - path: "/"
    target: "http://shell-app:3000"
  
  # Product web component scripts
  - path: "/components/product-*.js"
    target: "http://product-app:3001/components"
  
  # Cart web component scripts
  - path: "/components/cart-*.js"
    target: "http://cart-app:3002/components"
```

## Shared Authentication

Ensure consistent authentication across microfrontends:

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

This configuration extracts user information from the JWT and adds it as headers to all backend requests, ensuring all microfrontends have access to the same user context.

## Shared Session Management

Maintain consistent session state across microfrontends:

```yaml
plugins:
  session:
    enabled: true
    cookieName: "session-id"
    store:
      type: "redis"
      host: "${REDIS_HOST}"
      port: "${REDIS_PORT}"
    shareContext: true
```

## Asset Optimization

Optimize asset loading for microfrontends:

```yaml
plugins:
  assetOptimization:
    enabled: true
    caching:
      enabled: true
      maxAge: 86400  # 1 day
    compression:
      enabled: true
      level: 6
    bundling:
      enabled: true
      excludePaths: ["/api/*"]
```

## CORS Configuration for Microfrontends

Configure CORS to allow communication between microfrontends:

```yaml
plugins:
  cors:
    enabled: true
    origins: ["https://example.com", "https://*.example.com"]
    methods: ["GET", "POST", "PUT", "DELETE"]
    allowedHeaders: ["Content-Type", "Authorization"]
    exposedHeaders: ["X-Custom-Header"]
    allowCredentials: true
```

## Style Isolation

Ensure CSS styles don't conflict between microfrontends:

```yaml
plugins:
  cssTransform:
    enabled: true
    namespacing:
      enabled: true
      prefixes:
        - path: "/products/*"
          prefix: "product-"
        - path: "/cart/*"
          prefix: "cart-"
```

This configuration adds prefixes to CSS selectors to prevent style conflicts.

## Example: E-commerce Microfrontend Architecture

Here's a complete example of an e-commerce application using microfrontends:

```yaml
server:
  port: 8000
  host: "0.0.0.0"

routes:
  # Shell application (container)
  - path: "/"
    target: "http://shell-app:3000"
    plugins:
      htmlTransform:
        enabled: true
        transforms:
          - selector: "#header-container"
            action: "replace"
            source:
              type: "http"
              url: "http://header-app:3001/fragment"
          - selector: "#footer-container"
            action: "replace"
            source:
              type: "http"
              url: "http://footer-app:3002/fragment"
  
  # Product catalog microfrontend
  - path: "/products/*"
    target: "http://product-app:3003"
  
  # Shopping cart microfrontend
  - path: "/cart/*"
    target: "http://cart-app:3004"
  
  # Checkout microfrontend
  - path: "/checkout/*"
    target: "http://checkout-app:3005"
  
  # User account microfrontend
  - path: "/account/*"
    target: "http://account-app:3006"
  
  # Shared assets
  - path: "/shared/*"
    target: "http://asset-server:3007"
  
  # API Gateway for backend services
  - path: "/api/*"
    target: "http://api-gateway:8001"

plugins:
  # Authentication
  auth:
    method: "jwt"
    jwt:
      secret: "${JWT_SECRET}"
    userContext:
      enabled: true
      extract:
        - from: "token.payload.sub"
          to: "header.X-User-ID"
  
  # CORS
  cors:
    enabled: true
    origins: ["https://example.com"]
    methods: ["GET", "POST", "PUT", "DELETE"]
    allowedHeaders: ["Content-Type", "Authorization"]
    allowCredentials: true
  
  # Asset optimization
  assetOptimization:
    enabled: true
    caching:
      enabled: true
    compression:
      enabled: true
```

## Deployment Strategies

### 1. Single Domain Deployment

All microfrontends are deployed under a single domain with different paths:

```
https://example.com/          # Shell application
https://example.com/products/ # Products microfrontend
https://example.com/cart/     # Cart microfrontend
```

### 2. Subdomain Deployment

Each microfrontend is deployed to its own subdomain:

```
https://www.example.com/      # Shell application
https://products.example.com/ # Products microfrontend
https://cart.example.com/     # Cart microfrontend
```

### 3. Hybrid Deployment

Some microfrontends are integrated into the shell, while others are deployed separately:

```
https://example.com/          # Shell with integrated header/footer
https://example.com/products/ # Products microfrontend
https://account.example.com/  # Account microfrontend on separate subdomain
```

## Monitoring Microfrontends

Configure monitoring to track performance across microfrontends:

```yaml
telemetry:
  enabled: true
  metrics:
    enabled: true
  tracing:
    enabled: true
    serviceName: "microfrontend-gateway"
```

## Best Practices for Microfrontends

1. **Define Clear Boundaries**: Each microfrontend should have a clear, well-defined responsibility
2. **Minimize Shared State**: Limit shared state to reduce coupling between microfrontends
3. **Standardize Communication**: Use well-defined APIs for communication between microfrontends
4. **Consistent User Experience**: Maintain consistent styling and UX patterns across microfrontends
5. **Independent Deployment**: Each microfrontend should be deployable independently
6. **Performance Monitoring**: Monitor performance metrics for each microfrontend
7. **Graceful Degradation**: Design microfrontends to degrade gracefully if one component fails
8. **Documentation**: Document integration points and dependencies between microfrontends

## Challenges and Solutions

### Challenge: Consistent Styling

**Solution**: Implement a shared design system and use CSS-in-JS or CSS Modules for style isolation.

### Challenge: Performance Overhead

**Solution**: Use the gateway's caching and compression features to optimize performance:

```yaml
plugins:
  assetOptimization:
    enabled: true
    caching:
      enabled: true
      maxAge: 86400
    compression:
      enabled: true
```

### Challenge: Authentication and Authorization

**Solution**: Implement consistent authentication at the gateway level and propagate user context to all microfrontends.

### Challenge: Development Environment

**Solution**: Use the gateway in development mode with local microfrontend instances:

```yaml
# development-config.yaml
routes:
  - path: "/"
    target: "http://localhost:3000"  # Local shell app
  
  - path: "/products/*"
    target: "http://localhost:3001"  # Local product app
```

## Next Steps

Now that you understand how to implement microfrontends with Japa Gateway, you can:

- Explore [advanced routing](advanced-routing.md) for more complex routing scenarios
- Learn about [authentication strategies](authentication.md) for securing your microfrontends
- Implement [monitoring and observability](monitoring.md) for your microfrontend architecture
