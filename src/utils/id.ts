/**
 * ID Generation Utilities
 * 
 * Provides functions for generating unique identifiers.
 * 
 * @module utils/id
 */

/**
 * Generates a unique ID for requests
 * 
 * @returns Unique ID string
 */
export function generateId(): string {
  return crypto.randomUUID();
}
