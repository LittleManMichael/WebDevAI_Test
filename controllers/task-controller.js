// controllers/task-controller.js
const Task = require('../models/task');
const Project = require('../models/project');
const Agent = require('../models/agent');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Activity = require('../models/activity');
const { anthropic, openai, models } = require('../config/ai-providers');

/**
 * Task controller handles CRUD operations and task management
 */
const taskController = {
  /**
   * Get all tasks with optional filters
   */
  getAllTasks: async (req, res) => {
    try {
      let query = {};
      
      // Filter by project if specified
      if (req.query.project) {
        query.project = req.query.project;
      }
      
      // Filter by assigned agent if specified
      if (req.query.assignedTo) {
        query.assignedTo = req.query.assignedTo;
      }
      
      // Filter by status if specified
      if (req.query.status) {
        if (req.query.status === 'active') {
          query.status = { $in: ['pending', 'in-progress'] };
        } else {
          query.status = req.query.status;
        }
      }
      
      // Filter by priority if specified
      if (req.query.priority) {
        query.priority = req.query.priority;
      }
      
      const tasks = await Task.find(query)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies')
        .sort(req.query.sort === 'priority' ? '-priority' : '-createdAt');
      
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get a single task by ID
   */
  getTaskById: async (req, res) => {
    try {
      const task = await Task.findById(req.params.id)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Create a new task
   */
  createTask: async (req, res) => {
    try {
      const task = new Task(req.body);
      await task.save();
      
      // Add task to project
      if (task.project) {
        await Project.findByIdAndUpdate(
          task.project,
          { $push: { tasks: task._id } }
        );
      }
      
      // Create a conversation for the task if assigned to an agent
      if (task.assignedTo) {
        // First check if a task conversation already exists
        let conversation = await Conversation.findOne({
          type: 'task',
          taskId: task._id
        });
        
        // If no conversation exists, create one
        if (!conversation) {
          const project = await Project.findById(task.project);
          const agent = await Agent.findById(task.assignedTo);
          
          if (!project || !agent) {
            throw new Error('Project or agent not found');
          }
          
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
          const systemMessage = new Message({
            conversationId: conversation._id,
            systemMessage: true,
            content: `Task "${task.title}" has been assigned to ${agent.name}.`,
            timestamp: new Date()
          });
          await systemMessage.save();
          
          // Create a message from the Project Manager if available
          if (projectManager) {
            const promptMessage = new Message({
              conversationId: conversation._id,
              sender: projectManager._id,
              content: `@${agent.name}, you've been assigned to the task "${task.title}". Here's the description:\n\n${task.description}\n\nPlease review and let me know if you have any questions or need clarification.`,
              timestamp: new Date(Date.now() + 2000) // 2 seconds after system message
            });
            await promptMessage.save();
            
            // Broadcast messages
            req.app.io.emit('new-message', systemMessage);
            req.app.io.emit('new-message', promptMessage);
          } else {
            req.app.io.emit('new-message', systemMessage);
          }
          
          // Broadcast new conversation
          req.app.io.emit('new-conversation', conversation);
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
      
      // Broadcast events
      req.app.io.emit('task-created', await Task.findById(task._id)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies'));
      req.app.io.emit('new-activity', activity);
      
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update an existing task
   */
  updateTask: async (req, res) => {
    try {
      // Check if status is being updated
      const originalTask = await Task.findById(req.params.id);
      
      if (!originalTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      const statusChanged = req.body.status && originalTask.status !== req.body.status;
      const assigneeChanged = req.body.assignedTo && originalTask.assignedTo && 
                            originalTask.assignedTo.toString() !== req.body.assignedTo;
      const oldStatus = originalTask.status;
      
      const task = await Task.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      )
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      // If assignee changed, update the task conversation
      if (assigneeChanged) {
        // Find the task conversation
        const conversation = await Conversation.findOne({
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
            const systemMessage = new Message({
              conversationId: conversation._id,
              systemMessage: true,
              content: `Task has been reassigned to ${newAgent.name}.`,
              timestamp: new Date()
            });
            await systemMessage.save();
            
            // Broadcast the message
            req.app.io.emit('new-message', systemMessage);
            req.app.io.emit('conversation-updated', conversation);
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
              
              // Broadcast project updated and activity
              const updatedProject = await Project.findById(task.project._id).populate('agents');
              req.app.io.emit('project-updated', updatedProject);
              req.app.io.emit('new-activity', projectActivity);
            }
          }
        }
        
        if (activityType) {
          const activity = new Activity({
            type: activityType,
            title: activityTitle,
            description: activityDescription,
            projectId: task.project ? task.project._id : null,
            agentId: task.assignedTo ? task.assignedTo._id : null,
            taskId: task._id,
            timestamp: new Date()
          });
          await activity.save();
          
          // Broadcast activity
          req.app.io.emit('new-activity', activity);
        }
      }
      
      // Broadcast task updated event
      req.app.io.emit('task-updated', task);
      
      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete a task
   */
  deleteTask: async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if other tasks depend on this task
      const dependentTasks = await Task.find({ dependencies: req.params.id });
      if (dependentTasks.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete task that other tasks depend on. Please remove dependencies first.',
          dependentTasks
        });
      }
      
      // Remove task from project
      if (task.project) {
        await Project.findByIdAndUpdate(
          task.project,
          { $pull: { tasks: req.params.id } }
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
        
        // Broadcast event
        req.app.io.emit('conversation-deleted', { _id: conversation._id });
      }
      
      // Delete the task
      await Task.findByIdAndDelete(req.params.id);
      
      // Broadcast event
      req.app.io.emit('task-deleted', { _id: req.params.id });
      
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get the conversation for a task
   */
  getTaskConversation: async (req, res) => {
    try {
      const conversation = await Conversation.findOne({
        type: 'task',
        taskId: req.params.id
      }).populate('participants');
      
      if (!conversation) {
        return res.status(404).json({ message: 'Task conversation not found' });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error('Error fetching task conversation:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Add a dependency to a task
   */
  addTaskDependency: async (req, res) => {
    try {
      const { dependencyId } = req.body;
      
      if (!dependencyId) {
        return res.status(400).json({ message: 'Dependency task ID is required' });
      }
      
      // Check if the dependency task exists
      const dependencyTask = await Task.findById(dependencyId);
      if (!dependencyTask) {
        return res.status(404).json({ message: 'Dependency task not found' });
      }
      
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check for circular dependencies
      if (await this.checkCircularDependency(task._id, dependencyId)) {
        return res.status(400).json({ message: 'Adding this dependency would create a circular dependency' });
      }
      
      // Check if dependency is already added
      if (task.dependencies.includes(dependencyId)) {
        return res.status(400).json({ message: 'Dependency is already added to this task' });
      }
      
      // Add the dependency
      task.dependencies.push(dependencyId);
      await task.save();
      
      // Return the updated task
      const updatedTask = await Task.findById(req.params.id)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      // Broadcast task updated event
      req.app.io.emit('task-updated', updatedTask);
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error adding task dependency:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Remove a dependency from a task
   */
  removeTaskDependency: async (req, res) => {
    try {
      const { dependencyId } = req.body;
      
      if (!dependencyId) {
        return res.status(400).json({ message: 'Dependency task ID is required' });
      }
      
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if dependency exists
      if (!task.dependencies.includes(dependencyId)) {
        return res.status(400).json({ message: 'Dependency is not associated with this task' });
      }
      
      // Remove the dependency
      task.dependencies = task.dependencies.filter(id => id.toString() !== dependencyId);
      await task.save();
      
      // Return the updated task
      const updatedTask = await Task.findById(req.params.id)
        .populate('assignedTo')
        .populate('project')
        .populate('dependencies');
      
      // Broadcast task updated event
      req.app.io.emit('task-updated', updatedTask);
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error removing task dependency:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Check if adding a dependency would create a circular dependency
   * @param {string} taskId - ID of the task being updated
   * @param {string} dependencyId - ID of the dependency being added
   * @returns {boolean} True if there would be a circular dependency
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
      const isCircular = await taskController.checkCircularDependency(taskId, subDependencyId);
      if (isCircular) {
        return true;
      }
    }
    
    return false;
  }
};

module.exports = taskController;
