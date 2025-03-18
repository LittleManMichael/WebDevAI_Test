// scripts/db-init.js
/**
 * Database initialization script for local single-user mode
 * This script:
 * - Creates the default admin user if not exists
 * - Seeds agent templates
 * - Initializes default settings
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Agent, User, Settings } = require('../models');
const agentTemplates = require('../data/agent-templates');

// MongoDB connection string with fallback to local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-agent-workforce';

// Connect to MongoDB
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error('\nMake sure MongoDB is running on your machine.');
    console.error('Installation instructions: https://docs.mongodb.com/manual/installation/\n');
    return false;
  }
}

// Create default admin user if not exists
async function createDefaultUser() {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (adminExists) {
      console.log('Default admin user already exists');
      return adminExists;
    }
    
    // Create default admin user
    const defaultUser = new User({
      username: 'admin',
      email: 'admin@local.app',
      password: 'adminpassword', // Will be hashed by the model pre-save hook
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      active: true,
      lastLogin: new Date()
    });
    
    await defaultUser.save();
    console.log('Default admin user created successfully');
    return defaultUser;
  } catch (error) {
    console.error('Error creating default user:', error);
    throw error;
  }
}

// Seed agents from templates
async function seedAgents() {
  try {
    // Check if any agents exist
    const agentCount = await Agent.countDocuments();
    
    if (agentCount > 0) {
      console.log(`${agentCount} agents already exist in the database`);
      return;
    }
    
    console.log('Seeding initial agent data...');
    
    // Create agents from templates
    for (const template of agentTemplates) {
      await Agent.create(template);
      console.log(`Created agent: ${template.name}`);
    }
    
    console.log('Agent data seeded successfully');
  } catch (error) {
    console.error('Error seeding agents:', error);
    throw error;
  }
}

// Create default settings
async function seedSettings() {
  try {
    // Check if any settings exist
    const settingsCount = await Settings.countDocuments();
    
    if (settingsCount > 0) {
      console.log(`${settingsCount} settings already exist in the database`);
      return;
    }
    
    console.log('Seeding initial settings...');
    
    // Create default settings
    const defaultSettings = [
      {
        name: 'agentResponseTime',
        value: 5000, // milliseconds
        description: 'Simulated thinking time for agent responses',
        category: 'agent',
        isUserEditable: true
      },
      {
        name: 'maxTasksPerAgent',
        value: 5,
        description: 'Maximum number of active tasks per agent',
        category: 'agent',
        isUserEditable: true
      },
      {
        name: 'defaultProjectDeadline',
        value: 14, // days
        description: 'Default deadline in days for new projects',
        category: 'project',
        isUserEditable: true
      },
      {
        name: 'theme',
        value: 'light',
        description: 'UI theme (light/dark)',
        category: 'appearance',
        isUserEditable: true
      },
      {
        name: 'notificationsEnabled',
        value: true,
        description: 'Whether to show notifications',
        category: 'notification',
        isUserEditable: true
      },
      {
        name: 'apiKeyStatus',
        value: false,
        description: 'Whether API keys are configured properly',
        category: 'api',
        isUserEditable: false
      },
      {
        name: 'localMode',
        value: true,
        description: 'Running in single-user local mode',
        category: 'system',
        isUserEditable: false
      }
    ];
    
    for (const setting of defaultSettings) {
      await Settings.create(setting);
      console.log(`Created setting: ${setting.name}`);
    }
    
    console.log('Settings seeded successfully');
  } catch (error) {
    console.error('Error seeding settings:', error);
    throw error;
  }
}

// Check API keys
async function checkApiKeys() {
  try {
    // Check if OpenAI and Anthropic API keys are set in environment
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    const apiKeysConfigured = !!(openaiKey && anthropicKey);
    
    // Update API key status setting
    await Settings.findOneAndUpdate(
      { name: 'apiKeyStatus' },
      { value: apiKeysConfigured },
      { upsert: true }
    );
    
    if (!apiKeysConfigured) {
      console.warn('\nWARNING: API keys not configured properly!');
      console.warn('Set OPENAI_API_KEY and ANTHROPIC_API_KEY in your .env file');
      console.warn('AI agents will not function without valid API keys\n');
    } else {
      console.log('API keys configured successfully');
    }
  } catch (error) {
    console.error('Error checking API keys:', error);
  }
}

// Main initialization function
async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  // Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    console.error('Database initialization failed: could not connect to MongoDB');
    process.exit(1);
  }
  
  try {
    // Create default user
    await createDefaultUser();
    
    // Seed agents
    await seedAgents();
    
    // Seed settings
    await seedSettings();
    
    // Check API keys
    await checkApiKeys();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Execute initialization if run directly
if (require.main === module) {
  initializeDatabase().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Initialization error:', err);
    process.exit(1);
  });
} else {
  // Export for use in other scripts
  module.exports = {
    initializeDatabase,
    connectDatabase,
    createDefaultUser,
    seedAgents,
    seedSettings,
    checkApiKeys
  };
}
