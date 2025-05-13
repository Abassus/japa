# Installation

This guide will help you install Japa Gateway in various environments.

## Prerequisites

- [Bun](https://bun.sh/) 1.0.0 or higher
- Node.js 18.0.0 or higher (if not using Bun)

## Installation Methods

### Using npm/bun

```bash
# Using bun (recommended)
bun install japa-gateway

# Using npm
npm install japa-gateway
```

### From Source

```bash
# Clone the repository
git clone https://github.com/your-username/japa-gateway.git
cd japa-gateway

# Install dependencies
bun install

# Build the project
bun run build
```

### Using Docker

The easiest way to get started with Japa Gateway is using Docker:

```bash
docker pull japa-gateway/japa-gateway:latest
```

Or build the Docker image yourself:

```bash
git clone https://github.com/your-username/japa-gateway.git
cd japa-gateway
docker build -t japa-gateway .
```

## Verifying Installation

To verify that Japa Gateway is installed correctly, run:

```bash
bun run japa-gateway --version
```

You should see the version number of Japa Gateway printed to the console.

## Next Steps

- [Quick Start Guide](quick-start.md) - Learn how to set up a basic gateway
- [Configuration](configuration.md) - Learn about configuration options
- [Docker Deployment](../deployment/docker.md) - Deploy with Docker
