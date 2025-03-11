// services/agent-service.js
const Agent = require('../models/agent');
const Task = require('../models/task');
const Project = require('../models/project');
const Message = require('../models/message');
const Activity = require('../models/activity');
const claudeService = require('./claude-service');
const gptService = require('./gpt-service');

/**
 * Service for handling agent-related operations
 */
const agentService = {
  /**
   * Get all agents with optional filtering and enhancement
   * @param {Object} filters - Filter criteria
   * @param {boolean} detailed - Whether to include detailed workload data
   * @returns {Promise<Array>} List of agents
   */
  getAllAgents: async (filters = {}, detailed = false) => {
    try {
      // Build query based on filters
      const query = {};
      
      if (filters.active === true || filters.active === 'true') {
        query.active = true;
      } else if (filters.active === false || filters.active === 'false') {
        query.active = false;
      }
      
      if (filters.role) {
        query.role = filters.role;
      }
      
      if (filters.model) {
        query.model = filters.model;
      }
      
      // Execute query
      const agents = await Agent.find(query).sort('name');
      
      // Enhance with workload data if detailed flag is set
      if (detailed) {
        for (const agent of agents) {
          // Count active tasks
          const activeTasks = await Task.countDocuments({ 
            assignedTo: agent._id,
            status: { $in: ['pending', 'in-progress'] }
          });
          
          // Count projects
          const projectCount = await Project.countDocuments({
            agents: agent._id,
            status: { $ne: 'completed' }
          });
          
          // Count messages sent in the last 24 hours
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          
          const messageCount = await Message.countDocuments({
            sender: agent._id,
            timestamp: { $gte: oneDayAgo }
          });
          
          // Calculate workload percentage
          const workload = Math.min(Math.round((activeTasks * 15) + (messageCount * 0.5) + (projectCount * 10)), 100);
          
          // Add to agent data
          agent._doc.activeTasks = activeTasks;
          agent._doc.projectCount = projectCount;
          agent._doc.messageCount = messageCount;
          agent._doc.workload = workload;
        }
      }
      
      return agents;
    } catch (error) {
      console.error('Error in getAllAgents service:', error);
      throw error;
    }
  },
  
  /**
   * Get a single agent by ID
   * @param {string} agentId - The agent's ID
   * @returns {Promise<Object>} The agent object
   */
  getAgentById: async (agentId) => {
    try {
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        const error = new Error('Agent not found');
        error.statusCode = 404;
        throw error;
      }
      
      return agent;
    } catch (error) {
      console.error(`Error in getAgentById service for ID ${agentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new agent
   * @param {Object} agentData - Data for creating the agent
   * @returns {Promise<Object>} The created agent
   */
  createAgent: async (agentData) => {
    try {
      const agent = new Agent(agentData);
      await agent.save();
      
      // Create activity for agent creation
      const activity = new Activity({
        type: 'agent_created',
        title: 'Agent Created',
        description: `New agent "${agent.name}" has been created`,
        agentId: agent._id,
        timestamp: new Date()
      });
      await activity.save();
      
      return { agent, activity };
    } catch (error) {
      console.error('Error in createAgent service:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing agent
   * @param {string} agentId - The agent's ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} The updated agent
   */
  updateAgent: async (agentId, updateData) => {
    try {
      const agent = await Agent.findByIdAndUpdate(
        agentId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!agent) {
        const error = new Error('Agent not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Create activity for agent update
      const activity = new Activity({
        type: 'agent_updated',
        title: 'Agent Updated',
        description: `Agent "${agent.name}" has been updated`,
        agentId: agent._id,
        timestamp: new Date()
      });
      await activity.save();
      
      return { agent, activity };
    } catch (error) {
      console.error(`Error in updateAgent service for ID ${agentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete an agent
   * @param {string} agentId - The agent's ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteAgent: async (agentId) => {
    try {
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        const error = new Error('Agent not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if agent is assigned to any tasks
      const assignedTasks = await Task.countDocuments({ assignedTo: agentId });
      if (assignedTasks > 0) {
        const error = new Error('Cannot delete agent that is assigned to tasks. Please reassign tasks first.');
        error.statusCode = 400;
        throw error;
      }
      
      // Check if agent is part of any projects
      const activeProjects = await Project.countDocuments({ 
        agents: agentId,
        status: { $ne: 'completed' }
      });
      if (activeProjects > 0) {
        const error = new Error('Cannot delete agent that is part of active projects. Please remove from projects first.');
        error.statusCode = 400;
        throw error;
      }
      
      // Delete the agent
      await Agent.findByIdAndDelete(agentId);
      
      return { message: 'Agent deleted successfully', agentId };
    } catch (error) {
      console.error(`Error in deleteAgent service for ID ${agentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Test an agent with a sample prompt
   * @param {string} agentId - The agent's ID
   * @param {string} prompt - The test prompt
   * @returns {Promise<Object>} The agent's response
   */
  testAgent: async (agentId, prompt) => {
    try {
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        const error = new Error('Agent not found');
        error.statusCode = 404;
        throw error;
      }
      
      if (!prompt) {
        const error = new Error('Prompt is required');
        error.statusCode = 400;
        throw error;
      }
      
      // Generate response using the appropriate AI model
      let response;
      
      if (agent.model === 'claude') {
        response = await claudeService.generateResponse(agent.systemPrompt, prompt);
      } else {
        // Assume GPT model
        response = await gptService.generateResponse(agent.systemPrompt, prompt);
      }
      
      return { response };
    } catch (error) {
      console.error(`Error in testAgent service for ID ${agentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Calculate agent workload
   * @param {string} agentId - The agent's ID
   * @returns {Promise<Object>} Workload statistics
   */
  calculateWorkload: async (agentId) => {
    try {
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        const error = new Error('Agent not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Count active tasks
      const activeTasks = await Task.countDocuments({ 
        assignedTo: agentId,
        status: { $in: ['pending', 'in-progress'] }
      });
      
      // Count projects
      const projectCount = await Project.countDocuments({
        agents: agentId,
        status: { $ne: 'completed' }
      });
      
      // Count messages sent in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const messageCount = await Message.countDocuments({
        sender: agentId,
        timestamp: { $gte: oneDayAgo }
      });
      
      // Calculate workload percentage
      const workload = Math.min(Math.round((activeTasks * 15) + (messageCount * 0.5) + (projectCount * 10)), 100);
      
      return {
        agentId,
        activeTasks,
        projectCount,
        messageCount,
        workload
      };
    } catch (error) {
      console.error(`Error in calculateWorkload service for ID ${agentId}:`, error);
      throw error;
    }
  }
};

module.exports = agentService;
