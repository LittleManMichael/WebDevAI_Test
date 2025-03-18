// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Simple secret for local use
const LOCAL_SECRET = 'local-secret-key-ai-agent-workforce';

/**
 * Simplified authentication middleware for local single-user app
 */
const authMiddleware = {
  /**
   * Verify authentication token or auto-authenticate for local use
   * This middleware adds a default user to all requests
   */
  verifyToken: async (req, res, next) => {
    try {
      // Get auth header
      const authHeader = req.headers.authorization;
      
      // Check if token is provided
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract and verify the token
        const token = authHeader.split(' ')[1];
        
        try {
          // Verify token
          const decoded = jwt.verify(token, process.env.JWT_SECRET || LOCAL_SECRET);
          req.user = decoded;
          
          // Find user in database to confirm they exist
          const user = await User.findById(decoded.id).select('-password');
          if (user) {
            req.userDetails = user;
            return next();
          }
        } catch (tokenError) {
          // Token verification failed, but we'll still auto-login for local use
          console.warn('Token verification failed, using default user');
        }
      }
      
      // If no valid token or verification failed, use the default admin user
      // This enables auto-login for local use
      const defaultUser = await User.findOne({ username: 'admin' }).select('-password');
      
      if (defaultUser) {
        // Use existing admin user
        req.user = {
          id: defaultUser._id,
          username: defaultUser.username,
          role: defaultUser.role
        };
        req.userDetails = defaultUser;
        return next();
      } else {
        // No user found - this should not happen in normal operation as the
        // default user should be created during setup, but we'll handle it anyway
        console.error('No default admin user found in database');
        return res.status(500).json({
          message: 'System error: Default user not found. Please run database initialization.'
        });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        message: 'Authentication error. Please restart the application.'
      });
    }
  },
  
  /**
   * Optional authentication middleware
   * For local use, this always authenticates with the default user
   */
  optionalAuth: async (req, res, next) => {
    try {
      // For local use, always authenticate with default user
      const defaultUser = await User.findOne({ username: 'admin' }).select('-password');
      
      if (defaultUser) {
        req.user = {
          id: defaultUser._id,
          username: defaultUser.username,
          role: defaultUser.role
        };
        req.userDetails = defaultUser;
      }
    } catch (error) {
      // Don't stop the request, just continue without user data
      console.warn('Optional auth error:', error.message);
    }
    
    // Continue to the next middleware/controller
    next();
  },

  /**
   * Admin role verification middleware
   * For local use, this is simplified to check if the user has admin role
   * Must be used after verifyToken middleware
   */
  requireAdmin: (req, res, next) => {
    // Check if user exists (should be added by verifyToken)
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.'
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
   * Simplified for local use, but maintained for API consistency
   */
  generateToken: (user) => {
    // Create payload with user data
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      username: user.username
    };
    
    // Sign token with secret key and set expiration
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || LOCAL_SECRET,
      { expiresIn: '30d' } // Long expiration for local use
    );
  }
};

module.exports = authMiddleware;
