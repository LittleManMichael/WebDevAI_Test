// controllers/project-controller.js
const Project = require('../models/project');
const Task = require('../models/task');
const Agent = require('../models/agent');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Activity = require('../models/activity');
const { anthropic, openai, models } = require('../config/ai-providers');

/**
 * Project controller handles CRUD operations and project management
 */
const projectController = {
  /**
   * Get all projects with optional filters
   */
  getAllProjects: async (req, res) => {
    try {
      let query = {};
      
      // Filter by status if specified
      if (req.query.status) {
        if (req.query.status === 'active') {
          query.status = { $in: ['planning', 'in-progress', 'review'] };
        } else {
          query.status = req.query.status;
        }
      }
      
      let projects = await Project.find(query)
        .populate('agents')
        .sort('-createdAt');
      
      // Apply limit if specified
      if (req.query.limit) {
        projects = projects.slice(0, parseInt(req.query.limit));
      }
      
      // Enhance with task data
      for (const project of projects) {
        // Get task counts
        const totalTasks = await Task.countDocuments({ project: project._id });
        const completedTasks = await Task.countDocuments({ 
          project: project._id,
          status: 'completed'
        });
        
        // Add to project data
        project._doc.totalTasks = totalTasks;
        project._doc.completedTasks = completedTasks;
        project._doc.progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
      }
      
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get a single project by ID
   */
  getProjectById: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id)
        .populate('agents')
        .populate('tasks');
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Get task counts
      const totalTasks = await Task.countDocuments({ project: project._id });
      const completedTasks = await Task.countDocuments({ 
        project: project._id,
        status: 'completed'
      });
      
      // Add to project data
      project._doc.totalTasks = totalTasks;
      project._doc.completedTasks = completedTasks;
      project._doc.progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Create a new project
   */
  createProject: async (req, res) => {
    try {
      const project = new Project(req.body);
      await project.save();
      
      // Create initial conversation for the project
      const conversation = new Conversation({
        title: project.name,
        description: `Project discussion for ${project.name}`,
        type: 'project',
        projectId: project._id,
        participants: project.agents
      });
      
      await conversation.save();
      
      // Find the Project Manager agent
      const projectManager = await Agent.findOne({ 
        role: 'Project Manager',
        _id: { $in: project.agents }
      });
      
      if (projectManager) {
        // Create an initial planning task
        const planningTask = new Task({
          title: 'Project Planning',
          description: 'Break down the project requirements and create initial tasks',
          assignedTo: projectManager._id,
          status: 'pending',
          priority: 'high',
          project: project._id
        });
        
        await planningTask.save();
        
        // Add task to project
        project.tasks.push(planningTask._id);
        await project.save();
        
        // Generate initial plan from the Project Manager
        let planResponse;
        
        if (projectManager.model === 'claude') {
          const result = await anthropic.messages.create({
            model: models.claude,
            max_tokens: 2000,
            system: projectManager.systemPrompt,
            messages: [{ 
              role: 'user', 
              content: `New project: ${project.name}\n\nDescription: ${project.description || 'No description provided.'}\n\nRequirements: ${project.requirements || 'No specific requirements provided.'}\n\nPlease create a detailed project plan with tasks for other agents.`
            }]
          });
          planResponse = result.content[0].text;
        } else {
          // Assume GPT model
          const result = await openai.chat.completions.create({
            model: models.gpt,
            messages: [
              { role: 'system', content: projectManager.systemPrompt },
              { 
                role: 'user', 
                content: `New project: ${project.name}\n\nDescription: ${project.description || 'No description provided.'}\n\nRequirements: ${project.requirements || 'No specific requirements provided.'}\n\nPlease create a detailed project plan with tasks for other agents.` 
              }
            ],
            max_tokens: 2000
          });
          planResponse = result.choices[0].message.content;
        }
        
        // Update the planning task with the response
        planningTask.output = planResponse;
        await planningTask.save();
        
        // Create a system message in the conversation
        const systemMessage = new Message({
          conversationId: conversation._id,
          systemMessage: true,
          content: `Project "${project.name}" has been created.`,
          timestamp: new Date()
        });
        await systemMessage.save();
        
        // Create a message from the Project Manager
        const pmMessage = new Message({
          conversationId: conversation._id,
          sender: projectManager._id,
          content: planResponse,
          timestamp: new Date(Date.now() + 2000) // 2 seconds after system message
        });
        await pmMessage.save();
        
        // Create activity for project creation
        const activity = new Activity({
          type: 'project_created',
          title: 'Project Created',
          description: `New project "${project.name}" created`,
          projectId: project._id,
          timestamp: new Date()
        });
        await activity.save();
        
        // Broadcast events
        req.app.io.emit('project-created', project);
        req.app.io.emit('new-conversation', conversation);
        req.app.io.emit('new-message', systemMessage);
        req.app.io.emit('new-message', pmMessage);
        req.app.io.emit('new-activity', activity);
      }
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update an existing project
   */
  updateProject: async (req, res) => {
    try {
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('agents');
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Create activity for project update
      const activity = new Activity({
        type: 'project_updated',
        title: 'Project Updated',
        description: `Project "${project.name}" has been updated`,
        projectId: project._id,
        timestamp: new Date()
      });
      await activity.save();
      
      // Broadcast events
      req.app.io.emit('project-updated', project);
      req.app.io.emit('new-activity', activity);
      
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete a project
   */
  deleteProject: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Delete all tasks associated with the project
      await Task.deleteMany({ project: req.params.id });
      
      // Delete all conversations associated with the project
      const conversations = await Conversation.find({ projectId: req.params.id });
      
      for (const conversation of conversations) {
        // Delete all messages in the conversation
        await Message.deleteMany({ conversationId: conversation._id });
        
        // Delete the conversation
        await Conversation.findByIdAndDelete(conversation._id);
      }
      
      // Delete the project
      await Project.findByIdAndDelete(req.params.id);
      
      // Broadcast event
      req.app.io.emit('project-deleted', { _id: req.params.id });
      
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get tasks for a project
   */
  getProjectTasks: async (req, res) => {
    try {
      const tasks = await Task.find({ project: req.params.id })
        .populate('assignedTo')
        .sort('-priority -createdAt');
      
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get conversations for a project
   */
  getProjectConversations: async (req, res) => {
    try {
      const conversations = await Conversation.find({ projectId: req.params.id })
        .populate('participants')
        .sort('-updatedAt');
      
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching project conversations:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Add an agent to a project
   */
  addAgentToProject: async (req, res) => {
    try {
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ message: 'Agent ID is required' });
      }
      
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if agent is already in the project
      if (project.agents.includes(agentId)) {
        return res.status(400).json({ message: 'Agent is already assigned to this project' });
      }
      
      // Add agent to project
      project.agents.push(agentId);
      await project.save();
      
      // Add agent to project conversations
      const conversations = await Conversation.find({ 
        projectId: req.params.id,
        type: 'project'
      });
      
      for (const conversation of conversations) {
        if (!conversation.participants.includes(agentId)) {
          conversation.participants.push(agentId);
          await conversation.save();
        }
      }
      
      // Create system message in the main project conversation
      if (conversations.length > 0) {
        const mainConversation = conversations[0];
        
        const systemMessage = new Message({
          conversationId: mainConversation._id,
          systemMessage: true,
          content: `${agent.name} has been added to the project.`,
          timestamp: new Date()
        });
        await systemMessage.save();
        
        // Broadcast the message
        req.app.io.emit('new-message', systemMessage);
      }
      
      // Create activity
      const activity = new Activity({
        type: 'project_updated',
        title: 'Agent Added',
        description: `${agent.name} has been added to project "${project.name}"`,
        projectId: project._id,
        agentId: agent._id,
        timestamp: new Date()
      });
      await activity.save();
      
      // Broadcast events
      const updatedProject = await Project.findById(req.params.id).populate('agents');
      req.app.io.emit('project-updated', updatedProject);
      req.app.io.emit('new-activity', activity);
      
      res.json(updatedProject);
    } catch (error) {
      console.error('Error adding agent to project:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Remove an agent from a project
   */
  removeAgentFromProject: async (req, res) => {
    try {
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ message: 'Agent ID is required' });
      }
      
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if agent is in the project
      if (!project.agents.includes(agentId)) {
        return res.status(400).json({ message: 'Agent is not assigned to this project' });
      }
      
      // Check if agent has active tasks in this project
      const activeTasks = await Task.find({
        project: req.params.id,
        assignedTo: agentId,
        status: { $in: ['pending', 'in-progress'] }
      });
      
      if (activeTasks.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot remove agent with active tasks. Please reassign tasks first.',
          tasks: activeTasks
        });
      }
      
      // Remove agent from project
      project.agents = project.agents.filter(id => id.toString() !== agentId);
      await project.save();
      
      // Remove agent from project conversations
      const conversations = await Conversation.find({ 
        projectId: req.params.id,
        type: 'project'
      });
      
      for (const conversation of conversations) {
        conversation.participants = conversation.participants.filter(id => id.toString() !== agentId);
        await conversation.save();
      }
      
      // Create system message in the main project conversation
      if (conversations.length > 0) {
        const mainConversation = conversations[0];
        
        const systemMessage = new Message({
          conversationId: mainConversation._id,
          systemMessage: true,
          content: `${agent.name} has been removed from the project.`,
          timestamp: new Date()
        });
        await systemMessage.save();
        
        // Broadcast the message
        req.app.io.emit('new-message', systemMessage);
      }
      
      // Create activity
      const activity = new Activity({
        type: 'project_updated',
        title: 'Agent Removed',
        description: `${agent.name} has been removed from project "${project.name}"`,
        projectId: project._id,
        timestamp: new Date()
      });
      await activity.save();
      
      // Broadcast events
      const updatedProject = await Project.findById(req.params.id).populate('agents');
      req.app.io.emit('project-updated', updatedProject);
      req.app.io.emit('new-activity', activity);
      
      res.json(updatedProject);
    } catch (error) {
      console.error('Error removing agent from project:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = projectController;
