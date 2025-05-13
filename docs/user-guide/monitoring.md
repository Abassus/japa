# Monitoring & Observability

Effective monitoring and observability are essential for maintaining a reliable API gateway. This guide covers how to implement comprehensive monitoring for your Japa Gateway deployment.

## Telemetry Configuration

Japa Gateway provides built-in telemetry features that can be configured in your gateway configuration:

```yaml
telemetry:
  enabled: true
  metrics: true
  tracing: true
  logging:
    level: "info"  # debug, info, warn, error
    format: "json" # json or pretty
```

## Logging

### Log Levels

Configure the appropriate log level based on your environment:

```yaml
telemetry:
  logging:
    level: "${LOG_LEVEL:-info}"  # Use environment variable with fallback
```

- **debug**: Detailed information for debugging
- **info**: General operational information
- **warn**: Warning conditions that should be addressed
- **error**: Error conditions that don't stop the gateway

### Log Formats

Choose a log format that works with your log aggregation system:

```yaml
telemetry:
  logging:
    format: "json"  # Structured JSON logs for machine processing
    # OR
    format: "pretty"  # Human-readable logs for development
```

### Request Logging

Configure detailed request logging:

```yaml
telemetry:
  logging:
    requests:
      enabled: true
      includeHeaders: true
      excludeHeaders: ["Authorization", "Cookie"]  # Don't log sensitive headers
      includeBody: false
```

### Log Sampling

For high-traffic environments, implement log sampling to reduce volume:

```yaml
telemetry:
  logging:
    sampling:
      enabled: true
      rate: 0.1  # Log 10% of requests
```

## Metrics

Japa Gateway collects various metrics that can be exported to monitoring systems.

### Available Metrics

- **Request Rates**: Requests per second
- **Response Times**: Latency percentiles (p50, p90, p99)
- **Status Codes**: Count of responses by status code
- **Circuit Breaker Status**: Open/closed status of circuit breakers
- **Rate Limit Hits**: Count of rate limit hits
- **Backend Service Health**: Health status of backend services

### Prometheus Integration

Configure Prometheus metrics endpoint:

```yaml
telemetry:
  metrics:
    prometheus:
      enabled: true
      path: "/metrics"
      labels:
        environment: "production"
```

### Custom Metrics

Define custom metrics for your specific needs:

```yaml
telemetry:
  metrics:
    custom:
      - name: "business_transactions"
        type: "counter"
        help: "Count of business transactions"
        labelNames: ["transaction_type"]
```

## Distributed Tracing

Distributed tracing helps you understand request flows across services.

### OpenTelemetry Integration

Configure OpenTelemetry tracing:

```yaml
telemetry:
  tracing:
    enabled: true
    exporter: "otlp"
    endpoint: "http://otel-collector:4318"
    serviceName: "japa-gateway"
    sampleRate: 0.1  # Sample 10% of traces
```

### Trace Context Propagation

Ensure trace context is propagated to backend services:

```yaml
telemetry:
  tracing:
    propagation:
      enabled: true
      formats: ["tracecontext", "baggage", "b3"]
```

## Health Checks

Configure health checks to monitor the gateway's health:

```yaml
server:
  healthCheck:
    enabled: true
    path: "/health"
    detailed: true  # Include component-level health information
```

The health check endpoint returns:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "components": {
    "database": "healthy",
    "cache": "healthy",
    "backend_services": {
      "user_service": "healthy",
      "product_service": "degraded"
    }
  }
}
```

## Alerting

Configure alerts for critical conditions:

```yaml
telemetry:
  alerting:
    enabled: true
    endpoints:
      - type: "webhook"
        url: "https://alerts.example.com/webhook"
      - type: "email"
        address: "alerts@example.com"
    rules:
      - name: "high_error_rate"
        condition: "error_rate > 0.05"
        duration: "5m"
        severity: "critical"
      - name: "circuit_breaker_open"
        condition: "circuit_breaker_status == 'open'"
        duration: "1m"
        severity: "warning"
