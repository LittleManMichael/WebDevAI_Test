// routes/projects.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project-controller');
const { verifyToken } = require('../middleware/auth');

/**
 * Project routes
 * Base path: /api/projects
 */

// GET all projects with optional filters
router.get('/', verifyToken, projectController.getAllProjects);

// POST create a new project
router.post('/', verifyToken, projectController.createProject);

// GET a specific project by ID
router.get('/:id', verifyToken, projectController.getProjectById);

// PUT update an existing project
router.put('/:id', verifyToken, projectController.updateProject);

// DELETE a project
router.delete('/:id', verifyToken, projectController.deleteProject);

// GET tasks for a project
router.get('/:id/tasks', verifyToken, projectController.getProjectTasks);

// GET conversations for a project
router.get('/:id/conversations', verifyToken, projectController.getProjectConversations);

// POST add an agent to a project
router.post('/:id/agents', verifyToken, projectController.addAgentToProject);

// DELETE remove an agent from a project
router.delete('/:id/agents', verifyToken, projectController.removeAgentFromProject);

module.exports = router;
