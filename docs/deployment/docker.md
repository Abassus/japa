# Docker Deployment

This guide explains how to deploy Japa Gateway using Docker in various environments.

## Using the Official Docker Image

Japa Gateway provides an official Docker image that's optimized for production use:

```bash
docker run -p 8000:8000 japa-gateway/japa-gateway:latest
```

## Configuration Methods

### Using Environment Variables

The simplest way to configure Japa Gateway in Docker is through environment variables:

```bash
docker run -p 9000:9000 \
  -e GATEWAY_PORT=9000 \
  -e GATEWAY_HOST=0.0.0.0 \
  -e AUTH_METHOD=jwt \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ENABLED=true \
  -e CORS_ORIGINS="example.com,api.example.com" \
  japa-gateway/japa-gateway:latest
```

### Mounting a Configuration File

You can also mount your own configuration file:

```bash
docker run -p 8000:8000 \
  -v $(pwd)/config.yaml:/app/config/config.yaml \
  japa-gateway/japa-gateway:latest
```

### Using Docker Compose

For more complex setups, Docker Compose provides a cleaner way to define the configuration:

```yaml
# docker-compose.yml
version: '3'
services:
  gateway:
    image: japa-gateway/japa-gateway:latest
    ports:
      - "8000:8000"
    environment:
      - GATEWAY_PORT=8000
      - AUTH_METHOD=jwt
      - JWT_SECRET=your-secret-key
    volumes:
      - ./config/config.yaml:/app/config/config.yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
  
  api-service:
    image: your-api-service:latest
    ports:
      - "3000:3000"
```

Run with:

```bash
docker-compose up -d
```

## Building a Custom Docker Image

You can create a custom Docker image with your specific configuration:

```dockerfile
FROM japa-gateway/japa-gateway:latest

# Add your custom configuration
COPY my-config.yaml /app/config/config.yaml

# Override environment variables if needed
ENV AUTH_METHOD=jwt
ENV JWT_SECRET=your-custom-secret
```

Build and run:

```bash
docker build -t custom-japa-gateway .
docker run -p 8000:8000 custom-japa-gateway
```

## Production Best Practices

For production deployments, consider:

1. **Using Specific Tags**: Always use specific version tags instead of `latest`
2. **Health Checks**: Utilize the built-in health check endpoint
3. **Resource Limits**: Set memory and CPU limits
4. **Persistent Logs**: Configure log volumes or a logging service
5. **Secrets Management**: Use Docker secrets or environment variables from a secure source

Example with resource limits:

```bash
docker run -p 8000:8000 \
  --memory=512m \
  --cpus=0.5 \
  -e JWT_SECRET=your-secret-key \
  japa-gateway/japa-gateway:latest
```

## Troubleshooting

If you encounter issues:

- Check logs: `docker logs <container-id>`
- Verify connectivity: `docker exec <container-id> curl localhost:8000/health`
- Ensure your configuration is correctly mounted or environment variables are set
