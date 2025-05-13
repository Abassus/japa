# Kubernetes Deployment

This guide explains how to deploy Japa Gateway on Kubernetes.

## Prerequisites

- Kubernetes cluster
- kubectl configured to communicate with your cluster
- Basic understanding of Kubernetes concepts

## Deployment Options

### Using Helm Chart

The easiest way to deploy Japa Gateway on Kubernetes is using the Helm chart:

```bash
# Add the Japa Gateway Helm repository
helm repo add japa-gateway https://your-username.github.io/japa-gateway/charts
helm repo update

# Install Japa Gateway
helm install japa-gateway japa-gateway/japa-gateway \
  --set gateway.port=8000 \
  --set auth.method=jwt \
  --set auth.jwt.secret=your-secret-key
```

### Using YAML Manifests

Alternatively, you can use YAML manifests for deployment.

#### ConfigMap for Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: japa-gateway-config
data:
  config.yaml: |
    server:
      port: 8000
      host: 0.0.0.0
    routes:
      - path: "/api/users/*"
        target: "http://user-service:3000"
      - path: "/api/products/*"
        target: "http://product-service:3001"
    plugins:
      auth:
        method: "jwt"
      rateLimit:
        enabled: true
        limit: 100
        window: 60
```

#### Secret for Sensitive Data

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: japa-gateway-secrets
type: Opaque
stringData:
  jwt-secret: "your-secret-key"
```

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: japa-gateway
  labels:
    app: japa-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: japa-gateway
  template:
    metadata:
      labels:
        app: japa-gateway
    spec:
      containers:
      - name: japa-gateway
        image: japa-gateway/japa-gateway:latest
        ports:
        - containerPort: 8000
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: japa-gateway-secrets
              key: jwt-secret
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "200m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
      volumes:
      - name: config-volume
        configMap:
          name: japa-gateway-config
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: japa-gateway
spec:
  selector:
    app: japa-gateway
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
```

#### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: japa-gateway-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: japa-gateway
            port:
              number: 80
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-secret
```

## Horizontal Pod Autoscaling

You can set up autoscaling for Japa Gateway based on CPU or memory usage:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: japa-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: japa-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Environment Variables

You can configure Japa Gateway using environment variables in your Kubernetes deployment:

```yaml
env:
- name: GATEWAY_PORT
  value: "8000"
- name: AUTH_METHOD
  value: "jwt"
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: japa-gateway-secrets
      key: jwt-secret
- name: CORS_ENABLED
  value: "true"
- name: CORS_ORIGINS
  value: "example.com,api.example.com"
```

## Production Best Practices

1. **Resource Limits**: Always set resource requests and limits
2. **Health Checks**: Configure liveness and readiness probes
3. **Horizontal Scaling**: Use HPA to scale based on load
4. **Secrets Management**: Store sensitive data in Kubernetes Secrets
5. **Persistent Configuration**: Use ConfigMaps for configuration
6. **Network Policies**: Restrict network access to the gateway
7. **Pod Disruption Budget**: Ensure high availability during updates

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: japa-gateway-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: japa-gateway
```
