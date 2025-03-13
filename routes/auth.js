// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * Authentication routes
 * Base path: /api/auth
 */

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.post('/change-password', verifyToken, authController.changePassword);

// Admin routes
router.get('/users', verifyToken, requireAdmin, authController.getAllUsers);
router.put('/users/:id/status', verifyToken, requireAdmin, authController.updateUserStatus);

module.exports = router;
