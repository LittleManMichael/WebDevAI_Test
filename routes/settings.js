// routes/settings.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings-controller');

/**
 * Settings routes
 * Base path: /api/settings
 */

// GET all settings with optional filters
router.get('/', settingsController.getAllSettings);

// GET a single setting by name
router.get('/:name', settingsController.getSettingByName);

// POST create a new setting
router.post('/', settingsController.createSetting);

// PUT update a setting
router.put('/:name', settingsController.updateSetting);

// DELETE a setting
router.delete('/:name', settingsController.deleteSetting);

// POST bulk update multiple settings at once
router.post('/bulk', settingsController.bulkUpdateSettings);

// POST reset settings to default values
router.post('/reset', settingsController.resetSettingsToDefault);

// GET all setting categories
router.get('/categories/all', settingsController.getSettingCategories);

module.exports = router;
