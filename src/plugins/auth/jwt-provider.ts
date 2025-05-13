/**
 * JWT Authentication Provider
 * 
 * Provides JWT verification for the authentication plugin.
 * 
 * @module plugins/auth/jwt-provider
 */

import { createVerifier } from 'fast-jwt';
import { logger } from '../observability/logger';

/**
 * JWT verification options
 */
export interface JwtVerifyOptions {
  /**
   * Whether to ignore expiration
   */
  ignoreExpiration?: boolean;
  
  /**
   * Allowed algorithms
   */
  algorithms?: string[];
  
  /**
   * Required issuer
   */
  issuer?: string;
  
  /**
   * Required audience
   */
  audience?: string;
}

/**
 * Verifies a JWT token
 * 
 * @param token - JWT token to verify
 * @param secret - Secret key for verification
 * @param options - Verification options
 * @returns Decoded token payload
 */
export async function verifyJwt(
  token: string,
  secret: string,
  options: JwtVerifyOptions = {}
): Promise<Record<string, any>> {
  try {
    // Create verifier with options
    const verifier = createVerifier({
      key: secret,
      ignoreExpiration: options.ignoreExpiration,
      algorithms: options.algorithms,
      issuer: options.issuer,
      audience: options.audience,
    });
    
    // Verify token
    const payload = verifier(token);
    
    return payload;
  } catch (error) {
    logger.debug('JWT verification failed', { error: error.message });
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

/**
 * Creates a JWT token (for testing purposes)
 * 
 * @param payload - Token payload
 * @param secret - Secret key for signing
 * @param expiresIn - Expiration time in seconds
 * @returns Signed JWT token
 */
export function createJwtForTesting(
  payload: Record<string, any>,
  secret: string,
  expiresIn: number = 3600
): string {
  // This is a simple implementation for testing
  // In production, use a proper JWT library
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresIn;
  
  const tokenPayload = {
    ...payload,
    iat: now,
    exp,
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  
  const signature = createSignature(`${base64Header}.${base64Payload}`, secret);
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Creates a signature for JWT (simplified for testing)
 * 
 * @param data - Data to sign
 * @param secret - Secret key
 * @returns Signature
 */
function createSignature(data: string, secret: string): string {
  // In a real implementation, use a proper HMAC function
  // This is just for testing purposes
  return Buffer.from(`${data}${secret}`).toString('base64url');
}
