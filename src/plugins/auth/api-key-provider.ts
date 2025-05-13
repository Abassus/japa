/**
 * API Key Authentication Provider
 * 
 * Provides API key verification for the authentication plugin.
 * 
 * @module plugins/auth/api-key-provider
 */

import { logger } from '../observability/logger';

/**
 * API key user information
 */
export interface ApiKeyUser {
  /**
   * User ID
   */
  id: string;
  
  /**
   * User name
   */
  name: string;
  
  /**
   * User scope or roles
   */
  scope?: string[];
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

// In-memory API key store (for demonstration)
// In production, this would be stored in a database
const apiKeyStore: Map<string, ApiKeyUser> = new Map();

/**
 * Verifies an API key
 * 
 * @param apiKey - API key to verify
 * @param validKeys - List of valid API keys
 * @returns User information if valid, undefined otherwise
 */
export async function verifyApiKey(
  apiKey: string,
  validKeys: string[]
): Promise<ApiKeyUser | undefined> {
  try {
    // Check if API key is in the store
    if (apiKeyStore.has(apiKey)) {
      return apiKeyStore.get(apiKey);
    }
    
    // Check if API key is in the valid keys list
    if (validKeys.includes(apiKey)) {
      // Create a default user for the API key
      const user: ApiKeyUser = {
        id: `user-${apiKey.substring(0, 8)}`,
        name: `API User ${apiKey.substring(0, 8)}`,
        scope: ['api:access'],
      };
      
      // Store for future use
      apiKeyStore.set(apiKey, user);
      
      return user;
    }
    
    // API key is not valid
    return undefined;
  } catch (error) {
    logger.debug('API key verification failed', { error: error.message });
    throw new Error(`API key verification failed: ${error.message}`);
  }
}

/**
 * Registers an API key with user information
 * 
 * @param apiKey - API key to register
 * @param user - User information
 */
export function registerApiKey(apiKey: string, user: ApiKeyUser): void {
  apiKeyStore.set(apiKey, user);
  logger.debug('API key registered', { userId: user.id });
}

/**
 * Revokes an API key
 * 
 * @param apiKey - API key to revoke
 * @returns Whether the key was revoked
 */
export function revokeApiKey(apiKey: string): boolean {
  const result = apiKeyStore.delete(apiKey);
  if (result) {
    logger.debug('API key revoked', { apiKey: apiKey.substring(0, 8) });
  }
  return result;
}

/**
 * Generates a new API key
 * 
 * @returns Generated API key
 */
export function generateApiKey(): string {
  // Generate a random API key
  const key = crypto.randomUUID().replace(/-/g, '');
  return key;
}
