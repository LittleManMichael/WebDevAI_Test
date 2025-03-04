// controllers/settings-controller.js
const Settings = require('../models/settings');

/**
 * Settings controller handles operations for application settings
 */
const settingsController = {
  /**
   * Get all settings with optional filters
   */
  getAllSettings: async (req, res) => {
    try {
      let query = {};
      
      // Filter by category if specified
      if (req.query.category) {
        query.category = req.query.category;
      }
      
      // Filter by user editable if specified
      if (req.query.userEditable === 'true') {
        query.isUserEditable = true;
      } else if (req.query.userEditable === 'false') {
        query.isUserEditable = false;
      }
      
      const settings = await Settings.find(query).sort('category name');
      
      // Format response as key-value pairs by category if requested
      if (req.query.format === 'grouped') {
        const groupedSettings = {};
        
        settings.forEach(setting => {
          if (!groupedSettings[setting.category]) {
            groupedSettings[setting.category] = {};
          }
          
          groupedSettings[setting.category][setting.name] = {
            value: setting.value,
            description: setting.description,
            isUserEditable: setting.isUserEditable,
            lastModified: setting.lastModified
          };
        });
        
        return res.json(groupedSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get a single setting by name
   */
  getSettingByName: async (req, res) => {
    try {
      const setting = await Settings.findOne({ name: req.params.name });
      
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Create a new setting
   */
  createSetting: async (req, res) => {
    try {
      const { name, value, description, category, isUserEditable } = req.body;
      
      // Check if setting already exists
      const existingSetting = await Settings.findOne({ name });
      if (existingSetting) {
        return res.status(400).json({ message: `Setting with name '${name}' already exists` });
      }
      
      const setting = new Settings({
        name,
        value,
        description,
        category: category || 'general',
        isUserEditable: isUserEditable !== undefined ? isUserEditable : true
      });
      
      await setting.save();
      
      res.status(201).json(setting);
    } catch (error) {
      console.error('Error creating setting:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update a setting
   */
  updateSetting: async (req, res) => {
    try {
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: 'Setting value is required' });
      }
      
      const setting = await Settings.findOne({ name: req.params.name });
      
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      // Check if setting is user editable
      if (!setting.isUserEditable) {
        return res.status(403).json({ message: 'This setting cannot be modified by users' });
      }
      
      setting.value = value;
      setting.lastModified = new Date();
      
      await setting.save();
      
      // Broadcast setting updated event
      req.app.io.emit('setting-updated', setting);
      
      res.json(setting);
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete a setting
   */
  deleteSetting: async (req, res) => {
    try {
      const setting = await Settings.findOne({ name: req.params.name });
      
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      // Don't allow deletion of non-user-editable settings
      if (!setting.isUserEditable) {
        return res.status(403).json({ message: 'This setting cannot be deleted by users' });
      }
      
      await Settings.deleteOne({ name: req.params.name });
      
      // Broadcast setting deleted event
      req.app.io.emit('setting-deleted', { name: req.params.name });
      
      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      console.error('Error deleting setting:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Bulk update settings
   */
  bulkUpdateSettings: async (req, res) => {
    try {
      const { settings } = req.body;
      
      if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({ message: 'Settings array is required' });
      }
      
      const results = {
        success: [],
        failures: []
      };
      
      for (const item of settings) {
        const { name, value } = item;
        
        if (!name || value === undefined) {
          results.failures.push({ name, error: 'Name and value are required' });
          continue;
        }
        
        try {
          const setting = await Settings.findOne({ name });
          
          if (!setting) {
            results.failures.push({ name, error: 'Setting not found' });
            continue;
          }
          
          // Check if setting is user editable
          if (!setting.isUserEditable) {
            results.failures.push({ name, error: 'This setting cannot be modified by users' });
            continue;
          }
          
          setting.value = value;
          setting.lastModified = new Date();
          
          await setting.save();
          
          // Broadcast setting updated event
          req.app.io.emit('setting-updated', setting);
          
          results.success.push({ name, value });
        } catch (error) {
          results.failures.push({ name, error: error.message });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error bulk updating settings:', error);
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Reset settings to default values
   */
  resetSettingsToDefault: async (req, res) => {
    try {
      // This requires default settings to be stored somewhere
      // For now, let's just reset some common settings
      const defaultSettings = [
        {
          name: 'theme',
          value: 'light',
          category: 'appearance'
        },
        {
          name: 'agentResponseTime',
          value: 5000,
          category: 'agent'
        },
        {
          name: 'maxTasksPerAgent',
          value: 5,
          category: 'agent'
        },
        {
          name: 'defaultProjectDeadline',
          value: 14,
          category: 'project'
        },
        {
          name: 'notificationsEnabled',
          value: true,
          category: 'notification'
        }
      ];
      
      const results = {
        success: [],
        failures: []
      };
      
      for (const defaultSetting of defaultSettings) {
        try {
          const setting = await Settings.findOne({ name: defaultSetting.name });
          
          if (setting) {
            setting.value = defaultSetting.value;
            setting.lastModified = new Date();
            
            await setting.save();
            
            // Broadcast setting updated event
            req.app.io.emit('setting-updated', setting);
            
            results.success.push({ name: setting.name, value: setting.value });
          } else {
            results.failures.push({ name: defaultSetting.name, error: 'Setting not found' });
          }
        } catch (error) {
          results.failures.push({ name: defaultSetting.name, error: error.message });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error resetting settings:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  /**
   * Get all setting categories
   */
  getSettingCategories: async (req, res) => {
    try {
      const categories = await Settings.distinct('category');
      res.json(categories);
    } catch (error) {
      console.error('Error fetching setting categories:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = settingsController;
