// controllers/agent-controller.js
const Agent = require('../models/agent');
const Task = require('../models/task');
const Project = require('../models/project');
const Message = require('../models/message');
const Activity = require('../models/activity');
const { anthropic, openai, models } = require('../config/ai-providers');

/**
 * Agent controller handles CRUD operations and AI interactions for agents
 */
const agentController = {
  /**
   * Get all agents with optional filters
   */
  getAllAgents: async (req, res) => {
    try {
      const query = {};
      
      // Filter by active status if specified
      if (req.query.active === 'true') {
        query.active = true;
      } else if (req.query.active === 'false') {
        query.active = false;
      }
      
      // Filter by role if specified
      if (req.query.role) {
        query.role = req.query.role;
      }
      
      const agents = await Agent.find(query).sort('name');
      
      // Enhance with workload data if detailed flag is set
      if (req.query.detailed === 'true') {
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
          
          agent._doc.activeTasks = activeTasks;
          agent._doc.projectCount = projectCount;
          agent._doc.messageCount = messageCount;
          agent._doc.workload = workload;
        }
      }
      
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get a single agent by ID
   */
  getAgentById: async (req, res) => {
    try {
      const agent = await Agent.findById(req.params.id);
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Create a new agent
   */
  createAgent: async (req, res) => {
    try {
      const agent = new Agent(req.body);
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
      
      // Broadcast events
      req.app.io.emit('agent-created', agent);
      req.app.io.emit('new-activity', activity);
      
      res.status(201).json(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update an existing agent
   */
  updateAgent: async (req, res) => {
    try {
      const agent = await Agent.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
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
      
      // Broadcast events
      req.app.io.emit('agent-updated', agent);
      req.app.io.emit('new-activity', activity);
      
      res.json(agent);
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete an agent
   */
  deleteAgent: async (req, res) => {
    try {
      const agent = await Agent.findById(req.params.id);
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      // Check if agent is assigned to any tasks
      const assignedTasks = await Task.countDocuments({ assignedTo: req.params.id });
      if (assignedTasks > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete agent that is assigned to tasks. Please reassign tasks first.' 
        });
      }
      
      // Check if agent is part of any projects
      const activeProjects = await Project.countDocuments({ 
        agents: req.params.id,
        status: { $ne: 'completed' }
      });
      if (activeProjects > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete agent that is part of active projects. Please remove from projects first.' 
        });
      }
      
      // Delete the agent
      await Agent.findByIdAndDelete(req.params.id);
      
      // Broadcast event
      req.app.io.emit('agent-deleted', { _id: req.params.id });
      
      res.json({ message: 'Agent deleted successfully' });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Test an agent with a sample prompt
   */
  testAgent: async (req, res) => {
    try {
      const agent = await Agent.findById(req.params.id);
      
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      const prompt = req.body.prompt;
      
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      
      // Generate response using the appropriate AI model
      let response;
      
      if (agent.model === 'claude') {
        const result = await anthropic.messages.create({
          model: models.claude,
          max_tokens: 1000,
          system: agent.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });
        response = result.content[0].text;
      } else {
        // Assume GPT model
        const result = await openai.chat.completions.create({
          model: models.gpt,
          messages: [
            { role: 'system', content: agent.systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000
        });
        response = result.choices[0].message.content;
      }
      
      res.json({ response });
    } catch (error) {
      console.error('Error testing agent:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = agentController;
