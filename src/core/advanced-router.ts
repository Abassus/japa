/**
 * Advanced Router Component
 * 
 * Provides enhanced routing capabilities with rule-based routing.
 * 
 * @module core/advanced-router
 */

import type { Config } from './config';
import { Router } from './router';
import { logger } from '../plugins/observability/logger';
import type { 
  Route, 
  RouteConfig, 
  RoutingCondition, 
  RoutingConditionGroup, 
  RoutingRule 
} from '../types';

/**
 * Advanced router class with rule-based routing capabilities
 */
export class AdvancedRouter extends Router {
  /**
   * Creates a new AdvancedRouter instance
   * 
   * @param config - Gateway configuration
   */
  constructor(config: Config) {
    super(config);
  }

  /**
   * Finds a matching route for a request using advanced routing rules
   * 
   * @param request - HTTP request
   * @returns Matching route or undefined
   */
  override findRoute(request: Request): Route | undefined {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    
    // Add more detailed debugging
    console.log(`AdvancedRouter: Finding route for ${method} ${path}`);
    console.log(`AdvancedRouter: Available routes: ${JSON.stringify(this.getRoutes().map(r => ({ path: r.path, methods: r.methods })))}`);
    logger.debug(`Finding route for ${method} ${path}`);
    
    // Get all routes that match the path and method
    const matchingRoutes = this.getRoutes().filter(route => {
      // Check if method matches
      if (!route.methods.includes(method)) {
        logger.debug(`Method ${method} doesn't match route methods ${route.methods.join(', ')} for path ${route.path}`);
        return false;
      }
      
      // Check if path matches
      // For exact path matching
      if (route.path === path) {
        logger.debug(`Path ${path} exactly matches route ${route.path}`);
        return true;
      }
      
      // For wildcard path matching
      if (route.path.endsWith('*')) {
        const prefix = route.path.slice(0, -1);
        if (path.startsWith(prefix)) {
          logger.debug(`Path ${path} matches wildcard pattern ${route.path}`);
          return true;
        }
      }
      
      // Use regex pattern matching as fallback
      const pathMatches = route.pathPattern.test(path);
      logger.debug(`Path ${path} ${pathMatches ? 'matches' : 'does not match'} pattern ${route.pathPattern} for route ${route.path}`);
      return pathMatches;
    });
    
    if (matchingRoutes.length === 0) {
      logger.debug(`No route found for ${method} ${path}`);
      return undefined;
    }
    
    // If there are rules, evaluate them
    for (const route of matchingRoutes) {
      if (route.rules && route.rules.length > 0) {
        // Sort rules by priority (higher priority first)
        const sortedRules = [...route.rules].sort((a, b) => 
          (b.priority || 0) - (a.priority || 0)
        );
        
        // Find the first matching rule
        const matchingRule = sortedRules.find(rule => 
          this.evaluateRoutingConditions(rule.conditions, request)
        );
        
        if (matchingRule) {
          // Create a new route with the rule's target and other properties
          const ruleBasedRoute: Route = {
            ...route,
            target: matchingRule.target,
            pathRewrite: matchingRule.pathRewrite || route.pathRewrite,
            plugins: {
              ...route.plugins,
              ...matchingRule.plugins
            }
          };
          
          logger.debug(`Found rule-based route for ${method} ${path}`, { 
            routePath: route.path, 
            target: matchingRule.target 
          });
          
          return ruleBasedRoute;
        }
      }
    }
    
    // If no rules matched, return the first matching route
    const route = matchingRoutes[0];
    logger.debug(`Found route for ${method} ${path}`, { route: route.path });
    return route;
  }
  
  /**
   * Evaluates routing conditions against a request
   * 
   * @param conditions - Routing conditions or condition group
   * @param request - HTTP request
   * @returns Whether the conditions are met
   */
  private evaluateRoutingConditions(
    conditions: RoutingCondition | RoutingConditionGroup,
    request: Request
  ): boolean {
    // If it's a condition group, evaluate it
    if ('operator' in conditions && 'conditions' in conditions) {
      return this.evaluateConditionGroup(conditions, request);
    }
    
    // Otherwise, evaluate the single condition
    return this.evaluateCondition(conditions as RoutingCondition, request);
  }
  
