# Development Guide

This guide will help you set up your development environment and contribute to Japa Gateway.

## Prerequisites

- [Bun](https://bun.sh/) 1.0.0 or higher
- Git
- A code editor (VS Code recommended)

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/your-username/japa-gateway.git
cd japa-gateway
```

### Install Dependencies

```bash
bun install
```

### Development Server

Start the development server with hot reloading:

```bash
bun dev
```

## Project Structure

```
japa-gateway/
├── config/             # Configuration files
├── src/
│   ├── core/           # Core gateway functionality
│   ├── plugins/        # Gateway plugins
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Main entry point
├── tests/              # Test files
├── docs/               # Documentation
└── package.json        # Project metadata
```

## Core Components

- **Gateway Engine**: The main gateway server (`src/core/gateway.ts`)
- **Router**: Handles request routing (`src/core/router.ts`)
- **Proxy**: Forwards requests to backend services (`src/core/proxy.ts`)
- **Plugin System**: Manages gateway plugins (`src/core/plugin.ts`)
- **Configuration**: Handles configuration loading (`src/core/config.ts`)

## Plugin Development

Plugins are the primary way to extend Japa Gateway. Each plugin should implement the `Plugin` interface:

```typescript
interface Plugin {
  name: string;
  initialize(config: Config): Promise<void>;
  preProxy?(context: RequestContext): Promise<void>;
  postProxy?(context: RequestContext): Promise<void>;
}
```

### Plugin Lifecycle

1. **Initialization**: `initialize()` is called when the gateway starts
2. **Pre-proxy**: `preProxy()` is called before a request is proxied
3. **Post-proxy**: `postProxy()` is called after a response is received

### Example Plugin

```typescript
import { Plugin, Config, RequestContext } from '../types';

class ExamplePlugin implements Plugin {
  name = 'example';
  
  async initialize(config: Config): Promise<void> {
    console.log('Example plugin initialized');
  }
  
  async preProxy(context: RequestContext): Promise<void> {
    console.log(`Request to ${context.request.url}`);
  }
  
  async postProxy(context: RequestContext): Promise<void> {
    console.log(`Response status: ${context.response?.status}`);
  }
}

export default new ExamplePlugin();
```

## Testing

Japa Gateway uses Bun's built-in test runner. Run tests with:

```bash
bun test
```

### Writing Tests

Tests are located in the `tests/` directory. Each test file should use Bun's test framework:

```typescript
import { describe, it, expect } from 'bun:test';

describe('Example Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Building

Build the project for production:

```bash
bun run build
```

This will create a production-ready build in the `dist/` directory.

## Documentation

Documentation is built with MkDocs. To preview the documentation locally:

```bash
# Install MkDocs and the Material theme
pip install mkdocs mkdocs-material

# Serve the documentation
mkdocs serve
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`bun test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

Japa Gateway uses ESLint and Prettier for code formatting. Format your code with:

```bash
bun run format
```

## Versioning

We use [Semantic Versioning](https://semver.org/). The version is updated in the `package.json` file.
