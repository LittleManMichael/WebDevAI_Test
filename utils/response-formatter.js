// utils/response-formatter.js

/**
 * Utility for standardizing API response formats
 */
const responseFormatter = {
  /**
   * Format a successful response
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   * @returns {Object} Formatted success response
   */
  success: (data = null, message = 'Operation successful', statusCode = 200) => {
    return {
      success: true,
      message,
      statusCode,
      data,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Format an error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} errors - Detailed error information
   * @returns {Object} Formatted error response
   */
  error: (message = 'An error occurred', statusCode = 500, errors = null) => {
    return {
      success: false,
      message,
      statusCode,
      errors,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Format a paginated response
   * @param {Array} data - Response data array
   * @param {number} total - Total count of items
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @param {string} message - Success message
   * @returns {Object} Formatted paginated response
   */
  paginated: (data = [], total = 0, page = 1, limit = 20, message = 'Data retrieved successfully') => {
    return {
      success: true,
      message,
      statusCode: 200,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Format a validation error response
   * @param {Object} errors - Validation error object
   * @param {string} message - Error message
   * @returns {Object} Formatted validation error response
   */
  validationError: (errors, message = 'Validation failed') => {
    return responseFormatter.error(message, 400, errors);
  },
  
  /**
   * Format a not found response
   * @param {string} message - Not found message
   * @param {string} resource - Resource type that wasn't found
   * @returns {Object} Formatted not found response
   */
  notFound: (message = 'Resource not found', resource = 'item') => {
    return responseFormatter.error(message, 404, { resource });
  },
  
  /**
   * Format an unauthorized response
   * @param {string} message - Unauthorized message
   * @returns {Object} Formatted unauthorized response
   */
  unauthorized: (message = 'Unauthorized access') => {
    return responseFormatter.error(message, 401);
  },
  
  /**
   * Format a forbidden response
   * @param {string} message - Forbidden message
   * @returns {Object} Formatted forbidden response
   */
  forbidden: (message = 'Access forbidden') => {
    return responseFormatter.error(message, 403);
  },
  
  /**
   * Format a server error response
   * @param {string} message - Error message
   * @param {*} error - Error object or details
   * @returns {Object} Formatted server error response
   */
  serverError: (message = 'Internal server error', error = null) => {
    // In production, don't expose sensitive error details
    const errorDetails = process.env.NODE_ENV === 'production' ? null : error;
    return responseFormatter.error(message, 500, errorDetails);
  },
  
  /**
   * Format a simple message response
   * @param {string} message - Response message
   * @param {number} statusCode - HTTP status code
   * @returns {Object} Formatted message response
   */
  message: (message, statusCode = 200) => {
    return {
      success: statusCode >= 200 && statusCode < 300,
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Format a response for created resource
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   * @returns {Object} Formatted created resource response
   */
  created: (data, message = 'Resource created successfully') => {
    return responseFormatter.success(data, message, 201);
  },
  
  /**
   * Apply the appropriate formatter to an Express response
   * @param {Object} res - Express response object
   * @param {Object} formattedResponse - Response from one of the formatter methods
   */
  send: (res, formattedResponse) => {
    res.status(formattedResponse.statusCode).json(formattedResponse);
  }
};

module.exports = responseFormatter;
