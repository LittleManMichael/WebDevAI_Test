// middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 * 
 * Verifies JWT tokens for protected routes
 * For this initial implementation, we'll use a simple JWT-based approach
 * In a production environment, consider using refresh tokens, token rotation, etc.
 */
const authMiddleware = {
  /**
   * Verify authentication token
   * This middleware can be used on any route that requires authentication
   */
  verifyToken: (req, res, next) => {
    // Get auth header
    const authHeader = req.headers.authorization;
    
    // Check if auth header exists and has the right format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required. Please provide a valid token.'
      });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret-key');
      
      // Add user data to request
      req.user = decoded;
      
      // Continue to the next middleware/controller
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token has expired. Please login again.'
        });
      }
      
      return res.status(403).json({
        message: 'Invalid token. Access denied.'
      });
    }
  },
  
  /**
   * Optional authentication middleware
   * This middleware can be used on routes that work with or without authentication
   * If a valid token is provided, it adds user data to the request
   * If no token or invalid token is provided, it continues without user data
   */
  optionalAuth: (req, res, next) => {
    // Get auth header
    const authHeader = req.headers.authorization;
    
    // If no auth header or wrong format, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret-key');
      
      // Add user data to request
      req.user = decoded;
    } catch (error) {
      // Don't return an error, just continue without user data
      console.warn('Optional auth token invalid:', error.message);
    }
    
    // Continue to the next middleware/controller
    next();
  },

  /**
   * Admin role verification middleware
   * Ensures the authenticated user has admin privileges
   * Must be used after verifyToken middleware
   */
  requireAdmin: (req, res, next) => {
    // Check if user exists (should be added by verifyToken)
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required. Please provide a valid token.'
      });
    }
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin privileges required for this operation.'
      });
    }
    
    // User is authenticated and has admin privileges
    next();
  },
  
  /**
   * Generate JWT token for a user
   * Utility function for login and registration routes
   */
  generateToken: (user) => {
    // Create payload with user data
    // Avoid including sensitive information
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    };
    
    // Sign token with secret key and set expiration
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-default-secret-key',
      { expiresIn: '24h' }  // Token expires in 24 hours
    );
  }
};

module.exports = authMiddleware;
