// routes/agents.js
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent-controller');
const { verifyToken } = require('../middleware/auth');

/**
 * Agent routes
 * Base path: /api/agents
 */

// GET all agents with optional filters
router.get('/', verifyToken, agentController.getAllAgents);

// POST create a new agent
router.post('/', verifyToken, agentController.createAgent);

// GET a specific agent by ID
router.get('/:id', verifyToken, agentController.getAgentById);

// PUT update an existing agent
router.put('/:id', verifyToken, agentController.updateAgent);

// DELETE an agent
router.delete('/:id', verifyToken, agentController.deleteAgent);

// POST test an agent with a sample prompt
router.post('/:id/test', verifyToken, agentController.testAgent);

module.exports = router;
