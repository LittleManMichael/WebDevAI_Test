// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * Authentication routes
 * Base path: /api/auth
 */

// Public routes - no authentication required
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes - require authentication
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.post('/change-password', verifyToken, authController.changePassword);

// Admin routes - require admin privileges
router.get('/users', verifyToken, requireAdmin, authController.getAllUsers);
router.put('/users/:id/status', verifyToken, requireAdmin, authController.updateUserStatus);

// Additional route for token refresh
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Use the refreshToken method from auth middleware
    const refreshToken = require('../middleware/auth').refreshToken;
    const newToken = await refreshToken(token);
    
    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token has expired and cannot be refreshed. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ 
        message: 'Invalid token. Please login again.' 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to refresh token. Please try again.' 
    });
  }
});

module.exports = router;
