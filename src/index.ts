/**
 * Japa Gateway - Main Entry Point
 * 
 * A cloud-native, high-performance API Gateway built with Bun.
 * 
 * @module japa-gateway
 */

import { Gateway } from './core/gateway';
import { loadConfig } from './core/config';
import { logger } from './plugins/observability/logger';

/**
 * Main entry point for the Japa Gateway
 */
async function main() {
  try {
    // Load configuration
    const config = await loadConfig();
    
    // Initialize the gateway
    const gateway = new Gateway(config);
    
    // Start the gateway
    await gateway.start();
    
    logger.info(`Japa Gateway started on ${config.server.host}:${config.server.port}`);
    
    // Handle graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const;
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await gateway.stop();
        process.exit(0);
      });
    }
  } catch (error) {
    logger.error('Failed to start Japa Gateway', { error });
    process.exit(1);
  }
}

// Run the gateway
main();

// Export public API
export * from './core/gateway';
export * from './core/router';
export * from './core/proxy';
export * from './core/plugin';
export * from './types';
