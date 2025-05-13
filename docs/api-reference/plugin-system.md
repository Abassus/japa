# Plugin System

Japa Gateway features a modular plugin system that allows for extending functionality and customizing behavior.

## Plugin Architecture

The plugin system is a core part of Japa Gateway's architecture, enabling a modular and extensible design. Plugins can intercept and modify requests and responses at different stages of the request lifecycle.

### Plugin Interface

All plugins implement the `Plugin` interface:

```typescript
interface Plugin {
  name: string;
  initialize(config: Config): Promise<void>;
  preProxy?(context: RequestContext): Promise<void>;
  postProxy?(context: RequestContext): Promise<void>;
}
```

### Plugin Lifecycle

1. **Initialization**: When the gateway starts, each plugin's `initialize()` method is called with the gateway configuration.
2. **Pre-Proxy**: Before a request is forwarded to a backend service, each plugin's `preProxy()` method is called (if implemented).
3. **Post-Proxy**: After receiving a response from a backend service, each plugin's `postProxy()` method is called (if implemented).

## Built-in Plugins

Japa Gateway comes with several built-in plugins:

- **Authentication**: Handles JWT and API key authentication
- **Rate Limiting**: Limits request rates based on client identity
- **CORS**: Manages Cross-Origin Resource Sharing
- **Circuit Breaking**: Prevents cascading failures
- **Observability**: Provides logging, metrics, and tracing

## Creating Custom Plugins

You can create custom plugins to extend Japa Gateway's functionality:

```typescript
// my-custom-plugin.ts
import { Plugin, Config, RequestContext } from 'japa-gateway';

class MyCustomPlugin implements Plugin {
  name = 'my-custom-plugin';
  
  async initialize(config: Config): Promise<void> {
    // Plugin initialization logic
    console.log('My custom plugin initialized');
  }
  
  async preProxy(context: RequestContext): Promise<void> {
    // Pre-proxy logic
    context.request.headers.set('X-Custom-Header', 'custom-value');
  }
  
  async postProxy(context: RequestContext): Promise<void> {
    // Post-proxy logic
    if (context.response) {
      context.response.headers.set('X-Response-Time', context.metrics.responseTime + 'ms');
    }
  }
}

export default new MyCustomPlugin();
```

## Plugin Registration

Register custom plugins in your gateway configuration:

```typescript
// index.ts
import { Gateway } from 'japa-gateway';
import myCustomPlugin from './my-custom-plugin';

const gateway = new Gateway();
gateway.registerPlugin(myCustomPlugin);
gateway.start();
```

## Plugin Configuration

Plugins can be configured globally or per-route:

```yaml
# Global plugin configuration
plugins:
  my-custom-plugin:
    option1: value1
    option2: value2

# Route-specific plugin configuration
routes:
  - path: "/api/*"
    target: "http://backend-service:3000"
    plugins:
      my-custom-plugin:
        option1: override-value
```

## Plugin Execution Order

Plugins are executed in the order they are registered. The built-in plugins are registered in the following order:

1. Authentication
2. Rate Limiting
3. CORS
4. Circuit Breaking
5. Observability

Custom plugins are executed after built-in plugins.

## Plugin Development Best Practices

1. **Error Handling**: Properly handle errors in your plugin to avoid crashing the gateway
2. **Performance**: Keep plugin operations lightweight to minimize latency
3. **Configuration Validation**: Validate plugin configuration during initialization
4. **Documentation**: Document your plugin's functionality and configuration options
5. **Testing**: Write tests for your plugin to ensure it works as expected

## Example: Request Logging Plugin

```typescript
import { Plugin, Config, RequestContext } from 'japa-gateway';

interface LoggingPluginConfig {
  logHeaders?: boolean;
  logBody?: boolean;
}

class LoggingPlugin implements Plugin {
  name = 'logging';
  config: LoggingPluginConfig = {
    logHeaders: false,
    logBody: false
  };
  
  async initialize(config: Config): Promise<void> {
    if (config.plugins?.logging) {
      this.config = {
        ...this.config,
        ...config.plugins.logging
      };
    }
  }
  
  async preProxy(context: RequestContext): Promise<void> {
    console.log(`[${context.id}] ${context.request.method} ${context.request.url}`);
    
    if (this.config.logHeaders) {
      console.log('Headers:', Object.fromEntries(context.request.headers.entries()));
    }
    
    if (this.config.logBody && context.request.body) {
      const body = await context.request.clone().text();
      console.log('Body:', body);
    }
  }
  
  async postProxy(context: RequestContext): Promise<void> {
    if (context.response) {
      console.log(`[${context.id}] Response: ${context.response.status}`);
      
      if (this.config.logHeaders) {
        console.log('Response Headers:', Object.fromEntries(context.response.headers.entries()));
      }
    }
  }
}

export default new LoggingPlugin();
```
