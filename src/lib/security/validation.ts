/**
 * SECURITY: Input Validation and Sanitization Utilities
 * 
 * This module provides secure input validation and sanitization functions
 * to prevent injection attacks, XSS, and data corruption.
 * 
 * SECURITY REVIEW - All validation functions should be reviewed
 * for completeness and edge cases before production deployment.
 */

/**
 * Sanitizes a string input to prevent XSS and injection attacks
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized string
 */
export function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string {
  if (!input) return '';
  
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input
    .replace(/\0/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '') // This regex now removes all ASCII control characters, including newlines and tabs.
    .trim();
  
  // Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes an email address
 * @param email - Email input
 * @returns Validated email or empty string
 */
export function validateEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const sanitized = sanitizeString(email, 254); // RFC 5321 max email length
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized.toLowerCase();
}

/**
 * Validates and sanitizes a phone number
 * @param phone - Phone input
 * @returns Validated phone or empty string
 */
export function validatePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except + for international format
  const sanitized = phone.replace(/[^\d+]/g, '');
  
  // Basic validation: must start with + or be 10+ digits
  if (!sanitized.match(/^\+?\d{10,15}$/)) {
    throw new Error('Invalid phone number format');
  }
  
  return sanitized;
}

/**
 * Validates a date string (YYYY-MM-DD format)
 * @param dateString - Date input
 * @returns Validated date string or empty string
 */
export function validateDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  const sanitized = sanitizeString(dateString, 10);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(sanitized)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  const date = new Date(sanitized);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  
  // Validate reasonable date range (not in future, not too old)
  const now = new Date();
  const minDate = new Date('1900-01-01');
  
  if (date > now) {
    throw new Error('Date cannot be in the future');
  }
  
  if (date < minDate) {
    throw new Error('Date is too far in the past');
  }
  
  return sanitized;
}

/**
 * Validates a numeric input
 * @param value - Numeric input as string
 * @param min - Minimum value (optional)
 * @param max - Maximum value (optional)
 * @returns Validated number as string
 */
export function validateNumber(
  value: string | null | undefined,
  min?: number,
  max?: number
): string {
  if (!value) return '';
  
  const sanitized = sanitizeString(value, 20);
  const num = parseFloat(sanitized);
  
  if (isNaN(num)) {
    throw new Error('Invalid number format');
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }
  
  return sanitized;
}

/**
 * Validates that a value is one of the allowed options
 * @param value - Input value
 * @param allowedValues - Array of allowed values
 * @returns Validated value
 */
export function validateEnum<T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[]
): T {
  if (!value) {
    throw new Error('Value is required');
  }
  
  const sanitized = sanitizeString(value);
  
  if (!allowedValues.includes(sanitized as T)) {
    throw new Error(`Invalid value. Must be one of: ${allowedValues.join(', ')}`);
  }
  
  return sanitized as T;
}

/**
 * Validates an array of strings
 * @param value - Array input
 * @param maxItems - Maximum number of items (default: 50)
 * @returns Validated array
 */
export function validateStringArray(
  value: string[] | null | undefined,
  maxItems: number = 50
): string[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }
  
  if (value.length > maxItems) {
    throw new Error(`Array cannot contain more than ${maxItems} items`);
  }
  
  return value
    .map(item => sanitizeString(item, 100))
    .filter(item => item.length > 0);
}

/**
 * Sanitizes form data before database storage
 * SECURITY: This prevents injection attacks and ensures data integrity
 * @param formData - Raw form data
 * @returns Sanitized form data
 */
export function sanitizeFormData(formData: Record<string, unknown>): Record<string, string | number | string[]> {
  const sanitized: Record<string, string | number | string[]> = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    if (typeof value === 'string') {
      // Sanitize string values based on field type
      if (key.includes('email')) {
        try {
          sanitized[key] = validateEmail(value);
        } catch {
          sanitized[key] = ''; // Fail secure
        }
      } else if (key.includes('phone')) {
        try {
          sanitized[key] = validatePhone(value);
        } catch {
          sanitized[key] = '';
        }
      } else if (key.includes('date') || key === 'dateOfBirth') {
        try {
          sanitized[key] = validateDate(value);
        } catch {
          sanitized[key] = '';
        }
      } else {
        sanitized[key] = sanitizeString(value);
      }
    } else if (Array.isArray(value)) {
      try {
        sanitized[key] = validateStringArray(value);
      } catch {
        sanitized[key] = [];
      }
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else {
      // For other types, convert to string and sanitize
      sanitized[key] = sanitizeString(String(value));
    }
  }
  
  return sanitized;
}

