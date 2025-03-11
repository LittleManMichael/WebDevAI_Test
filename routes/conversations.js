// routes/conversations.js
const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation-controller');
const messageController = require('../controllers/message-controller');

/**
 * Conversation routes
 * Base path: /api/conversations
 */

// GET all conversations with optional filters
router.get('/', conversationController.getAllConversations);

// POST create a new conversation
router.post('/', conversationController.createConversation);

// GET search conversations by query
router.get('/search', conversationController.searchConversations);

// GET a specific conversation by ID
router.get('/:id', conversationController.getConversationById);

// PUT update an existing conversation
router.put('/:id', conversationController.updateConversation);

// DELETE a conversation
router.delete('/:id', conversationController.deleteConversation);

// GET messages for a conversation
router.get('/:id/messages', conversationController.getConversationMessages);

// POST add a participant to a conversation
router.post('/:id/participants', conversationController.addParticipant);

// DELETE remove a participant from a conversation
router.delete('/:id/participants', conversationController.removeParticipant);

// PUT pin or unpin a conversation
router.put('/:id/pin', conversationController.pinConversation);

module.exports = router;
