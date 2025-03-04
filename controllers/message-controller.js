// controllers/message-controller.js
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const Agent = require('../models/agent');
const Activity = require('../models/activity');
const conversationController = require('./conversation-controller');

/**
 * Message controller handles CRUD operations for messages
 */
const messageController = {
  /**
   * Get all messages with optional filters
   */
  getAllMessages: async (req, res) => {
    try {
      let query = {};
      
      // Filter by conversation if specified
      if (req.query.conversation) {
        query.conversationId = req.query.conversation;
      }
      
      // Filter by sender if specified
      if (req.query.sender) {
        query.sender = req.query.sender;
      }
      
      // Filter by time range if specified
      if (req.query.since) {
        query.timestamp = { $gte: new Date(req.query.since) };
      }
      
      // Apply optional system message filter
      if (req.query.systemOnly === 'true') {
        query.systemMessage = true;
      } else if (req.query.excludeSystem === 'true') {
        query.systemMessage = { $ne: true };
      }
      
      let options = { sort: { timestamp: 1 } };
      
      // Apply pagination if specified
      if (req.query.limit) {
        options.limit = parseInt(req.query.limit);
      }
      
      if (req.query.offset) {
        options.skip = parseInt(req.query.offset);
      }
      
      const messages = await Message.find(query, null, options)
        .populate('sender', 'name role model');
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get a single message by ID
   */
  getMessageById: async (req, res) => {
    try {
      const message = await Message.findById(req.params.id)
        .populate('sender', 'name role model');
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      res.json(message);
    } catch (error) {
      console.error('Error fetching message:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Create a new message
   */
  createMessage: async (req, res) => {
    try {
      const { conversationId, content, sender, systemMessage } = req.body;
      
      // Validate required fields
      if (!conversationId || !content) {
        return res.status(400).json({ message: 'Conversation ID and content are required' });
      }
      
      // Check if conversation exists
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Create the message
      const message = new Message({
        conversationId,
        content,
        sender,
        systemMessage: systemMessage || false,
        timestamp: new Date()
      });
      
      await message.save();
      
      // Update conversation last activity
      await Conversation.findByIdAndUpdate(
        conversationId,
        { updatedAt: new Date() }
      );
      
      // Populate sender information if it exists
      if (sender) {
        await message.populate('sender', 'name role model');
      }
      
      // Broadcast the message
      req.app.io.emit('new-message', message);
      
      // If message is from human user, trigger AI agent responses
      if (sender === 'user' || !sender) {
        // Process AI responses asynchronously
        conversationController.getAIResponse(req.app.io, conversationId, message);
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update a message (limited functionality)
   */
  updateMessage: async (req, res) => {
    try {
      // Only allow updating content and attachments
      const { content, attachments } = req.body;
      
      const message = await Message.findById(req.params.id);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only allow updating if it's a user message and within 5 minutes of creation
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (message.sender !== 'user' && message.timestamp < fiveMinutesAgo) {
        return res.status(403).json({ message: 'Cannot edit this message (too old or not from user)' });
      }
      
      // Update allowed fields
      if (content) message.content = content;
      if (attachments) message.attachments = attachments;
      message.edited = true;
      message.editedAt = new Date();
      
      await message.save();
      
      // Populate sender information if it exists
      if (message.sender) {
        await message.populate('sender', 'name role model');
      }
      
      // Broadcast the updated message
      req.app.io.emit('message-updated', message);
      
      res.json(message);
    } catch (error) {
      console.error('Error updating message:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Delete a message (limited functionality)
   */
  deleteMessage: async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only allow deleting if it's a user message and within 5 minutes of creation
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (message.sender !== 'user' && message.timestamp < fiveMinutesAgo) {
        return res.status(403).json({ message: 'Cannot delete this message (too old or not from user)' });
      }
      
      // Instead of actually deleting, mark as deleted and replace content
      message.deleted = true;
      message.content = 'This message has been deleted.';
      message.attachments = [];
      
      await message.save();
      
      // Broadcast the deleted message
      req.app.io.emit('message-updated', message);
      
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Add attachments to a message
   */
  addAttachment: async (req, res) => {
    try {
      const { attachment } = req.body;
      
      if (!attachment || !attachment.type || !attachment.name) {
        return res.status(400).json({ message: 'Valid attachment object is required' });
      }
      
      const message = await Message.findById(req.params.id);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Add attachment
      message.attachments = message.attachments || [];
      message.attachments.push(attachment);
      
      await message.save();
      
      // Populate sender information if it exists
      if (message.sender) {
        await message.populate('sender', 'name role model');
      }
      
      // Broadcast the updated message
      req.app.io.emit('message-updated', message);
      
      res.json(message);
    } catch (error) {
      console.error('Error adding attachment to message:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Search messages across conversations
   */
  searchMessages: async (req, res) => {
    try {
      const { query, conversations, from, to } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      let searchQuery = {
        content: { $regex: query, $options: 'i' }
      };
      
      // Filter by conversations if specified
      if (conversations) {
        const conversationIds = conversations.split(',');
        searchQuery.conversationId = { $in: conversationIds };
      }
      
      // Filter by date range if specified
      if (from || to) {
        searchQuery.timestamp = {};
        if (from) searchQuery.timestamp.$gte = new Date(from);
        if (to) searchQuery.timestamp.$lte = new Date(to);
      }
      
      const messages = await Message.find(searchQuery)
        .populate('sender', 'name role model')
        .populate('conversationId', 'title')
        .sort('-timestamp')
        .limit(50);
      
      res.json(messages);
    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Send a system message to a conversation
   */
  sendSystemMessage: async (req, res) => {
    try {
      const { conversationId, content } = req.body;
      
      if (!conversationId || !content) {
        return res.status(400).json({ message: 'Conversation ID and content are required' });
      }
      
      // Check if conversation exists
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Create the system message
      const systemMessage = new Message({
        conversationId,
        content,
        systemMessage: true,
        timestamp: new Date()
      });
      
      await systemMessage.save();
      
      // Update conversation last activity
      await Conversation.findByIdAndUpdate(
        conversationId,
        { updatedAt: new Date() }
      );
      
      // Broadcast the message
      req.app.io.emit('new-message', systemMessage);
      
      res.status(201).json(systemMessage);
    } catch (error) {
      console.error('Error sending system message:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get message statistics
   */
  getMessageStats: async (req, res) => {
    try {
      // Total message count
      const totalMessages = await Message.countDocuments();
      
      // Messages by type
      const userMessages = await Message.countDocuments({ sender: 'user' });
      const systemMessages = await Message.countDocuments({ systemMessage: true });
      const agentMessages = await Message.countDocuments({ 
        sender: { $ne: 'user' },
        systemMessage: { $ne: true }
      });
      
      // Messages in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recentMessages = await Message.countDocuments({ timestamp: { $gte: oneDayAgo } });
      
      // Average messages per conversation
      const conversations = await Conversation.countDocuments();
      const avgMessagesPerConversation = conversations > 0 ? totalMessages / conversations : 0;
      
      res.json({
        totalMessages,
        userMessages,
        systemMessages,
        agentMessages,
        recentMessages,
        avgMessagesPerConversation
      });
    } catch (error) {
      console.error('Error getting message stats:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = messageController;
