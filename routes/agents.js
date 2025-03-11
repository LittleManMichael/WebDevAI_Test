// routes/agents.js
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent-controller');

/**
 * Agent routes
 * Base path: /api/agents
 */

// GET all agents with optional filters
router.get('/', agentController.getAllAgents);

// POST create a new agent
router.post('/', agentController.createAgent);

// GET a specific agent by ID
router.get('/:id', agentController.getAgentById);

// PUT update an existing agent
router.put('/:id', agentController.updateAgent);

// DELETE an agent
router.delete('/:id', agentController.deleteAgent);

// POST test an agent with a sample prompt
router.post('/:id/test', agentController.testAgent);

module.exports = router;
