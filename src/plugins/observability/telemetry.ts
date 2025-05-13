/**
 * Telemetry Module
 * 
 * Provides metrics, tracing, and observability for the Japa Gateway.
 * 
 * @module plugins/observability/telemetry
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logger } from './logger';

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /**
   * Whether telemetry is enabled
   */
  enabled: boolean;
  
  /**
   * Whether metrics collection is enabled
   */
  metrics: boolean;
  
  /**
   * Whether distributed tracing is enabled
   */
  tracing: boolean;
  
  /**
   * Logging configuration
   */
  logging: {
    /**
     * Log level
     */
    level: string;
    
    /**
     * Log format
     */
    format: string;
  };
}

// OpenTelemetry SDK instance
let sdk: NodeSDK | null = null;

// Metrics registry
const metrics: Record<string, any> = {};

/**
 * Initializes telemetry
 * 
 * @param config - Telemetry configuration
 */
export function initTelemetry(config: TelemetryConfig): void {
  if (!config.enabled) {
    logger.info('Telemetry is disabled');
    return;
  }
  
  try {
    // Configure OpenTelemetry
    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'japa-gateway',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '0.0.0',
      }),
    });
    
    // Start the SDK
    sdk.start();
    
    logger.info('Telemetry initialized', {
      metrics: config.metrics ? 'enabled' : 'disabled',
      tracing: config.tracing ? 'enabled' : 'disabled',
    });
  } catch (error) {
    logger.error('Failed to initialize telemetry', { error });
  }
}

/**
 * Records a metric
 * 
 * @param name - Metric name
 * @param value - Metric value
 * @param tags - Metric tags
 */
export function recordMetric(
  name: string,
  value: number,
  tags: Record<string, string> = {}
): void {
  // Store metric for later retrieval
  const key = `${name}:${JSON.stringify(tags)}`;
  metrics[key] = {
    name,
    value,
    tags,
    timestamp: Date.now(),
  };
  
  // In a real implementation, this would send to a metrics backend
  logger.debug(`Recorded metric: ${name}`, { value, tags });
}

/**
 * Gets all recorded metrics
 * 
 * @returns Recorded metrics
 */
export function getMetrics(): Record<string, any> {
  return { ...metrics };
}

/**
 * Starts a new trace span
 * 
 * @param name - Span name
 * @param context - Trace context
 * @returns Span object
 */
export function startSpan(name: string, context: any = {}): any {
  // In a real implementation, this would create an OpenTelemetry span
  const span = {
    name,
    context,
    startTime: Date.now(),
    end: () => {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      logger.debug(`Ended span: ${name}`, { duration: span.duration });
    },
  };
  
  logger.debug(`Started span: ${name}`);
  return span;
}

/**
 * Shuts down telemetry
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('Telemetry shut down');
    } catch (error) {
      logger.error('Failed to shut down telemetry', { error });
    }
  }
}
