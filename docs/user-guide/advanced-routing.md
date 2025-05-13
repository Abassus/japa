# Advanced Routing

Japa Gateway provides powerful routing capabilities that go beyond simple path-based routing. This guide explores advanced routing features to help you implement complex traffic management strategies.

## Rule-Based Routing

Rule-based routing allows you to direct traffic based on various conditions like headers, query parameters, or request methods.

### Header-Based Routing

Route requests based on header values:

```yaml
routes:
  - path: "/api/users/*"
    target: "http://user-service-v1:3000"
    rules:
      - target: "http://user-service-v2:3001"
        priority: 10
        conditions:
          - type: "header"
            name: "X-API-Version"
            value: "2"
            operator: "eq"
```

This configuration routes requests with the header `X-API-Version: 2` to the v2 service, while all other requests go to the v1 service.

### Query Parameter Routing

Route based on query parameters:

```yaml
routes:
  - path: "/api/products"
    target: "http://product-service:3000"
    rules:
      - target: "http://premium-product-service:3001"
        priority: 10
        conditions:
          - type: "query"
            name: "tier"
            value: "premium"
            operator: "eq"
```

Requests with `?tier=premium` will be routed to the premium service.

### Method-Based Routing with Rules

Combine HTTP methods with other conditions:

```yaml
routes:
  - path: "/api/content/*"
    target: "http://content-service:3000"
    rules:
      - target: "http://content-admin-service:3001"
        priority: 10
        conditions:
          - type: "method"
            value: "POST|PUT|DELETE"
            operator: "regex"
          - type: "header"
            name: "X-Role"
            value: "admin"
            operator: "eq"
        logic: "and"
```

This routes write operations (POST, PUT, DELETE) with an admin role header to the admin service.

## Complex Condition Groups

You can create complex condition groups using logical operators:

```yaml
routes:
  - path: "/api/data/*"
    target: "http://default-service:3000"
    rules:
      - target: "http://special-service:3001"
        priority: 10
        conditions:
          - type: "group"
            logic: "or"
            conditions:
              - type: "header"
                name: "X-User-Tier"
                value: "premium"
                operator: "eq"
              - type: "group"
                logic: "and"
                conditions:
                  - type: "query"
                    name: "priority"
                    value: "high"
                    operator: "eq"
                  - type: "header"
                    name: "X-Organization"
                    value: "internal"
                    operator: "eq"
```

This routes requests to the special service if either:
- The user tier is premium, OR
- The priority is high AND the organization is internal

## Path Rewriting

Rewrite paths before forwarding to backend services:

```yaml
routes:
  - path: "/api/v1/users/:userId"
    target: "http://user-service:3000/users/:userId"
    pathRewrite:
      pattern: "^/api/v1"
      replacement: ""
```

This strips the `/api/v1` prefix before forwarding the request.

## Content-Based Routing

Route based on request body content (requires body parsing):

```yaml
routes:
  - path: "/api/orders"
    target: "http://regular-order-service:3000"
    plugins:
      bodyParser:
        enabled: true
    rules:
      - target: "http://express-order-service:3001"
        priority: 10
        conditions:
          - type: "body"
            path: "$.shipping.method"
            value: "express"
            operator: "eq"
```

This routes orders with express shipping to a dedicated service.

## Weighted Traffic Distribution

Implement canary releases or A/B testing with weighted distribution:

```yaml
routes:
  - path: "/api/features/*"
    target: "http://stable-service:3000"
    rules:
      - target: "http://beta-service:3001"
        priority: 10
        weight: 0.2  # 20% of traffic goes to beta
```

This sends 20% of traffic to the beta service and 80% to the stable service.

## Regex Path Matching

Use regular expressions for more flexible path matching:

```yaml
routes:
  - path: "^/api/products/[a-z0-9]{8}$"
    pathType: "regex"
    target: "http://product-detail-service:3000"
  
  - path: "^/api/products/search"
    pathType: "regex"
    target: "http://product-search-service:3001"
```

This routes product detail pages and search separately based on regex patterns.

## Host-Based Routing

Route based on the host header for multi-tenant applications:

```yaml
routes:
  - path: "/*"
    target: "http://tenant-a-service:3000"
    rules:
      - target: "http://tenant-b-service:3001"
        priority: 10
        conditions:
          - type: "header"
            name: "Host"
            value: "tenant-b.example.com"
            operator: "eq"
```

## Geo-Based Routing

Route based on the client's geographic location (using headers from a CDN or load balancer):

```yaml
routes:
  - path: "/api/*"
    target: "http://us-service:3000"
    rules:
      - target: "http://eu-service:3001"
        priority: 10
        conditions:
          - type: "header"
            name: "X-Country-Code"
            value: "^(DE|FR|IT|ES)$"
            operator: "regex"
```

## Device-Based Routing

Route based on the client device type:

```yaml
routes:
  - path: "/app/*"
    target: "http://web-app:3000"
    rules:
      - target: "http://mobile-optimized:3001"
        priority: 10
        conditions:
          - type: "header"
            name: "User-Agent"
            value: "Mobile"
            operator: "contains"
```

## Combining Multiple Routing Strategies

You can combine multiple routing strategies for sophisticated traffic management:

```yaml
routes:
  - path: "/api/content/*"
    target: "http://content-service-v1:3000"
    rules:
      # Route beta users to v2
      - target: "http://content-service-v2:3001"
        priority: 30
        conditions:
          - type: "header"
            name: "X-User-Group"
            value: "beta"
            operator: "eq"
      
      # Route mobile EU users to mobile-optimized EU service
      - target: "http://content-service-mobile-eu:3002"
        priority: 20
        conditions:
          - type: "group"
            logic: "and"
            conditions:
              - type: "header"
                name: "User-Agent"
                value: "Mobile"
                operator: "contains"
              - type: "header"
                name: "X-Country-Code"
                value: "^(DE|FR|IT|ES)$"
                operator: "regex"
      
      # Route 10% of remaining traffic to v2 for canary testing
      - target: "http://content-service-v2:3001"
        priority: 10
        weight: 0.1
```

## Best Practices

1. **Use Priorities Wisely**: Higher priority rules are evaluated first
2. **Keep Rules Simple**: Break complex routing into smaller, manageable rules
3. **Test Thoroughly**: Validate your routing configuration with different request scenarios
4. **Monitor Rule Effectiveness**: Track which rules are being triggered and their performance impact
5. **Document Your Routing Logic**: Complex routing can be difficult to understand without documentation

## Next Steps

Now that you understand advanced routing, learn about:

- [Authentication strategies](authentication.md) to secure your APIs
- [Traffic management](traffic-management.md) with rate limiting and circuit breaking
- [Monitoring and observability](monitoring.md) to track your routing effectiveness
