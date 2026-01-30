/**
 * SECURITY: Secure Error Handling
 * 
 * This module provides secure error handling utilities that prevent
 * information leakage while maintaining useful debugging capabilities.
 * 
 * SECURITY REVIEW - Error messages should be reviewed to ensure
 * they don't expose sensitive system information.
 */

/**
 * Sanitizes error messages for client display
 * Prevents leaking sensitive system information, stack traces, or implementation details
 * @param error - Error object or message
 * @param context - Optional context for logging (not exposed to client)
 * @returns Safe error message for client display
 */
export function getSafeErrorMessage(error: unknown, context?: string): string {
  // Log full error details server-side (not exposed to client)
  if (context) {
    console.error(`[${context}]`, error);
  } else {
    console.error('Error:', error);
  }
  
  // Return generic error messages to prevent information leakage
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network/connection errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    
    // Authentication errors
    if (message.includes('auth') || message.includes('permission') || message.includes('unauthorized')) {
      return 'Authentication required. Please sign in and try again.';
    }
    
    // Validation errors (safe to show)
    if (message.includes('invalid') || message.includes('required') || message.includes('format')) {
      return error.message; // Validation errors are safe to show
    }
    
    // Firebase errors
    if (message.includes('firebase') || message.includes('firestore')) {
      return 'Database error. Please try again later.';
    }
    
    // Default: generic error message
    return 'An error occurred. Please try again.';
  }
  
  // For non-Error types, return generic message
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Wraps async functions with secure error handling
 * @param fn - Async function to wrap
 * @param context - Context for error logging
 * @returns Wrapped function with error handling
 */
export function withSecureErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const safeMessage = getSafeErrorMessage(error, context);
      throw new Error(safeMessage);
    }
  }) as T;
}

/**
 * Creates a safe error response for API endpoints
 * @param error - Error object
 * @param includeDetails - Whether to include error details (default: false in production)
 * @returns Safe error response object
 */
export function createSafeErrorResponse(
  error: unknown,
  includeDetails: boolean = false
): { error: string; details?: string } {
  const safeMessage = getSafeErrorMessage(error);
  
  const response: { error: string; details?: string } = {
    error: safeMessage,
  };
  
  // Only include details in development mode
  if (includeDetails && import.meta.env.DEV && error instanceof Error) {
    response.details = error.message;
  }
  
  return response;
}

