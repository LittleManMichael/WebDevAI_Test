// routes/api.js

const express = require('express');
const router = express.Router();
const { Agent, Message, Project, Task } = require('../platform');
const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

// Initialize AI service clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Agent routes
router.get('/agents', async (req, res) => {
  try {
    const query = {};
    
    // Filter by active status if specified
    if (req.query.active === 'true') {
      query.active = true;
    } else if (req.query.active === 'false') {
      query.active = false;
    }
    
    const agents = await Agent.find(query).sort('name');
    
    // Enhance with workload data
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
        fromAgent: agent._id,
        timestamp: { $gte: oneDayAgo }
      });
      
      // Calculate workload percentage based on task count and message volume
      // This is a simplified algorithm that can be improved based on real usage patterns
      const workload = Math.min(Math.round((activeTasks * 15) + (messageCount * 0.5) + (projectCount * 10)), 100);
      
      // Add to agent data
      agent.activeTasks = activeTasks;
      agent.projectCount = projectCount;
      agent.messageCount = messageCount;
      agent.workload = workload;
    }
    
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/agents', async (req, res) => {
  try {
    const agent = new Agent(req.body);
    await agent.save();
    
    // Broadcast agent created event to all connected clients
    req.app.io.emit('agent-created', agent);
    
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/agents/:id', async (req, res) => {
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
});

router.put('/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Broadcast agent updated event to all connected clients
    req.app.io.emit('agent-updated', agent);
    
    res.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(400).json({ message: error.message });
  }
});

router.delete('/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Broadcast agent deleted event to all connected clients
    req.app.io.emit('agent-deleted', { _id: req.params.id });
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/agents/:id/test', async (req, res) => {
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
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        system: agent.systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });
      response = result.content[0].text;
    } else {
      // Assume GPT model
      const result = await openai.chat.completions.create({
        model: 'gpt-4',
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
});

// Project routes
router.get('/projects', async (req, res) => {
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
      project.totalTasks = totalTasks;
      project.completedTasks = completedTasks;
    }
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    
    // Create initial conversation for the project
    const conversation = {
      title: project.name,
      description: `Project discussion for ${project.name}`,
      type: 'project',
      projectId: project._id,
      participants: project.agents
    };
    
    // Assuming a Conversation model exists
    const Conversation = require('../models/conversation');
    const newConversation = new Conversation(conversation);
    await newConversation.save();
    
    // Find the Project Manager agent
    const projectManager = await Agent.findOne({ role: 'Project Manager' });
    
    if (projectManager) {
      // Create an initial planning task
      const planningTask = new Task({
        title: 'Project Planning',
        description: 'Break down the project requirements and create initial tasks',
        assignedTo: projectManager._id,
        status: 'pending',
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
          model: 'claude-3-opus-20240229',
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
          model: 'gpt-4',
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
      const Message = require('../models/message');
      const systemMessage = new Message({
        conversationId: newConversation._id,
        systemMessage: true,
        content: `Project "${project.name}" has been created.`
      });
      await systemMessage.save();
      
      // Create a message from the Project Manager
      const pmMessage = new Message({
        conversationId: newConversation._id,
        sender: projectManager._id,
        content: planResponse
      });
      await pmMessage.save();
      
      // Create activity for project creation
      const Activity = require('../models/activity');
      const activity = new Activity({
        type: 'project_created',
        title: 'Project Created',
        description: `You created a new project "${project.name}"`,
        projectId: project._id,
        timestamp: new Date()
      });
      await activity.save();
      
      // Broadcast project created event to all connected clients
      req.app.io.emit('project-created', project);
      req.app.io.emit('new-conversation', newConversation);
      req.app.io.emit('new-activity', activity);
    }
    
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('agents');
    
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
    project.totalTasks = totalTasks;
    project.completedTasks = completedTasks;
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('agents');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Broadcast project updated event to all connected clients
    req.app.io.emit('project-updated', project);
    
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(400).json({ message: error.message });
  }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Delete all tasks associated with the project
    await Task.deleteMany({ project: req.params.id });
    
    // Broadcast project deleted event to all connected clients
    req.app.io.emit('project-deleted', { _id: req.params.id });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: error.message });
  }
});

// Task routes
router.get('/tasks', async (req, res) => {
  try {
    let query = {};
    
    // Filter by project if specified
    if (req.query.project) {
      query.project = req.query.project;
    }
    
    // Filter by status if specified
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by agent if specified
    if (req.query.agent) {
      query.assignedTo = req.query.agent;
    }
    
    const tasks = await Task.find(query)
      .populate('assignedTo')
      .populate('project')
      .sort('-createdAt');
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    
    // Add task to project
    if (task.project) {
      const project = await Project.findById(task.project);
      if (project) {
        project.tasks.push(task._id);
        await project.save();
      }
    }
    
    // Create activity for task creation
    const Activity = require('../models/activity');
    const activity = new Activity({
      type: 'task_created',
      title: 'Task Created',
      description: `New task created: "${task.title}"`,
      projectId: task.project,
      timestamp: new Date()
    });
    await activity.save();
    
    // Broadcast task created event and activity
    req.app.io.emit('task-created', task);
    req.app.io.emit('new-activity', activity);
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
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
});

router.put('/tasks/:id', async (req, res) => {
  try {
    // Check if status is being updated
    const originalTask = await Task.findById(req.params.id);
    const statusChanged = originalTask && req.body.status && originalTask.status !== req.body.status;
    const oldStatus = originalTask ? originalTask.status : null;
    
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo')
      .populate('project');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // If status changed, create an activity
    if (statusChanged) {
      const Activity = require('../models/activity');
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
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Remove task from project
    if (task.project) {
      await Project.findByIdAndUpdate(
        task.project,
        { $pull: { tasks: req.params.id } }
      );
    }
    
    // Broadcast task deleted event
    req.app.io.emit('task-deleted', { _id: req.params.id });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: error.message });
  }
});

