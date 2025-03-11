// services/project-service.js
const Project = require('../models/project');
const Task = require('../models/task');
const Agent = require('../models/agent');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Activity = require('../models/activity');
const claudeService = require('./claude-service');
const gptService = require('./gpt-service');

/**
 * Service for handling project-related operations
 */
const projectService = {
  /**
   * Get all projects with optional filtering and enhancement
   * @param {Object} filters - Filter criteria
   * @param {number} limit - Maximum number of projects to return
   * @returns {Promise<Array>} List of projects
   */
  getAllProjects: async (filters = {}, limit = null) => {
    try {
      // Build query based on filters
      const query = {};
      
      if (filters.status) {
        if (filters.status === 'active') {
          query.status = { $in: ['planning', 'in-progress', 'review'] };
        } else {
          query.status = filters.status;
        }
      }
      
      // Find projects with the specified query
      let projectsQuery = Project.find(query)
        .populate('agents')
        .sort('-createdAt');
      
      // Apply limit if specified
      if (limit) {
        projectsQuery = projectsQuery.limit(parseInt(limit));
      }
      
      // Execute query
      const projects = await projectsQuery;
      
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
      
      return projects;
    } catch (error) {
      console.error('Error in getAllProjects service:', error);
      throw error;
    }
  },
  
  /**
   * Get a single project by ID with enhanced data
   * @param {string} projectId - The project's ID
   * @returns {Promise<Object>} The project object with enhanced data
   */
  getProjectById: async (projectId) => {
    try {
      const project = await Project.findById(projectId)
        .populate('agents')
        .populate('tasks');
      
      if (!project) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
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
      
      return project;
    } catch (error) {
      console.error(`Error in getProjectById service for ID ${projectId}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new project with initial setup
   * @param {Object} projectData - Data for creating the project
   * @returns {Promise<Object>} The created project with related entities
   */
  createProject: async (projectData) => {
    try {
      // Create the project
      const project = new Project(projectData);
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
      
      // Initialize collections for return data
      const tasks = [];
      const messages = [];
      let activity = null;
      
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
        tasks.push(planningTask);
        
        // Add task to project
        project.tasks.push(planningTask._id);
        await project.save();
        
        // Generate initial plan from the Project Manager
        let planResponse;
        
        if (projectManager.model === 'claude') {
          planResponse = await claudeService.generateResponse(
            projectManager.systemPrompt,
            `New project: ${project.name}\n\nDescription: ${project.description || 'No description provided.'}\n\nRequirements: ${project.requirements || 'No specific requirements provided.'}\n\nPlease create a detailed project plan with tasks for other agents.`,
            2000
          );
        } else {
          // Assume GPT model
          planResponse = await gptService.generateResponse(
            projectManager.systemPrompt,
            `New project: ${project.name}\n\nDescription: ${project.description || 'No description provided.'}\n\nRequirements: ${project.requirements || 'No specific requirements provided.'}\n\nPlease create a detailed project plan with tasks for other agents.`,
            2000
          );
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
        messages.push(systemMessage);
        
        // Create a message from the Project Manager
        const pmMessage = new Message({
          conversationId: conversation._id,
          sender: projectManager._id,
          content: planResponse,
          timestamp: new Date(Date.now() + 2000) // 2 seconds after system message
        });
        await pmMessage.save();
        messages.push(pmMessage);
        
        // Create activity for project creation
        activity = new Activity({
          type: 'project_created',
          title: 'Project Created',
          description: `New project "${project.name}" created`,
          projectId: project._id,
          timestamp: new Date()
        });
        await activity.save();
      }
      
      return { 
        project, 
        conversation, 
        tasks, 
        messages, 
        activity 
      };
    } catch (error) {
      console.error('Error in createProject service:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing project
   * @param {string} projectId - The project's ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} The updated project
   */
  updateProject: async (projectId, updateData) => {
    try {
      const project = await Project.findByIdAndUpdate(
        projectId,
        updateData,
        { new: true, runValidators: true }
      ).populate('agents');
      
      if (!project) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
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
      
      return { project, activity };
    } catch (error) {
      console.error(`Error in updateProject service for ID ${projectId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a project and all related data
   * @param {string} projectId - The project's ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteProject: async (projectId) => {
    try {
      const project = await Project.findById(projectId);
      
      if (!project) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Delete all tasks associated with the project
      await Task.deleteMany({ project: projectId });
      
      // Delete all conversations associated with the project
      const conversations = await Conversation.find({ projectId });
      
      for (const conversation of conversations) {
        // Delete all messages in the conversation
        await Message.deleteMany({ conversationId: conversation._id });
        
        // Delete the conversation
        await Conversation.findByIdAndDelete(conversation._id);
      }
      
      // Delete activities related to the project
      await Activity.deleteMany({ projectId });
      
      // Delete the project
      await Project.findByIdAndDelete(projectId);
      
      return { 
        message: 'Project deleted successfully', 
        projectId,
        deletedTasks: await Task.countDocuments({ project: projectId }),
        deletedConversations: conversations.length
      };
    } catch (error) {
      console.error(`Error in deleteProject service for ID ${projectId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get tasks for a project
   * @param {string} projectId - The project's ID
   * @returns {Promise<Array>} List of tasks
   */
  getProjectTasks: async (projectId) => {
    try {
      const tasks = await Task.find({ project: projectId })
        .populate('assignedTo')
        .sort('-priority -createdAt');
      
      return tasks;
    } catch (error) {
      console.error(`Error in getProjectTasks service for ID ${projectId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get conversations for a project
   * @param {string} projectId - The project's ID
   * @returns {Promise<Array>} List of conversations
   */
  getProjectConversations: async (projectId) => {
    try {
      const conversations = await Conversation.find({ projectId })
        .populate('participants')
        .sort('-updatedAt');
      
      return conversations;
    } catch (error) {
      console.error(`Error in getProjectConversations service for ID ${projectId}:`, error);
      throw error;
    }
  },
  
  /**
   * Add an agent to a project
   * @param {string} projectId - The project's ID
   * @param {string} agentId - The agent's ID
   * @returns {Promise<Object>} The updated project
   */
  addAgentToProject: async (projectId, agentId) => {
    try {
      // Verify agent exists
      const agent = await Agent.findById(agentId);
      if (!agent) {
        const error = new Error('Agent not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Verify project exists
      const project = await Project.findById(projectId);
      if (!project) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if agent is already in the project
      if (project.agents.includes(agentId)) {
        const error = new Error('Agent is already assigned to this project');
        error.statusCode = 400;
        throw error;
      }
      
      // Add agent to project
      project.agents.push(agentId);
      await project.save();
      
      // Add agent to project conversations
      const conversations = await Conversation.find({ 
        projectId,
        type: 'project'
      });
      
      for (const conversation of conversations) {
        if (!conversation.participants.includes(agentId)) {
          conversation.participants.push(agentId);
          await conversation.save();
        }
      }
      
      // Create system message in the main project conversation
      let systemMessage = null;
      if (conversations.length > 0) {
        const mainConversation = conversations[0];
        
        systemMessage = new Message({
          conversationId: mainConversation._id,
          systemMessage: true,
          content: `${agent.name} has been added to the project.`,
          timestamp: new Date()
        });
        await systemMessage.save();
      }
      
      // Create activity
      const activity = new Activity({
        type: 'project_updated',
        title: 'Agent Added',
        description: `${agent.name} has been added to project "${project.name}"`,
        projectId,
        agentId,
        timestamp: new Date()
      });
      await activity.save();
      
      // Return updated project with populated agents
      const updatedProject = await Project.findById(projectId).populate('agents');
      
      return { 
        project: updatedProject, 
        activity,
        systemMessage
      };
    } catch (error) {
      console.error(`Error in addAgentToProject service for project ${projectId} and agent ${agentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Remove an agent from a project
   * @param {string} projectId - The project's ID
   * @param {string} agentId - The agent's ID
   * @returns {Promise<Object>} The updated project
   */
  removeAgentFromProject: async (projectId, agentId) => {
    try {
      // Verify agent exists
      const agent = await Agent.findById(agentId);
      if (!agent) {
        const error = new Error('Agent not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Verify project exists
      const project = await Project.findById(projectId);
      if (!project) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if agent is in the project
      if (!project.agents.includes(agentId)) {
        const error = new Error('Agent is not assigned to this project');
        error.statusCode = 400;
        throw error;
      }
      
      // Check if agent has active tasks in this project
      const activeTasks = await Task.find({
        project: projectId,
        assignedTo: agentId,
        status: { $in: ['pending', 'in-progress'] }
      });
      
      if (activeTasks.length > 0) {
        const error = new Error('Cannot remove agent with active tasks. Please reassign tasks first.');
        error.statusCode = 400;
        error.data = { tasks: activeTasks };
        throw error;
      }
      
      // Remove agent from project
      project.agents = project.agents.filter(id => id.toString() !== agentId);
      await project.save();
      
      // Remove agent from project conversations
      const conversations = await Conversation.find({ 
        projectId,
        type: 'project'
      });
      
      for (const conversation of conversations) {
        conversation.participants = conversation.participants.filter(id => id.toString() !== agentId);
        await conversation.save();
      }
      
      // Create system message in the main project conversation
      let systemMessage = null;
      if (conversations.length > 0) {
        const mainConversation = conversations[0];
        
        systemMessage = new Message({
          conversationId: mainConversation._id,
          systemMessage: true,
          content: `${agent.name} has been removed from the project.`,
          timestamp: new Date()
        });
        await systemMessage.save();
      }
      
      // Create activity
      const activity = new Activity({
        type: 'project_updated',
        title: 'Agent Removed',
        description: `${agent.name} has been removed from project "${project.name}"`,
        projectId,
        timestamp: new Date()
      });
      await activity.save();
      
      // Return updated project with populated agents
      const updatedProject = await Project.findById(projectId).populate('agents');
      
      return { 
        project: updatedProject, 
        activity,
        systemMessage
      };
    } catch (error) {
      console.error(`Error in removeAgentFromProject service for project ${projectId} and agent ${agentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get project statistics
   * @returns {Promise<Object>} Project statistics
   */
  getProjectStats: async () => {
    try {
      // Count projects by status
      const totalProjects = await Project.countDocuments();
      const planningProjects = await Project.countDocuments({ status: 'planning' });
      const inProgressProjects = await Project.countDocuments({ status: 'in-progress' });
      const reviewProjects = await Project.countDocuments({ status: 'review' });
      const completedProjects = await Project.countDocuments({ status: 'completed' });
      
      // Get recent projects
      const recentProjects = await Project.find()
        .sort('-createdAt')
        .limit(5)
        .select('name status createdAt');
      
      // Get projects with highest activity
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      // Count activities per project in the last week
      const projectActivities = await Activity.aggregate([
        { $match: { 
          timestamp: { $gte: oneWeekAgo },
          projectId: { $exists: true, $ne: null }
        }},
        { $group: { 
          _id: '$projectId', 
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 }},
        { $limit: 5 }
      ]);
      
      // Get project details for the most active projects
      const activeProjects = [];
      for (const item of projectActivities) {
        const project = await Project.findById(item._id)
          .select('name status');
        
        if (project) {
          activeProjects.push({
            ...project.toObject(),
            activityCount: item.count
          });
        }
      }
      
      return {
        counts: {
          total: totalProjects,
          planning: planningProjects,
          inProgress: inProgressProjects,
          review: reviewProjects,
          completed: completedProjects,
          active: planningProjects + inProgressProjects + reviewProjects
        },
        recentProjects,
        activeProjects
      };
    } catch (error) {
      console.error('Error in getProjectStats service:', error);
      throw error;
    }
  }
};

module.exports = projectService;
