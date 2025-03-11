// controllers/conversation-controller.js
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Agent = require('../models/agent');
const Activity = require('../models/activity');
const { anthropic, openai, models } = require('../config/ai-providers');

/**
 * Conversation controller handles CRUD operations and AI interactions for conversations
 */
const conversationController = {
  /**
   * Get all conversations with optional filters
   */
  getAllConversations: async (req, res) => {
    try {
      let query = {};
      
      // Filter by project if specified
      if (req.query.project) {
        query.projectId = req.query.project;
      }
      
      // Filter by participant if specified
      if (req.query.participant) {
        query.participants = req.query.participant;
      }
      
      // Filter by type if specified
      if (req.query.type) {
        query.type = req.query.type;
      }
      
      const conversations = await Conversation.find(query)
        .populate('participants', 'name role model')
        .populate('projectId', 'name')
        .sort('-updatedAt');
      
      // Enhance with message counts
      for (const conversation of conversations) {
        const messageCount = await Message.countDocuments({
          conversationId: conversation._id
        });
        
        conversation._doc.messageCount = messageCount;
      }
      
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get a single conversation by ID
   */
  getConversationById: async (req, res) => {
    try {
      const conversation = await Conversation.findById(req.params.id)
        .populate('participants', 'name role model')
        .populate('projectId', 'name status');
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Create a new conversation
   */
  createConversation: async (req, res) => {
    try {
      const conversation = new Conversation(req.body);
      await conversation.save();
      
      // Create a system message to indicate the conversation has been created
      const systemMessage = new Message({
        conversationId: conversation._id,
        systemMessage: true,
        content: `Conversation "${conversation.title}" has been created.`,
        timestamp: new Date()
      });
      
      await systemMessage.save();
      
      // Broadcast the new conversation and message
      req.app.io.emit('new-conversation', conversation);
      req.app.io.emit('new-message', systemMessage);
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update an existing conversation
   */
  updateConversation: async (req, res) => {
    try {
      const conversation = await Conversation.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('participants', 'name role model');
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Broadcast the updated conversation
      req.app.io.emit('conversation-updated', conversation);
      
      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete a conversation
   */
  deleteConversation: async (req, res) => {
    try {
      const conversation = await Conversation.findById(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Delete all messages in the conversation
      await Message.deleteMany({ conversationId: req.params.id });
      
      // Delete the conversation
      await Conversation.findByIdAndDelete(req.params.id);
      
      // Broadcast the deletion
      req.app.io.emit('conversation-deleted', { _id: req.params.id });
      
      res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get messages for a conversation
   */
  getConversationMessages: async (req, res) => {
    try {
      let query = { conversationId: req.params.id };
      
      // Filter by sender if specified
      if (req.query.sender) {
        query.sender = req.query.sender;
      }
      
      // Apply system message filter if specified
      if (req.query.includeSystem === 'false') {
        query.systemMessage = { $ne: true };
      }
      
      // Get pagination parameters
      const limit = parseInt(req.query.limit) || 50;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;
      
      // Get messages with pagination
      const messages = await Message.find(query)
        .populate('sender', 'name role model')
        .sort(req.query.sort === 'desc' ? '-timestamp' : 'timestamp')
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await Message.countDocuments(query);
      
      res.json({
        messages,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Add a participant to a conversation
   */
  addParticipant: async (req, res) => {
    try {
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ message: 'Agent ID is required' });
      }
      
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      const conversation = await Conversation.findById(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if agent is already a participant
      if (conversation.participants.includes(agentId)) {
        return res.status(400).json({ message: 'Agent is already a participant in this conversation' });
      }
      
      // Add agent to participants
      conversation.participants.push(agentId);
      await conversation.save();
      
      // Create a system message to indicate the agent has joined
      const systemMessage = new Message({
        conversationId: conversation._id,
        systemMessage: true,
        content: `${agent.name} has joined the conversation.`,
        timestamp: new Date()
      });
      
      await systemMessage.save();
      
      // Populate the participants for the response
      await conversation.populate('participants', 'name role model');
      
      // Broadcast the updates
      req.app.io.emit('conversation-updated', conversation);
      req.app.io.emit('new-message', systemMessage);
      
      res.json(conversation);
    } catch (error) {
      console.error('Error adding participant to conversation:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Remove a participant from a conversation
   */
  removeParticipant: async (req, res) => {
    try {
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ message: 'Agent ID is required' });
      }
      
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      const conversation = await Conversation.findById(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if agent is a participant
      if (!conversation.participants.includes(agentId)) {
        return res.status(400).json({ message: 'Agent is not a participant in this conversation' });
      }
      
      // Remove agent from participants
      conversation.participants = conversation.participants.filter(
        id => id.toString() !== agentId
      );
      await conversation.save();
      
      // Create a system message to indicate the agent has left
      const systemMessage = new Message({
        conversationId: conversation._id,
        systemMessage: true,
        content: `${agent.name} has left the conversation.`,
        timestamp: new Date()
      });
      
      await systemMessage.save();
      
      // Populate the participants for the response
      await conversation.populate('participants', 'name role model');
      
      // Broadcast the updates
      req.app.io.emit('conversation-updated', conversation);
      req.app.io.emit('new-message', systemMessage);
      
      res.json(conversation);
    } catch (error) {
      console.error('Error removing participant from conversation:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Pin or unpin a conversation
   */
  pinConversation: async (req, res) => {
    try {
      const { pinned } = req.body;
      
      if (pinned === undefined) {
        return res.status(400).json({ message: 'Pinned status is required' });
      }
      
      const conversation = await Conversation.findByIdAndUpdate(
        req.params.id,
        { pinned },
        { new: true, runValidators: true }
      ).populate('participants', 'name role model');
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Broadcast the updated conversation
      req.app.io.emit('conversation-updated', conversation);
      
      res.json(conversation);
    } catch (error) {
      console.error('Error pinning conversation:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get AI response for a conversation
   * Note: This is called asynchronously after a user sends a message
   */
  getAIResponse: async (io, conversationId, userMessage) => {
    try {
      // Verify the conversation exists
      const conversation = await Conversation.findById(conversationId)
        .populate('participants', 'name role model systemPrompt');
      
      if (!conversation) {
        console.error('Conversation not found for AI response');
        return;
      }
      
      // Determine which agent should respond
      let respondingAgent = null;
      
      // Check if the message directly mentions an agent by name
      if (userMessage.content) {
        for (const agent of conversation.participants) {
          if (userMessage.content.toLowerCase().includes(agent.name.toLowerCase())) {
            respondingAgent = agent;
            break;
          }
        }
      }
      
      // If no specific agent mentioned, default to Project Manager or first available agent
      if (!respondingAgent) {
        respondingAgent = conversation.participants.find(agent => agent.role === 'Project Manager');
        
        // If no Project Manager, use the first agent
        if (!respondingAgent && conversation.participants.length > 0) {
          respondingAgent = conversation.participants[0];
        }
      }
      
      // If we have a responding agent, generate a response
      if (respondingAgent) {
        // Simulate thinking time for more realistic interaction
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
        
        // Get recent conversation history (last 10 messages)
        const recentMessages = await Message.find(
          { conversationId: conversationId },
          null,
          { sort: { timestamp: -1 }, limit: 10 }
        ).populate('sender', 'name role');
        
        // Format messages for AI context
        const messageContext = recentMessages.reverse().map(msg => {
          let role = 'assistant';
          let content = msg.content;
          let name = undefined;
          
          if (msg.systemMessage) {
            role = 'system';
          } else if (!msg.sender || msg.sender === 'user') {
            role = 'user';
          } else if (msg.sender) {
            // This is a message from an agent
            name = msg.sender.name;
          }
          
          const message = { role, content };
          if (name) message.name = name;
          
          return message;
        });
        
        // Generate AI response based on agent model
        let responseContent;
        
        if (respondingAgent.model === 'claude') {
          // Add conversation context and system prompt for Claude
          const result = await anthropic.messages.create({
            model: models.claude,
            max_tokens: 1000,
            system: respondingAgent.systemPrompt,
            messages: messageContext
          });
          responseContent = result.content[0].text;
        } else {
          // Using GPT model
          const result = await openai.chat.completions.create({
            model: models.gpt,
            messages: [
              { role: 'system', content: respondingAgent.systemPrompt },
              ...messageContext
            ],
            max_tokens: 1000
          });
          responseContent = result.choices[0].message.content;
        }
        
        // Create and save the response message
        const responseMessage = new Message({
          conversationId,
          sender: respondingAgent._id,
          content: responseContent,
          timestamp: new Date()
        });
        
        await responseMessage.save();
        
        // Update conversation last activity
        await Conversation.findByIdAndUpdate(
          conversationId,
          { updatedAt: new Date() }
        );
        
        // Broadcast the new message
        io.emit('new-message', await responseMessage.populate('sender', 'name role model'));
        
        // Create activity for significant AI interactions
        if (conversation.projectId) {
          const activity = new Activity({
            type: 'message',
            title: 'Agent Response',
            description: `${respondingAgent.name} responded in ${conversation.title}`,
            projectId: conversation.projectId,
            agentId: respondingAgent._id,
            timestamp: new Date()
          });
          
          await activity.save();
          io.emit('new-activity', activity);
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
    }
  },
  
  /**
   * Search conversations
   */
  searchConversations: async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      // Search conversations by title or description
      const conversations = await Conversation.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      })
        .populate('participants', 'name role model')
        .populate('projectId', 'name')
        .sort('-updatedAt');
      
      // Enhance with message counts and recent message preview
      for (const conversation of conversations) {
        // Get message count
        const messageCount = await Message.countDocuments({
          conversationId: conversation._id
        });
        
        // Get most recent non-system message as preview
        const recentMessage = await Message.findOne({
          conversationId: conversation._id,
          systemMessage: { $ne: true }
        }).sort('-timestamp');
        
        conversation._doc.messageCount = messageCount;
        conversation._doc.preview = recentMessage ? recentMessage.content.substring(0, 100) : '';
      }
      
      res.json(conversations);
    } catch (error) {
      console.error('Error searching conversations:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = conversationController;
