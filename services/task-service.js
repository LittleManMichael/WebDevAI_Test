// services/task-service.js
const Task = require('../models/task');
const Project = require('../models/project');
const Agent = require('../models/agent');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Activity = require('../models/activity');
const claudeService = require('./claude-service');
const gptService = require('./gpt-service');

/**
 * Service for handling task-related operations
 */
const taskService = {
  /**
   * Get all tasks with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of tasks
   */
  getAllTasks: async (filters = {}) => {
    try {
      // Build query based on filters
      const query = {};
      
      if (filters.project) {
        query.project = filters.project;
      }
      
      if (filters.assignedTo) {
        query.assignedTo = filters.assignedTo;
      }
      
      if (filters.status) {
        if (filters.status === 'active') {
          query.status = { $in: ['pending', 'in-progress'] };
        } else {
          query.status = filters.status;
        }
      }
      
      if (filters.priority) {
        query.priority = filters.priority;
      }
      
      // Execute query with sorting
      const sortOption = filters.sort === 'priority' ? '-priority' : '-createdAt';
      
      const tasks = await Task.find(query)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies')
        .sort(sortOption);
      
      return tasks;
    } catch (error) {
      console.error('Error in getAllTasks service:', error);
      throw error;
    }
  },
  
  /**
   * Get a single task by ID
   * @param {string} taskId - The task's ID
   * @returns {Promise<Object>} The task object
   */
  getTaskById: async (taskId) => {
    try {
      const task = await Task.findById(taskId)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      if (!task) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }
      
      return task;
    } catch (error) {
      console.error(`Error in getTaskById service for ID ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new task
   * @param {Object} taskData - Data for creating the task
   * @returns {Promise<Object>} The created task and related entities
   */
  createTask: async (taskData) => {
    try {
      // Create the task
      const task = new Task(taskData);
      await task.save();
      
      // Add task to project
      if (task.project) {
        await Project.findByIdAndUpdate(
          task.project,
          { $push: { tasks: task._id } }
        );
      }
      
      let conversation = null;
      let systemMessage = null;
      let promptMessage = null;
      
      // Create a conversation for the task if assigned to an agent
      if (task.assignedTo) {
        // First check if a task conversation already exists
        conversation = await Conversation.findOne({
          type: 'task',
          taskId: task._id
        });
        
        // If no conversation exists, create one
        if (!conversation) {
          const project = await Project.findById(task.project);
          const agent = await Agent.findById(task.assignedTo);
          
          if (project && agent) {
            conversation = new Conversation({
              title: task.title,
              description: `Task discussion for "${task.title}"`,
              type: 'task',
              projectId: task.project,
              taskId: task._id,
              participants: [task.assignedTo]
            });
            
            // Add project manager to conversation
            const projectManager = await Agent.findOne({ 
              role: 'Project Manager',
              _id: { $in: project.agents }
            });
            
            if (projectManager && !conversation.participants.includes(projectManager._id)) {
              conversation.participants.push(projectManager._id);
            }
            
            await conversation.save();
            
            // Create initial system message
            systemMessage = new Message({
              conversationId: conversation._id,
              systemMessage: true,
              content: `Task "${task.title}" has been assigned to ${agent.name}.`,
              timestamp: new Date()
            });
            await systemMessage.save();
            
            // Create a message from the Project Manager if available
            if (projectManager) {
              promptMessage = new Message({
                conversationId: conversation._id,
                sender: projectManager._id,
                content: `@${agent.name}, you've been assigned to the task "${task.title}". Here's the description:\n\n${task.description}\n\nPlease review and let me know if you have any questions or need clarification.`,
                timestamp: new Date(Date.now() + 2000) // 2 seconds after system message
              });
              await promptMessage.save();
            }
          }
        }
      }
      
      // Create activity for task creation
      const activity = new Activity({
        type: 'task_created',
        title: 'Task Created',
        description: `New task "${task.title}" created`,
        projectId: task.project,
        taskId: task._id,
        timestamp: new Date()
      });
      await activity.save();
      
      return { 
        task: await Task.findById(task._id)
          .populate('assignedTo')
          .populate('project')
          .populate('dependencies'),
        conversation,
        systemMessage,
        promptMessage,
        activity
      };
    } catch (error) {
      console.error('Error in createTask service:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing task
   * @param {string} taskId - The task's ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} The updated task and related entities
   */
  updateTask: async (taskId, updateData) => {
    try {
      // Get the original task to check for status change
      const originalTask = await Task.findById(taskId);
      
      if (!originalTask) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }
      
      const statusChanged = updateData.status && originalTask.status !== updateData.status;
      const assigneeChanged = updateData.assignedTo && originalTask.assignedTo && 
                           originalTask.assignedTo.toString() !== updateData.assignedTo;
      const oldStatus = originalTask.status;
      
      // Update the task
      const task = await Task.findByIdAndUpdate(
        taskId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      let conversation = null;
      let systemMessage = null;
      let activity = null;
      
      // If assignee changed, update the task conversation
      if (assigneeChanged) {
        // Find the task conversation
        conversation = await Conversation.findOne({
          type: 'task',
          taskId: task._id
        });
        
        if (conversation) {
          // Add new assignee to participants if not already included
          if (task.assignedTo && !conversation.participants.includes(task.assignedTo)) {
            conversation.participants.push(task.assignedTo);
            await conversation.save();
          }
          
          // Create system message about assignment change
          const newAgent = await Agent.findById(task.assignedTo);
          if (newAgent) {
            systemMessage = new Message({
              conversationId: conversation._id,
              systemMessage: true,
              content: `Task has been reassigned to ${newAgent.name}.`,
              timestamp: new Date()
            });
            await systemMessage.save();
          }
        }
      }
      
      // If status changed, create an activity
      if (statusChanged) {
        let activityType, activityTitle, activityDescription;
        
        if (task.status === 'in-progress' && oldStatus === 'pending') {
          activityType = 'task_started';
          activityTitle = 'Task Started';
          activityDescription = `${task.assignedTo ? task.assignedTo.name : 'An agent'} started working on "${task.title}"`;
        } else if (task.status === 'completed') {
          activityType = 'task_completed';
          activityTitle = 'Task Completed';
          activityDescription = `${task.assignedTo ? task.assignedTo.name : 'An agent'} completed "${task.title}"`;
          
          // Check if all tasks for the project are completed
          if (task.project) {
            const projectTasks = await Task.find({ project: task.project._id });
            const allCompleted = projectTasks.every(t => t.status === 'completed');
            
            if (allCompleted) {
              // Update project status to completed
              await Project.findByIdAndUpdate(task.project._id, { status: 'completed' });
              
              // Create project completed activity
              const projectActivity = new Activity({
                type: 'project_completed',
                title: 'Project Completed',
                description: `Project "${task.project.name}" has been completed`,
                projectId: task.project._id,
                timestamp: new Date()
              });
              await projectActivity.save();
            }
          }
        }
        
        if (activityType) {
          activity = new Activity({
            type: activityType,
            title: activityTitle,
            description: activityDescription,
            projectId: task.project ? task.project._id : null,
            agentId: task.assignedTo ? task.assignedTo._id : null,
            taskId: task._id,
            timestamp: new Date()
          });
          await activity.save();
        }
      }
      
      return { task, conversation, systemMessage, activity };
    } catch (error) {
      console.error(`Error in updateTask service for ID ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a task
   * @param {string} taskId - The task's ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteTask: async (taskId) => {
    try {
      const task = await Task.findById(taskId);
      
      if (!task) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if other tasks depend on this task
      const dependentTasks = await Task.find({ dependencies: taskId });
      if (dependentTasks.length > 0) {
        const error = new Error('Cannot delete task that other tasks depend on. Please remove dependencies first.');
        error.statusCode = 400;
        error.data = { dependentTasks };
        throw error;
      }
      
      // Remove task from project
      if (task.project) {
        await Project.findByIdAndUpdate(
          task.project,
          { $pull: { tasks: taskId } }
        );
      }
      
      // Delete task conversation if exists
      const conversation = await Conversation.findOne({
        type: 'task',
        taskId: task._id
      });
      
      if (conversation) {
        // Delete all messages
        await Message.deleteMany({ conversationId: conversation._id });
        
        // Delete the conversation
        await Conversation.findByIdAndDelete(conversation._id);
      }
      
      // Delete the task
      await Task.findByIdAndDelete(taskId);
      
      return { 
        message: 'Task deleted successfully', 
        taskId,
        conversationDeleted: !!conversation
      };
    } catch (error) {
      console.error(`Error in deleteTask service for ID ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get the conversation for a task
   * @param {string} taskId - The task's ID
   * @returns {Promise<Object>} The task conversation
   */
  getTaskConversation: async (taskId) => {
    try {
      const conversation = await Conversation.findOne({
        type: 'task',
        taskId
      }).populate('participants');
      
      if (!conversation) {
        const error = new Error('Task conversation not found');
        error.statusCode = 404;
        throw error;
      }
      
      return conversation;
    } catch (error) {
      console.error(`Error in getTaskConversation service for ID ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Add a dependency to a task
   * @param {string} taskId - The task's ID
   * @param {string} dependencyId - The dependency task's ID
   * @returns {Promise<Object>} The updated task
   */
  addTaskDependency: async (taskId, dependencyId) => {
    try {
      // Check if the dependency task exists
      const dependencyTask = await Task.findById(dependencyId);
      if (!dependencyTask) {
        const error = new Error('Dependency task not found');
        error.statusCode = 404;
        throw error;
      }
      
      const task = await Task.findById(taskId);
      if (!task) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check for circular dependencies
      if (await taskService.checkCircularDependency(task._id, dependencyId)) {
        const error = new Error('Adding this dependency would create a circular dependency');
        error.statusCode = 400;
        throw error;
      }
      
      // Check if dependency is already added
      if (task.dependencies.includes(dependencyId)) {
        const error = new Error('Dependency is already added to this task');
        error.statusCode = 400;
        throw error;
      }
      
      // Add the dependency
      task.dependencies.push(dependencyId);
      await task.save();
      
      // Return the updated task
      const updatedTask = await Task.findById(taskId)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      return updatedTask;
    } catch (error) {
      console.error(`Error in addTaskDependency service for task ${taskId} and dependency ${dependencyId}:`, error);
      throw error;
    }
  },
  
  /**
   * Remove a dependency from a task
   * @param {string} taskId - The task's ID
   * @param {string} dependencyId - The dependency task's ID
   * @returns {Promise<Object>} The updated task
   */
  removeTaskDependency: async (taskId, dependencyId) => {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Check if dependency exists
      if (!task.dependencies.includes(dependencyId)) {
        const error = new Error('Dependency is not associated with this task');
        error.statusCode = 400;
        throw error;
      }
      
      // Remove the dependency
      task.dependencies = task.dependencies.filter(id => id.toString() !== dependencyId);
      await task.save();
      
      // Return the updated task
      const updatedTask = await Task.findById(taskId)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      return updatedTask;
    } catch (error) {
      console.error(`Error in removeTaskDependency service for task ${taskId} and dependency ${dependencyId}:`, error);
      throw error;
    }
  },
  
  /**
   * Check if adding a dependency would create a circular dependency
   * @param {string} taskId - ID of the task being updated
   * @param {string} dependencyId - ID of the dependency being added
   * @returns {Promise<boolean>} True if there would be a circular dependency
   */
  checkCircularDependency: async (taskId, dependencyId) => {
    // If the dependency is the same as the task, it's circular
    if (taskId.toString() === dependencyId.toString()) {
      return true;
    }
    
    // Get the dependencies of the dependency task
    const dependencyTask = await Task.findById(dependencyId);
    if (!dependencyTask || !dependencyTask.dependencies || dependencyTask.dependencies.length === 0) {
      return false;
    }
    
    // Check each dependency of the dependency task
    for (const subDependencyId of dependencyTask.dependencies) {
      if (subDependencyId.toString() === taskId.toString()) {
        return true;
      }
      
      // Recursively check for circular dependencies
      const isCircular = await taskService.checkCircularDependency(taskId, subDependencyId);
      if (isCircular) {
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Get tasks assigned to an agent
   * @param {string} agentId - The agent's ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of tasks assigned to the agent
   */
  getAgentTasks: async (agentId, filters = {}) => {
    try {
      // Build query
      const query = { assignedTo: agentId };
      
      if (filters.status) {
        if (filters.status === 'active') {
          query.status = { $in: ['pending', 'in-progress'] };
        } else {
          query.status = filters.status;
        }
      }
      
      if (filters.project) {
        query.project = filters.project;
      }
      
      // Execute query
      const tasks = await Task.find(query)
        .populate('project')
        .populate('dependencies')
        .sort(filters.sort === 'priority' ? '-priority' : '-createdAt');
      
      return tasks;
    } catch (error) {
      console.error(`Error in getAgentTasks service for agent ${agentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Generate AI response for a task
   * @param {string} taskId - The task's ID
   * @param {string} prompt - The prompt for the AI
   * @returns {Promise<string>} The AI response
   */
  generateTaskResponse: async (taskId, prompt) => {
    try {
      const task = await Task.findById(taskId)
        .populate('assignedTo')
        .populate('project');
      
      if (!task) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }
      
      if (!task.assignedTo) {
        const error = new Error('Task has no assigned agent');
        error.statusCode = 400;
        throw error;
      }
      
      // Generate response using the appropriate AI model
      let response;
      
      if (task.assignedTo.model === 'claude') {
        response = await claudeService.generateResponse(
          task.assignedTo.systemPrompt,
          `Task: ${task.title}\nDescription: ${task.description}\n\nPrompt: ${prompt}`,
          1500
        );
      } else {
        // Assume GPT model
        response = await gptService.generateResponse(
          task.assignedTo.systemPrompt,
          `Task: ${task.title}\nDescription: ${task.description}\n\nPrompt: ${prompt}`,
          1500
        );
      }
      
      return response;
    } catch (error) {
      console.error(`Error in generateTaskResponse service for task ${taskId}:`, error);
      throw error;
    }
  }
};

module.exports = taskService;
