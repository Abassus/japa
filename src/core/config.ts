/**
 * Configuration Management for Japa Gateway
 * 
 * Handles loading, validating, and accessing configuration from various sources.
 * 
 * @module core/config
 */

import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { z } from 'zod';
import { join } from 'path';
import { logger } from '../plugins/observability/logger';

/**
 * Server configuration schema
 */
const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(8000),
  host: z.string().default('0.0.0.0'),
  timeout: z.number().int().min(0).default(30000),
  trustProxy: z.boolean().default(false),
});

/**
 * Route configuration schema
 */
const RouteConfigSchema = z.object({
  path: z.string(),
  methods: z.array(z.string()).optional(),
  target: z.string().url(),
  plugins: z.record(z.any()).optional(),
});

/**
 * Plugin configuration schema
 */
const PluginConfigSchema = z.record(z.any());

/**
 * Telemetry configuration schema
 */
const TelemetryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  metrics: z.boolean().default(true),
  tracing: z.boolean().default(true),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }).default({}),
});

/**
 * Complete configuration schema
 */
const ConfigSchema = z.object({
  server: ServerConfigSchema.default({}),
  routes: z.array(RouteConfigSchema).default([]),
  plugins: PluginConfigSchema.default({}),
  telemetry: TelemetryConfigSchema.default({}),
});

/**
 * Configuration type
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Config = {
  server: {
    port: 8000,
    host: '0.0.0.0',
    timeout: 30000,
    trustProxy: false,
  },
  routes: [],
  plugins: {},
  telemetry: {
    enabled: true,
    metrics: true,
    tracing: true,
    logging: {
      level: 'info',
      format: 'json',
    },
  },
};

/**
 * Resolves environment variables in configuration strings
 * 
 * @param obj - The object to process
 * @returns The processed object with environment variables resolved
 */
function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\${([^}]+)}/g, (_, varName) => {
      return process.env[varName] || '';
    });
  } else if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  } else if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }
  return obj;
}

/**
 * Loads configuration from file
 * 
 * @param configPath - Path to configuration file
 * @returns Parsed configuration
 */
async function loadConfigFromFile(configPath: string): Promise<Record<string, any>> {
  try {
    const content = await readFile(configPath, 'utf-8');
    const extension = configPath.split('.').pop()?.toLowerCase();
    
    if (extension === 'yaml' || extension === 'yml') {
      return parse(content);
    } else if (extension === 'json') {
      return JSON.parse(content);
    } else {
      throw new Error(`Unsupported configuration file format: ${extension}`);
    }
  } catch (error) {
    logger.warn(`Failed to load configuration from ${configPath}`, { error });
    return {};
  }
}

/**
 * Loads and validates configuration
 * 
 * @returns Validated configuration
 */
export async function loadConfig(): Promise<Config> {
  try {
    // Determine config path
    const configPath = process.env.CONFIG_PATH || join(process.cwd(), 'config', 'config.yaml');
    
    // Load config from file
    const fileConfig = await loadConfigFromFile(configPath);
    
    // Merge with environment variables and defaults
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...fileConfig,
    };
    
    // Resolve environment variables
    const resolvedConfig = resolveEnvVars(mergedConfig);
    
    // Validate configuration
    const validatedConfig = ConfigSchema.parse(resolvedConfig);
    
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed', { 
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
      });
    } else {
      logger.error('Failed to load configuration', { error });
    }
    
    // Return default config if loading fails
    return DEFAULT_CONFIG;
  }
}