// Conversation routes
router.get('/conversations', async (req, res) => {
  try {
    const Conversation = require('../models/conversation');
    
    let query = {};
    
    // Filter by project if specified
    if (req.query.project) {
      query.projectId = req.query.project;
    }
    
    // Filter by participant if specified
    if (req.query.participant) {
      query.participants = req.query.participant;
    }
    
    const conversations = await Conversation.find(query).sort('-updatedAt');
    
    // Enhance with message count
    for (const conversation of conversations) {
      const Message = require('../models/message');
      const messageCount = await Message.countDocuments({ conversationId: conversation._id });
      conversation.messageCount = messageCount;
    }
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/conversations', async (req, res) => {
  try {
    const Conversation = require('../models/conversation');
    const conversation = new Conversation(req.body);
    await conversation.save();
    
    // Broadcast conversation created event
    req.app.io.emit('new-conversation', conversation);
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const Conversation = require('../models/conversation');
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants')
      .populate('projectId');
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const Message = require('../models/message');
    
    // Get conversation messages, paginated if requested
    let query = { conversationId: req.params.id };
    let options = { sort: { timestamp: 1 } };
    
    // Apply pagination if specified
    if (req.query.limit) {
      options.limit = parseInt(req.query.limit);
    }
    
    if (req.query.offset) {
      options.skip = parseInt(req.query.offset);
    }
    
    const messages = await Message.find(query, null, options);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: error.message });
  }
});

// Message routes
router.post('/messages', async (req, res) => {
  try {
    const Message = require('../models/message');
    const message = new Message(req.body);
    await message.save();
    
    // Update conversation last activity
    const Conversation = require('../models/conversation');
    await Conversation.findByIdAndUpdate(
      message.conversationId,
      { updatedAt: new Date() }
    );
    
    // If the message is from a human user, generate responses from relevant agents
    if (message.sender === 'user') {
      const conversation = await Conversation.findById(message.conversationId);
      
      if (conversation && conversation.participants && conversation.participants.length > 0) {
        // Determine which agent should respond
        let respondingAgent;
        
        // If the message mentions a specific agent, let that agent respond
        for (const agentId of conversation.participants) {
          const agent = await Agent.findById(agentId);
          if (agent && message.content.toLowerCase().includes(agent.name.toLowerCase())) {
            respondingAgent = agent;
            break;
          }
        }
        
        // If no specific agent mentioned, let the Project Manager respond
        if (!respondingAgent) {
          respondingAgent = await Agent.findOne({ 
            _id: { $in: conversation.participants },
            role: 'Project Manager'
          });
        }
        
        // If we have a responding agent, generate a response
        if (respondingAgent) {
          let agentResponse;
          
          // Get recent messages for context (last 10)
          const recentMessages = await Message.find(
            { conversationId: message.conversationId },
            null,
            { sort: { timestamp: -1 }, limit: 10 }
          ).sort({ timestamp: 1 });
          
          // Format conversation history for the AI
          const conversationHistory = recentMessages.map(msg => {
            // Determine the role
            let role = 'assistant';
            if (msg.systemMessage) {
              role = 'system';
            } else if (msg.sender === 'user') {
              role = 'user';
            }
            
            return {
              role,
              content: msg.content
            };
          });
          
          // Add the user's new message
          conversationHistory.push({
            role: 'user',
            content: message.content
          });
          
          // Generate response using the appropriate AI model
          if (respondingAgent.model === 'claude') {
            const result = await anthropic.messages.create({
              model: 'claude-3-opus-20240229',
              max_tokens: 2000,
              system: respondingAgent.systemPrompt,
              messages: conversationHistory
            });
            agentResponse = result.content[0].text;
          } else {
            // Assume GPT model
            const messages = [
              { role: 'system', content: respondingAgent.systemPrompt },
              ...conversationHistory
            ];
            
            const result = await openai.chat.completions.create({
              model: 'gpt-4',
              messages,
              max_tokens: 2000
            });
            agentResponse = result.choices[0].message.content;
          }
          
          // Create and save the agent's response message
          const responseMessage = new Message({
            conversationId: message.conversationId,
            sender: respondingAgent._id,
            content: agentResponse,
            timestamp: new Date()
          });
          await responseMessage.save();
          
          // Broadcast the agent's response
          req.app.io.emit('new-message', responseMessage);
          
          // Create activity for new message
          const Activity = require('../models/activity');
          const activity = new Activity({
            type: 'message',
            title: 'New Conversation',
            description: `${respondingAgent.name} responded to a message`,
            projectId: conversation.projectId,
            agentId: respondingAgent._id,
            timestamp: new Date()
          });
          await activity.save();
          
          // Broadcast activity
          req.app.io.emit('new-activity', activity);
        }
      }
    }
    
    // Broadcast the original message
    req.app.io.emit('new-message', message);
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(400).json({ message: error.message });
  }
});

// Stats route
router.get('/stats', async (req, res) => {
  try {
    // Get active projects count
    const activeProjects = await Project.countDocuments({ 
      status: { $in: ['planning', 'in-progress', 'review'] } 
    });
    
    // Get active agents count
    const activeAgents = await Agent.countDocuments({ active: true });
    
    // Get completed tasks count
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    
    // Get AI messages count
    const Message = require('../models/message');
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
    const Activity = require('../models/activity');
    
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