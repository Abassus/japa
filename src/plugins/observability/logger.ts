/**
 * Logger Utility
 * 
 * Provides structured logging for the Japa Gateway.
 * 
 * @module plugins/observability/logger
 */

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log format enum
 */
export enum LogFormat {
  JSON = 'json',
  PRETTY = 'pretty',
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level
   */
  level: LogLevel;
  
  /**
   * Log format
   */
  format: LogFormat;
  
  /**
   * Whether to include timestamps
   */
  timestamps?: boolean;
  
  /**
   * Whether to include request IDs
   */
  requestId?: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  format: LogFormat.JSON,
  timestamps: true,
  requestId: true,
};

/**
 * Log entry interface
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Logger class
 */
class Logger {
  private config: LoggerConfig = DEFAULT_CONFIG;
  
  /**
   * Configures the logger
   * 
   * @param config - Logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Logs a debug message
   * 
   * @param message - Log message
   * @param data - Additional data
   */
  debug(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Logs an info message
   * 
   * @param message - Log message
   * @param data - Additional data
   */
  info(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Logs a warning message
   * 
   * @param message - Log message
   * @param data - Additional data
   */
  warn(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Logs an error message
   * 
   * @param message - Log message
   * @param data - Additional data
   */
  error(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * Logs a message with the specified level
   * 
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data
   */
  private log(level: LogLevel, message: string, data: Record<string, any> = {}): void {
    // Check if level is enabled
    if (!this.isLevelEnabled(level)) {
      return;
    }
    
    // Create log entry
    const entry: LogEntry = {
      level,
      message,
      ...data,
    };
    
    // Add timestamp if enabled
    if (this.config.timestamps) {
      entry.timestamp = new Date().toISOString();
    }
    
    // Add request ID if available and enabled
    if (this.config.requestId && data.requestId) {
      entry.requestId = data.requestId;
    }
    
    // Format and output log
    this.output(entry);
  }
  
  /**
   * Checks if a log level is enabled
   * 
   * @param level - Log level to check
   * @returns Whether the level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex >= configLevelIndex;
  }
  
  /**
   * Outputs a log entry
   * 
   * @param entry - Log entry to output
   */
  private output(entry: LogEntry): void {
    if (this.config.format === LogFormat.JSON) {
      console.log(JSON.stringify(entry));
    } else {
      // Pretty format
      const timestamp = entry.timestamp ? `[${entry.timestamp}]` : '';
      const requestId = entry.requestId ? `[${entry.requestId}]` : '';
      const level = `[${entry.level.toUpperCase()}]`;
      
      // Remove standard fields from data
      const { level: _, message: __, timestamp: ___, requestId: ____, ...data } = entry;
      
      // Format data if present
      const dataStr = Object.keys(data).length > 0
        ? `\n${JSON.stringify(data, null, 2)}`
        : '';
      
      console.log(`${timestamp} ${level} ${requestId} ${entry.message}${dataStr}`);
    }
  }
}

// Export singleton logger instance
export const logger = new Logger();
