/**
 * Common Validation Utilities
 *
 * Reusable validation functions and schemas for input sanitization.
 */

import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Common validation rules
 */
export const commonValidations = {
  // UUID validation
  uuid: (field: string, location: 'param' | 'body' | 'query' = 'param'): ValidationChain => {
    const validator = location === 'param' ? param(field) : location === 'body' ? body(field) : query(field);
    return validator.isUUID().withMessage(`${field} must be a valid UUID`);
  },

  // Email validation
  email: (field: string = 'email'): ValidationChain => {
    return body(field).trim().isEmail().withMessage('Valid email is required').normalizeEmail();
  },

  // Phone validation (basic)
  phone: (field: string = 'phone'): ValidationChain => {
    return body(field)
      .trim()
      .matches(/^[\d+\-() ]{7,20}$/)
      .withMessage('Invalid phone number format');
  },

  // Required string
  requiredString: (field: string, minLength = 1, maxLength = 500): ValidationChain => {
    return body(field)
      .trim()
      .notEmpty()
      .withMessage(`${field} is required`)
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`);
  },

  // Optional string
  optionalString: (field: string, maxLength = 500): ValidationChain => {
    return body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must be at most ${maxLength} characters`);
  },

  // Positive integer
  positiveInt: (field: string): ValidationChain => {
    return body(field)
      .optional()
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`);
  },

  // Boolean
  boolean: (field: string): ValidationChain => {
    return body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`);
  },

  // Status enum
  status: (field: string, allowedValues: string[]): ValidationChain => {
    return body(field)
      .optional()
      .isIn(allowedValues)
      .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`);
  },

  // Date
  date: (field: string): ValidationChain => {
    return body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`);
  },

  // Pagination query params
  pagination: (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('sort').optional().isString().trim().withMessage('sort must be a string'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('order must be asc or desc'),
  ],

  // Search query
  search: (): ValidationChain => {
    return query('search')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('search query must be at most 200 characters')
      // Prevent NoSQL/SQL injection patterns
      .not()
      .matches(/[<>{}$]/)
      .withMessage('search query contains invalid characters');
  },
};

/**
 * Sanitize object - remove undefined/null fields and trim strings
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) sanitized[key] = trimmed;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = sanitizeObject(value);
      if (Object.keys(nested).length > 0) sanitized[key] = nested;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate JSON field doesn't contain dangerous patterns
 */
export function validateJsonField(field: string): ValidationChain {
  return body(field)
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          throw new Error(`${field} must be valid JSON`);
        }
      }
      // Check for potential code injection in JSON
      const jsonStr = JSON.stringify(value);
      if (jsonStr.includes('__proto__') || jsonStr.includes('constructor')) {
        throw new Error(`${field} contains invalid patterns`);
      }
      return true;
    });
}

/**
 * Sanitize HTML to prevent XSS
 * Note: For production, use a proper library like DOMPurify or sanitize-html
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/&(?!amp;|lt;|gt;|quot;|#039;)/g, '&amp;');
}
