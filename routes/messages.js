// routes/messages.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message-controller');

/**
 * Message routes
 * Base path: /api/messages
 */

// GET all messages with optional filters
router.get('/', messageController.getAllMessages);

// POST create a new message
router.post('/', messageController.createMessage);

// GET a specific message by ID
router.get('/:id', messageController.getMessageById);

// PUT update a message (limited functionality)
router.put('/:id', messageController.updateMessage);

// DELETE a message (soft delete)
router.delete('/:id', messageController.deleteMessage);

// POST add an attachment to a message
router.post('/:id/attachments', messageController.addAttachment);

// GET search messages across conversations
router.get('/search', messageController.searchMessages);

// POST send a system message to a conversation
router.post('/system', messageController.sendSystemMessage);

// GET message statistics
router.get('/stats', messageController.getMessageStats);

module.exports = router;
