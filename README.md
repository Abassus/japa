# Japa Gateway

A cloud-native, high-performance API Gateway built with [Bun](https://bun.sh).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.0.0-blue)](https://bun.sh)

## Features

- **High Performance**: Built on Bun's ultra-fast JavaScript runtime
- **Modular Plugin System**: Easily extend functionality with plugins
- **Advanced Routing**: Route requests based on paths, methods, headers, and more
- **Authentication & Authorization**: Multiple auth methods including JWT, OAuth, API keys
- **Rate Limiting**: Protect your services with configurable rate limits
- **Observability**: Comprehensive logging, metrics, and tracing
- **Resilience**: Circuit breaking, retries, and timeouts
- **Caching**: Improve performance with response caching
- **Security**: TLS termination, request validation, CORS handling

## Installation

```bash
# Clone the repository
git clone https://github.com/username/japa-gateway.git
cd japa-gateway

# Install dependencies
bun install
```

## Quick Start

```bash
# Start the gateway
bun start

# Start with hot reloading for development
bun dev
```

## Configuration

Japa Gateway can be configured using YAML or JSON files. Create a `config.yaml` file in the `config` directory:

```yaml
server:
  port: 8000
  host: 0.0.0.0

routes:
  - path: "/api/users"
    methods: ["GET", "POST"]
    target: "http://user-service:3000"
    plugins:
      auth:
        type: "jwt"
        secret: "${JWT_SECRET}"
      rateLimit:
        limit: 100
        window: "1m"
```

## Documentation

For detailed documentation, see the [docs](./docs) directory or visit our [documentation site](https://example.com/docs).

## Architecture

Japa Gateway is built with a modular, plugin-based architecture:

- **Core**: The central engine handling request processing and lifecycle management
- **Plugins**: Modular components that extend the gateway's functionality
- **Router**: Directs requests to the appropriate backend services
- **Proxy**: Handles forwarding requests to backend services

## Development

```bash
# Run tests
bun test

# Run benchmarks
bun bench

# Lint code
bun lint

# Format code
bun format

# Generate API documentation
bun docs
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](./CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgements

- [Bun](https://bun.sh) - The JavaScript runtime powering Japa Gateway
- [OpenTelemetry](https://opentelemetry.io/) - For observability infrastructure