  /**
   * Evaluates a condition group against a request
   * 
   * @param group - Condition group
   * @param request - HTTP request
   * @returns Whether the condition group is met
   */
  private evaluateConditionGroup(
    group: RoutingConditionGroup,
    request: Request
  ): boolean {
    if (group.operator === 'and') {
      // All conditions must be true
      return group.conditions.every(condition => 
        this.evaluateRoutingConditions(condition, request)
      );
    } else {
      // At least one condition must be true
      return group.conditions.some(condition => 
        this.evaluateRoutingConditions(condition, request)
      );
    }
  }
  
  /**
   * Evaluates a single condition against a request
   * 
   * @param condition - Routing condition
   * @param request - HTTP request
   * @returns Whether the condition is met
   */
  private evaluateCondition(
    condition: RoutingCondition,
    request: Request
  ): boolean {
    const url = new URL(request.url);
    
    switch (condition.type) {
      case 'header':
        return this.evaluateHeaderCondition(condition, request.headers);
        
      case 'cookie':
        return this.evaluateCookieCondition(condition, request.headers.get('cookie') || '');
        
      case 'query':
        return this.evaluateQueryCondition(condition, url.searchParams);
        
      case 'path':
        return this.evaluatePathCondition(condition, url.pathname);
        
      case 'method':
        return this.evaluateMethodCondition(condition, request.method);
        
      case 'ip':
        return this.evaluateIpCondition(condition, request.headers.get('x-forwarded-for') || '127.0.0.1');
        
      case 'time':
        return this.evaluateTimeCondition(condition);
        
      case 'expression':
        return this.evaluateExpressionCondition(condition, request);
        
      case 'body':
        // Body evaluation requires reading the request body, which can only be done once
        // This would need special handling to clone the request or store the body
        logger.warn('Body condition evaluation is not fully implemented yet');
        return true;
        
      default:
        logger.warn(`Unknown condition type: ${(condition as any).type}`);
        return false;
    }
  }
  
  /**
   * Evaluates a header condition
   * 
   * @param condition - Header condition
   * @param headers - Request headers
   * @returns Whether the condition is met
   */
  private evaluateHeaderCondition(
    condition: RoutingCondition,
    headers: Headers
  ): boolean {
    if (!condition.name) {
      return false;
    }
    
    const headerValue = headers.get(condition.name);
    
    if (condition.operator === 'exists') {
      return headerValue !== null;
    }
    
    if (condition.operator === 'not_exists') {
      return headerValue === null;
    }
    
    if (headerValue === null) {
      return false;
    }
    
    return this.compareValues(headerValue, condition.value, condition.operator);
  }
  
  /**
   * Evaluates a cookie condition
   * 
   * @param condition - Cookie condition
   * @param cookieHeader - Cookie header value
   * @returns Whether the condition is met
   */
  private evaluateCookieCondition(
    condition: RoutingCondition,
    cookieHeader: string
  ): boolean {
    if (!condition.name) {
      return false;
    }
    
    const cookies = this.parseCookies(cookieHeader);
    const cookieValue = cookies[condition.name];
    
    if (condition.operator === 'exists') {
      return cookieValue !== undefined;
    }
    
    if (condition.operator === 'not_exists') {
      return cookieValue === undefined;
    }
    
    if (cookieValue === undefined) {
      return false;
    }
    
    return this.compareValues(cookieValue, condition.value, condition.operator);
  }
  
  /**
   * Evaluates a query parameter condition
   * 
   * @param condition - Query condition
   * @param searchParams - URL search parameters
   * @returns Whether the condition is met
   */
  private evaluateQueryCondition(
    condition: RoutingCondition,
    searchParams: URLSearchParams
  ): boolean {
    if (!condition.name) {
      return false;
    }
    
    const paramValue = searchParams.get(condition.name);
    
    if (condition.operator === 'exists') {
      return searchParams.has(condition.name);
    }
    
    if (condition.operator === 'not_exists') {
      return !searchParams.has(condition.name);
    }
    
    if (paramValue === null) {
      return false;
    }
    
    return this.compareValues(paramValue, condition.value, condition.operator);
  }
  
