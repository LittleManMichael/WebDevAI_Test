// routes/api.js
const express = require('express');
const router = express.Router();

// Import route modules
const agentRoutes = require('./agents');
const projectRoutes = require('./projects');
const taskRoutes = require('./tasks');
const conversationRoutes = require('./conversations');
const messageRoutes = require('./messages');
const settingsRoutes = require('./settings');

// Import controllers for direct routes
const Activity = require('../models/activity');

/**
 * API Routes
 * Base path: /api
 */

// Use modular route handlers
router.use('/agents', agentRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/settings', settingsRoutes);

// Stats route for dashboard
router.get('/stats', async (req, res) => {
  try {
    const Project = require('../models/project');
    const Agent = require('../models/agent');
    const Task = require('../models/task');
    const Message = require('../models/message');
    
    // Get active projects count
    const activeProjects = await Project.countDocuments({ 
      status: { $in: ['planning', 'in-progress', 'review'] } 
    });
    
    // Get active agents count
    const activeAgents = await Agent.countDocuments({ active: true });
    
    // Get completed tasks count
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    
    // Get AI messages count
    const aiMessages = await Message.countDocuments({ 
      sender: { $ne: 'user' },
      systemMessage: { $ne: true }
    });
    
    // Additional stats
    
    // Get monthly project creation count
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const newProjectsThisMonth = await Project.countDocuments({
      createdAt: { $gte: oneMonthAgo }
    });
    
    // Get weekly completed tasks count
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const completedTasksThisWeek = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $gte: oneWeekAgo }
    });
    
    // Get today's message count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messagesCountToday = await Message.countDocuments({
      timestamp: { $gte: today }
    });
    
    const stats = {
      activeProjects,
      activeAgents,
      completedTasks,
      aiMessages,
      newProjectsThisMonth,
      completedTasksThisWeek,
      messagesCountToday
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Activities route
router.get('/activities', async (req, res) => {
  try {
    let query = {};
    
    // Filter by project if specified
    if (req.query.project) {
      query.projectId = req.query.project;
    }
    
    // Filter by agent if specified
    if (req.query.agent) {
      query.agentId = req.query.agent;
    }
    
    // Filter by type if specified
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    // Get activities, sorted by most recent first
    let activities = Activity.find(query).sort('-timestamp');
    
    // Apply limit if specified
    if (req.query.limit) {
      activities = activities.limit(parseInt(req.query.limit));
    }
    
    const results = await activities.exec();
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
