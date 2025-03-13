// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Get the JWT secret from environment variable - this should be required in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('WARNING: JWT_SECRET is not set in production environment');
}

// Default secret for development only, should never be used in production
const DEV_SECRET = 'dev-secret-key-change-in-production';

// Set token expiration (configurable via environment variable)
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h';

/**
 * Authentication middleware
 * 
 * Verifies JWT tokens for protected routes
 */
const authMiddleware = {
  /**
   * Verify authentication token
   * This middleware can be used on any route that requires authentication
   */
  verifyToken: async (req, res, next) => {
    try {
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
      
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET || DEV_SECRET);
      
      // Check if token is about to expire (less than 1 hour remaining)
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenExp = decoded.exp;
      
      // Add user data to request
      req.user = decoded;
      
      // Find user in database to make sure they still exist and are active
      const user = await User.findById(decoded.id).select('-password');
      
      // If user doesn't exist or isn't active
      if (!user || !user.active) {
        return res.status(401).json({
          message: 'User account is inactive or has been deleted.'
        });
      }
      
      // Add full user object to request
      req.userDetails = user;
      
      // If token is about to expire, generate a new one
      if (tokenExp - currentTime < 3600) { // Less than 1 hour left
        const newToken = authMiddleware.generateToken(user);
        // Add new token to response headers
        res.setHeader('X-New-Token', newToken);
      }
      
      // Continue to the next middleware/controller
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token has expired. Please login again.'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({
          message: 'Invalid token. Access denied.'
        });
      }
      
      return res.status(500).json({
        message: 'Authentication error. Please try again later.'
      });
    }
  },
  
  /**
   * Optional authentication middleware
   * This middleware can be used on routes that work with or without authentication
   * If a valid token is provided, it adds user data to the request
   * If no token or invalid token is provided, it continues without user data
   */
  optionalAuth: async (req, res, next) => {
    try {
      // Get auth header
      const authHeader = req.headers.authorization;
      
      // If no auth header or wrong format, continue without authentication
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }
      
      // Extract the token
      const token = authHeader.split(' ')[1];
      
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET || DEV_SECRET);
      
      // Add user data to request
      req.user = decoded;
      
      // Find user in database
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.active) {
        req.userDetails = user;
      }
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
      username: user.username
    };
    
    // Sign token with secret key and set expiration
    return jwt.sign(
      payload,
      JWT_SECRET || DEV_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
  },
  
  /**
   * Refresh a user's token
   * Creates a new token with the same user data
   */
  refreshToken: async (oldToken) => {
    try {
      // Verify the old token
      const decoded = jwt.verify(oldToken, JWT_SECRET || DEV_SECRET);
      
      // Find the user in the database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.active) {
        throw new Error('User account is inactive or has been deleted');
      }
      
      // Generate a new token
      return authMiddleware.generateToken(user);
    } catch (error) {
      throw error;
    }
  }
};

module.exports = authMiddleware;