  /**
   * Evaluates a path condition
   * 
   * @param condition - Path condition
   * @param path - Request path
   * @returns Whether the condition is met
   */
  private evaluatePathCondition(
    condition: RoutingCondition,
    path: string
  ): boolean {
    if (condition.operator === 'matches' && condition.pattern) {
      try {
        const regex = new RegExp(condition.pattern);
        return regex.test(path);
      } catch (error) {
        logger.error(`Invalid regex pattern: ${condition.pattern}`, { error });
        return false;
      }
    }
    
    return this.compareValues(path, condition.value, condition.operator);
  }
  
  /**
   * Evaluates a method condition
   * 
   * @param condition - Method condition
   * @param method - Request method
   * @returns Whether the condition is met
   */
  private evaluateMethodCondition(
    condition: RoutingCondition,
    method: string
  ): boolean {
    return this.compareValues(method.toUpperCase(), condition.value, condition.operator);
  }
  
  /**
   * Evaluates an IP address condition
   * 
   * @param condition - IP condition
   * @param ip - Client IP address
   * @returns Whether the condition is met
   */
  private evaluateIpCondition(
    condition: RoutingCondition,
    ip: string
  ): boolean {
    // For now, just do a simple string comparison
    // In a real implementation, we would use CIDR matching
    return this.compareValues(ip, condition.value, condition.operator);
  }
  
  /**
   * Evaluates a time condition
   * 
   * @param condition - Time condition
   * @returns Whether the condition is met
   */
  private evaluateTimeCondition(condition: RoutingCondition): boolean {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // For now, just handle simple time ranges in the format "HH:MM-HH:MM"
    if (condition.value && typeof condition.value === 'string' && condition.value.includes('-')) {
      const [start, end] = condition.value.split('-');
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      
      const currentTime = hour * 60 + minute;
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      return currentTime >= startTime && currentTime <= endTime;
    }
    
    return false;
  }
  
  /**
   * Evaluates a custom expression condition
   * 
   * @param condition - Expression condition
   * @param request - HTTP request
   * @returns Whether the condition is met
   */
  private evaluateExpressionCondition(
    condition: RoutingCondition,
    request: Request
  ): boolean {
    if (!condition.expression) {
      return false;
    }
    
    // In a real implementation, we would use a proper expression evaluator
    // For now, just log a warning and return true
    logger.warn(`Expression evaluation is not fully implemented yet: ${condition.expression}`);
    return true;
  }
  
  /**
   * Compares two values using the specified operator
   * 
   * @param actual - Actual value
   * @param expected - Expected value
   * @param operator - Comparison operator
   * @returns Whether the comparison is true
   */
  private compareValues(
    actual: string | number | boolean,
    expected: string | number | boolean | string[] | undefined,
    operator: string = 'equals'
  ): boolean {
    if (expected === undefined) {
      return false;
    }
    
    // Handle array of expected values
    if (Array.isArray(expected)) {
      switch (operator) {
        case 'equals':
          return expected.includes(String(actual));
        case 'not_equals':
          return !expected.includes(String(actual));
        default:
          return expected.some(value => 
            this.compareValues(actual, value, operator)
          );
      }
    }
    
    // Convert to strings for comparison
    const actualStr = String(actual).toLowerCase();
    const expectedStr = String(expected).toLowerCase();
    
    switch (operator) {
      case 'equals':
        return actualStr === expectedStr;
      case 'not_equals':
        return actualStr !== expectedStr;
      case 'contains':
        return actualStr.includes(expectedStr);
      case 'not_contains':
        return !actualStr.includes(expectedStr);
      case 'starts_with':
        return actualStr.startsWith(expectedStr);
      case 'ends_with':
        return actualStr.endsWith(expectedStr);
      case 'matches':
        try {
          const regex = new RegExp(expectedStr);
          return regex.test(actualStr);
        } catch (error) {
          logger.error(`Invalid regex pattern: ${expectedStr}`, { error });
          return false;
        }
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      default:
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }
  
  /**
   * Parses a cookie header into an object
   * 
   * @param cookieHeader - Cookie header value
   * @returns Object with cookie name-value pairs
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (!cookieHeader) {
      return cookies;
    }
    
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts.shift()?.trim();
      const value = parts.join('=');
      
      if (name) {
        cookies[name] = value;
      }
    });
    
    return cookies;
  }
}
