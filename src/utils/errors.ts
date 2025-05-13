/**
 * Error handling utilities
 * 
 * @module utils/errors
 */

/**
 * HTTP error with status code
 */
export class HttpError extends Error {
  /**
   * Creates a new HttpError
   * 
   * @param message - Error message
   * @param statusCode - HTTP status code
   */
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'HttpError';
  }
  
  /**
   * Converts the error to a JSON object
   * 
   * @returns JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      error: {
        message: this.message,
        status: this.statusCode,
      },
    };
  }
  
  /**
   * Creates a response from the error
   * 
   * @returns HTTP response
   */
  toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends HttpError {
  /**
   * Creates a new RateLimitExceededError
   * 
   * @param message - Error message
   * @param limit - Rate limit
   * @param reset - Reset time in seconds
   */
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly limit: number,
    public readonly reset: number
  ) {
    super(message, 429);
    this.name = 'RateLimitExceededError';
  }
  
  /**
   * Converts the error to a JSON object
   * 
   * @returns JSON representation
   */
  override toJSON(): Record<string, any> {
    return {
      error: {
        message: this.message,
        status: this.statusCode,
        limit: this.limit,
        reset: this.reset,
      },
    };
  }
  
  /**
   * Creates a response from the error
   * 
   * @returns HTTP response
   */
  override toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(this.limit),
        'X-RateLimit-Reset': String(this.reset),
        'Retry-After': String(this.reset),
      },
    });
  }
}

/**
 * Circuit breaker open error
 */
export class CircuitBreakerOpenError extends HttpError {
  constructor(message: string = 'Service unavailable') {
    super(message, 503);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends HttpError {
  /**
   * Creates a new ValidationError
   * 
   * @param message - Error message
   * @param errors - Validation errors
   */
  constructor(
    message: string = 'Validation failed',
    public readonly errors: Record<string, string[]> = {}
  ) {
    super(message, 400);
    this.name = 'ValidationError';
  }
  
  /**
   * Converts the error to a JSON object
   * 
   * @returns JSON representation
   */
  override toJSON(): Record<string, any> {
    return {
      error: {
        message: this.message,
        status: this.statusCode,
        errors: this.errors,
      },
    };
  }
}