```

## Dashboard Integration

### Grafana Dashboard

Japa Gateway provides a pre-configured Grafana dashboard that you can import:

1. Install Grafana and Prometheus
2. Configure Prometheus to scrape metrics from Japa Gateway
3. Import the Japa Gateway dashboard (ID: 12345) into Grafana

The dashboard includes:
- Request rates and latencies
- Error rates
- Circuit breaker status
- Rate limit hits
- Backend service health

### Custom Dashboards

Create custom dashboards based on your specific monitoring needs:

1. Identify key metrics for your application
2. Create Grafana panels for those metrics
3. Organize panels into logical dashboards
4. Set up appropriate alerting thresholds

## Log Aggregation

Integrate with log aggregation systems:

### ELK Stack (Elasticsearch, Logstash, Kibana)

1. Configure Japa Gateway to output JSON logs
2. Use Filebeat or Fluentd to ship logs to Logstash
3. Process logs in Logstash and store in Elasticsearch
4. Create Kibana dashboards for log visualization

### Cloud-Based Logging

For cloud deployments, integrate with cloud-native logging solutions:

- **AWS**: CloudWatch Logs
- **GCP**: Cloud Logging
- **Azure**: Azure Monitor Logs

## Monitoring in Kubernetes

For Kubernetes deployments, leverage Kubernetes-native monitoring:

1. Use Prometheus Operator for metrics collection
2. Configure ServiceMonitor resources to scrape Japa Gateway metrics
3. Use Loki for log aggregation
4. Create Grafana dashboards for unified monitoring

Example ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: japa-gateway
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: japa-gateway
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
```

## End-to-End Monitoring

Implement synthetic monitoring to test the entire request flow:

```yaml
telemetry:
  synthetic:
    enabled: true
    interval: 60  # Run tests every 60 seconds
    tests:
      - name: "api_health"
        url: "https://api.example.com/health"
        method: "GET"
        expectedStatus: 200
      - name: "user_api"
        url: "https://api.example.com/api/users"
        method: "GET"
        headers:
          Authorization: "Bearer ${TEST_TOKEN}"
        expectedStatus: 200
        responseValidation:
          type: "json"
          expression: "$.users.length > 0"
```

## Monitoring Best Practices

1. **Start Simple**: Begin with basic metrics and expand as needed
2. **Focus on the Four Golden Signals**:
   - Latency: How long does it take to serve requests?
   - Traffic: How many requests is the system handling?
   - Errors: What percentage of requests are failing?
   - Saturation: How "full" is the system?
3. **Implement Alerting Carefully**: Alert on symptoms, not causes
4. **Use Log Levels Appropriately**: Reserve error logs for actual errors
5. **Correlate Logs and Metrics**: Use trace IDs to link logs and metrics
6. **Monitor from the User Perspective**: Include end-to-end tests
7. **Establish Baselines**: Know what "normal" looks like for your system

## Troubleshooting with Monitoring Data

Use monitoring data to troubleshoot issues:

1. **Identify the Scope**: Is it affecting all requests or just some?
2. **Check Recent Changes**: Did the issue start after a deployment?
3. **Look for Patterns**: Are there common factors in failed requests?
4. **Follow the Request Path**: Use distributed tracing to identify where requests are failing
5. **Check Resource Utilization**: Are you hitting resource limits?

## Comprehensive Monitoring Example

Here's a comprehensive monitoring configuration for a production environment:

```yaml
telemetry:
  enabled: true
  
  # Logging configuration
  logging:
    level: "info"
    format: "json"
    requests:
      enabled: true
      includeHeaders: true
      excludeHeaders: ["Authorization", "Cookie"]
    sampling:
      enabled: true
      rate: 0.1
  
  # Metrics configuration
  metrics:
    enabled: true
    prometheus:
      enabled: true
      path: "/metrics"
      labels:
        environment: "production"
        region: "us-west"
    statsd:
      enabled: true
      host: "statsd.monitoring"
      port: 8125
      prefix: "japa.gateway"
  
  # Tracing configuration
  tracing:
    enabled: true
    exporter: "otlp"
    endpoint: "http://otel-collector:4318"
    serviceName: "japa-gateway"
    sampleRate: 0.1
    propagation:
      enabled: true
      formats: ["tracecontext", "baggage", "b3"]
  
  # Health check configuration
  healthCheck:
    enabled: true
    path: "/health"
    detailed: true
    components:
      - name: "backend_services"
        type: "http"
        endpoints:
          - url: "http://user-service:3000/health"
          - url: "http://product-service:3001/health"
      - name: "database"
        type: "custom"
        check: "database.checkConnection"
  
  # Alerting configuration
  alerting:
    enabled: true
    endpoints:
      - type: "webhook"
        url: "https://alerts.example.com/webhook"
      - type: "slack"
        url: "https://hooks.slack.com/services/XXX/YYY/ZZZ"
        channel: "#gateway-alerts"
    rules:
      - name: "high_error_rate"
        condition: "error_rate > 0.05"
        duration: "5m"
        severity: "critical"
        message: "High error rate detected"
      - name: "high_latency"
        condition: "p95_latency > 500"
        duration: "10m"
        severity: "warning"
        message: "High latency detected"
```

## Next Steps

Now that you understand monitoring and observability, learn about:

- [Troubleshooting](troubleshooting.md) common issues with Japa Gateway
