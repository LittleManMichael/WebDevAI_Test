// middleware/validate.js

/**
 * Validation Middleware
 * 
 * Provides validation for request data
 * This implementation uses a simple approach with customizable validation rules
 */
const validateMiddleware = {
  /**
   * Validate request body against a set of rules
   * @param {Object} rules - Validation rules object
   */
  validateBody: (rules) => {
    return (req, res, next) => {
      // Check if request body exists
      if (!req.body) {
        return res.status(400).json({
          message: 'Request body is required',
          errors: ['Missing request body']
        });
      }
      
      const errors = {};
      
      // Validate each field according to its rules
      Object.keys(rules).forEach(field => {
        const value = req.body[field];
        const fieldRules = rules[field];
        
        // Check required fields
        if (fieldRules.required && (value === undefined || value === null || value === '')) {
          errors[field] = errors[field] || [];
          errors[field].push(`${field} is required`);
        }
        
        // Skip further validation if value is not provided and not required
        if (value === undefined || value === null || value === '') {
          return;
        }
        
        // Validate type
        if (fieldRules.type) {
          const typeValid = validateType(value, fieldRules.type);
          if (!typeValid) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must be of type ${fieldRules.type}`);
          }
        }
        
        // Validate min/max for strings and arrays
        if (fieldRules.min !== undefined && (typeof value === 'string' || Array.isArray(value))) {
          if (value.length < fieldRules.min) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must be at least ${fieldRules.min} characters long`);
          }
        }
        
        if (fieldRules.max !== undefined && (typeof value === 'string' || Array.isArray(value))) {
          if (value.length > fieldRules.max) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must not exceed ${fieldRules.max} characters`);
          }
        }
        
        // Validate min/max for numbers
        if (fieldRules.min !== undefined && typeof value === 'number') {
          if (value < fieldRules.min) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must be at least ${fieldRules.min}`);
          }
        }
        
        if (fieldRules.max !== undefined && typeof value === 'number') {
          if (value > fieldRules.max) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must not exceed ${fieldRules.max}`);
          }
        }
        
        // Validate pattern (regex)
        if (fieldRules.pattern && typeof value === 'string') {
          const regex = new RegExp(fieldRules.pattern);
          if (!regex.test(value)) {
            errors[field] = errors[field] || [];
            errors[field].push(fieldRules.patternMessage || `${field} format is invalid`);
          }
        }
        
        // Validate enum values
        if (fieldRules.enum && Array.isArray(fieldRules.enum)) {
          if (!fieldRules.enum.includes(value)) {
            errors[field] = errors[field] || [];
            errors[field].push(
              `${field} must be one of: ${fieldRules.enum.join(', ')}`
            );
          }
        }
        
        // Custom validation
        if (fieldRules.validate && typeof fieldRules.validate === 'function') {
          try {
            const customValid = fieldRules.validate(value, req.body);
            if (!customValid) {
              errors[field] = errors[field] || [];
              errors[field].push(fieldRules.validateMessage || `${field} is invalid`);
            }
          } catch (error) {
            errors[field] = errors[field] || [];
            errors[field].push(`Validation error: ${error.message}`);
          }
        }
      });
      
      // Return errors if any were found
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          message: 'Validation failed',
          errors
        });
      }
      
      // All validations passed
      next();
    };
  },
  
  /**
   * Validate URL parameters against a set of rules
   * @param {Object} rules - Validation rules object
   */
  validateParams: (rules) => {
    return (req, res, next) => {
      const errors = {};
      
      // Validate each parameter according to its rules
      Object.keys(rules).forEach(param => {
        const value = req.params[param];
        const paramRules = rules[param];
        
        // Check required parameters
        if (paramRules.required && (value === undefined || value === null || value === '')) {
          errors[param] = errors[param] || [];
          errors[param].push(`${param} is required`);
        }
        
        // Skip further validation if value is not provided and not required
        if (value === undefined || value === null || value === '') {
          return;
        }
        
        // Check MongoDB ID format
        if (paramRules.isMongoId) {
          const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
          if (!mongoIdRegex.test(value)) {
            errors[param] = errors[param] || [];
            errors[param].push(`${param} must be a valid ID`);
          }
        }
        
        // Validate pattern (regex)
        if (paramRules.pattern) {
          const regex = new RegExp(paramRules.pattern);
          if (!regex.test(value)) {
            errors[param] = errors[param] || [];
            errors[param].push(paramRules.patternMessage || `${param} format is invalid`);
          }
        }
        
        // Custom validation
        if (paramRules.validate && typeof paramRules.validate === 'function') {
          try {
            const customValid = paramRules.validate(value, req.params);
            if (!customValid) {
              errors[param] = errors[param] || [];
              errors[param].push(paramRules.validateMessage || `${param} is invalid`);
            }
          } catch (error) {
            errors[param] = errors[param] || [];
            errors[param].push(`Validation error: ${error.message}`);
          }
        }
      });
      
      // Return errors if any were found
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          message: 'Validation failed',
          errors
        });
      }
      
      // All validations passed
      next();
    };
  },
  
  /**
   * Validate query parameters against a set of rules
   * @param {Object} rules - Validation rules object
   */
  validateQuery: (rules) => {
    return (req, res, next) => {
      const errors = {};
      
      // Validate each query parameter according to its rules
      Object.keys(rules).forEach(param => {
        const value = req.query[param];
        const paramRules = rules[param];
        
        // Check required parameters
        if (paramRules.required && (value === undefined || value === null || value === '')) {
          errors[param] = errors[param] || [];
          errors[param].push(`${param} is required`);
        }
        
        // Skip further validation if value is not provided and not required
        if (value === undefined || value === null || value === '') {
          return;
        }
        
        // Validate pattern (regex)
        if (paramRules.pattern) {
          const regex = new RegExp(paramRules.pattern);
          if (!regex.test(value)) {
            errors[param] = errors[param] || [];
            errors[param].push(paramRules.patternMessage || `${param} format is invalid`);
          }
        }
        
        // Validate enum values
        if (paramRules.enum && Array.isArray(paramRules.enum)) {
          if (!paramRules.enum.includes(value)) {
            errors[param] = errors[param] || [];
            errors[param].push(
              `${param} must be one of: ${paramRules.enum.join(', ')}`
            );
          }
        }
        
        // Custom validation
        if (paramRules.validate && typeof paramRules.validate === 'function') {
          try {
            const customValid = paramRules.validate(value, req.query);
            if (!customValid) {
              errors[param] = errors[param] || [];
              errors[param].push(paramRules.validateMessage || `${param} is invalid`);
            }
          } catch (error) {
            errors[param] = errors[param] || [];
            errors[param].push(`Validation error: ${error.message}`);
          }
        }
      });
      
      // Return errors if any were found
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          message: 'Validation failed',
          errors
        });
      }
      
      // All validations passed
      next();
    };
  }
};

/**
 * Helper function to validate type of a value
 * @param {*} value - Value to check
 * @param {string} type - Expected type
 * @returns {boolean} Whether the value matches the expected type
 */
function validateType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'date':
      return !isNaN(Date.parse(value));
    default:
      return true; // Unknown type, consider valid
  }
}

module.exports = validateMiddleware;
