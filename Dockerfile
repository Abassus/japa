# Japa Gateway Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the application
RUN bun build ./src/index.ts --target bun --outfile dist/gateway.js

# Production stage
FROM oven/bun:slim

WORKDIR /app

# Create a non-root user to run the application
RUN addgroup --system --gid 1001 gateway && \
    adduser --system --uid 1001 --gid 1001 gateway

# Copy only the built application and necessary files from the builder stage
COPY --from=builder --chown=gateway:gateway /app/dist/gateway.js ./
COPY --from=builder --chown=gateway:gateway /app/config/config.yaml ./config/
COPY --from=builder --chown=gateway:gateway /app/package.json ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production=true

# Set environment variables
ENV NODE_ENV=production
ENV CONFIG_PATH=/app/config/config.yaml

# Expose the default port
EXPOSE 8000

# Switch to non-root user
USER gateway:gateway

# Set health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["bun", "gateway.js"]
