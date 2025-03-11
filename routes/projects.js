// routes/projects.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project-controller');

/**
 * Project routes
 * Base path: /api/projects
 */

// GET all projects with optional filters
router.get('/', projectController.getAllProjects);

// POST create a new project
router.post('/', projectController.createProject);

// GET a specific project by ID
router.get('/:id', projectController.getProjectById);

// PUT update an existing project
router.put('/:id', projectController.updateProject);

// DELETE a project
router.delete('/:id', projectController.deleteProject);

// GET tasks for a project
router.get('/:id/tasks', projectController.getProjectTasks);

// GET conversations for a project
router.get('/:id/conversations', projectController.getProjectConversations);

// POST add an agent to a project
router.post('/:id/agents', projectController.addAgentToProject);

// DELETE remove an agent from a project
router.delete('/:id/agents', projectController.removeAgentFromProject);

module.exports = router;
