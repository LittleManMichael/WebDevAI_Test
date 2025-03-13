// controllers/auth-controller.js
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * Authentication controller for user management and authentication
 */
const authController = {
  /**
   * Register a new user
   */
  register: async (req, res) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;
      
      // Input validation
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: 'Username, email, and password are required' 
        });
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Invalid email format' 
        });
      }
      
      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({ 
          message: 'Password must be at least 8 characters long' 
        });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: existingUser.email === email 
            ? 'Email is already registered' 
            : 'Username is already taken' 
        });
      }
      
      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName
      });
      
      await user.save();
      
      // Generate JWT token
      const token = generateToken(user);
      
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
  },
  
  /**
   * Login a user
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Input validation
      if (!email || !password) {
        return res.status(400).json({ 
          message: 'Email and password are required' 
        });
      }
      
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Check if user is active
      if (!user.active) {
        return res.status(403).json({ message: 'Account is inactive. Please contact an administrator.' });
      }
      
      // Verify password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Update last login timestamp
      user.lastLogin = Date.now();
      await user.save();
      
      // Generate token
      const token = generateToken(user);
      
      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Login failed. Please try again.' });
    }
  },
  
  /**
   * Get user profile
   */
  getProfile: async (req, res) => {
    try {
      // req.user is set by the verifyToken middleware
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const user = await User.findById(req.user.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to retrieve profile. Please try again.' });
    }
  },
  
  /**
   * Update user profile
   */
  updateProfile: async (req, res) => {
    try {
      // req.user is set by the verifyToken middleware
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { firstName, lastName, username } = req.body;
      
      // Create update object with only allowed fields
      const updateFields = {};
      if (firstName) updateFields.firstName = firstName;
      if (lastName) updateFields.lastName = lastName;
      if (username) {
        // Check if username is already taken by another user
        const existingUser = await User.findOne({ 
          username, 
          _id: { $ne: req.user.id } 
        });
        
        if (existingUser) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        
        updateFields.username = username;
      }
      
      // Update user
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update profile. Please try again.' });
    }
  },
  
  /**
   * Change user password
   */
  changePassword: async (req, res) => {
    try {
      // req.user is set by the verifyToken middleware
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }
      
      // Find user
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Failed to change password. Please try again.' });
    }
  },
  
  /**
   * Initiate password reset
   */
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        // For security reasons, don't reveal that email doesn't exist
        return res.json({ message: 'If a user with that email exists, a password reset link will be sent' });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      
      // Set token and expiration on user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();
      
      // In a real application, send email with reset link
      // For now, just return the token
      res.json({
        message: 'Password reset initiated. In a production environment, an email would be sent.',
        resetToken // This would normally not be returned in the response
      });
    } catch (error) {
      console.error('Error initiating password reset:', error);
      res.status(500).json({ message: 'Failed to initiate password reset. Please try again.' });
    }
  },
  
  /**
   * Reset password with token
   */
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Reset token and new password are required' });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }
      
      // Find user by reset token and check if token is valid
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
      }
      
      // Update password and clear reset token
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
  },
  
  /**
   * Admin: Get all users (for admin dashboard)
   */
  getAllUsers: async (req, res) => {
    try {
      // Ensure this endpoint is only accessible by admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized access' });
      }
      
      const users = await User.find({}).select('-password');
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users. Please try again.' });
    }
  },
  
  /**
   * Admin: Update user status (activate/deactivate)
   */
  updateUserStatus: async (req, res) => {
    try {
      // Ensure this endpoint is only accessible by admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized access' });
      }
      
      const { userId, active } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      if (typeof active !== 'boolean') {
        return res.status(400).json({ message: 'Active status must be a boolean' });
      }
      
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { active } },
        { new: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        message: `User ${active ? 'activated' : 'deactivated'} successfully`,
        user
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update user status. Please try again.' });
    }
  }
};

module.exports = authController;
