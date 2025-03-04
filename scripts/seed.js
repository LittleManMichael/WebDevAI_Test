/**
 * Database seeding script
 * Run with: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Agent, Settings } = require('../models');
const agentTemplates = require('../data/agent-templates');

// Connect to database
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Seed agents from templates
async function seedAgents() {
  try {
    // Clear existing agents
    await Agent.deleteMany({});
    console.log('Cleared existing agents');
    
    // Create agents from templates
    for (const template of agentTemplates) {
      await Agent.create(template);
      console.log(`Created agent: ${template.name}`);
    }
    
    console.log('Agent seeding completed successfully');
  } catch (error) {
    console.error('Error seeding agents:', error);
  }
}

// Seed default settings
async function seedSettings() {
  try {
    // Clear existing settings
    await Settings.deleteMany({});
    console.log('Cleared existing settings');
    
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
      }
    ];
    
    for (const setting of defaultSettings) {
      await Settings.create(setting);
      console.log(`Created setting: ${setting.name}`);
    }
    
    console.log('Settings seeding completed successfully');
  } catch (error) {
    console.error('Error seeding settings:', error);
  }
}

// Run the seeding
async function runSeed() {
  try {
    await connectDatabase();
    await seedAgents();
    await seedSettings();
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Execute the seeding
runSeed();