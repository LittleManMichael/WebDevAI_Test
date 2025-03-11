// routes/tasks.js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task-controller');

/**
 * Task routes
 * Base path: /api/tasks
 */

// GET all tasks with optional filters
router.get('/', taskController.getAllTasks);

// POST create a new task
router.post('/', taskController.createTask);

// GET a specific task by ID
router.get('/:id', taskController.getTaskById);

// PUT update an existing task
router.put('/:id', taskController.updateTask);

// DELETE a task
router.delete('/:id', taskController.deleteTask);

// GET the conversation for a task
router.get('/:id/conversation', taskController.getTaskConversation);

// POST add a dependency to a task
router.post('/:id/dependencies', taskController.addTaskDependency);

// DELETE remove a dependency from a task
router.delete('/:id/dependencies', taskController.removeTaskDependency);

module.exports = router;
