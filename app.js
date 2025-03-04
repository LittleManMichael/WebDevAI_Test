// app.js - Main application file

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');
const models = require('./models');
const agentTemplates = require('./data/agent-templates');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Make io available to routes
app.io = io;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Request logging
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Serve frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database connection
const initDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Check if we need to seed initial data
    await seedInitialData();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed initial data if the database is empty
const seedInitialData = async () => {
  try {
    // Check if any agents exist
    const agentCount = await models.Agent.countDocuments();
    
    if (agentCount === 0) {
      console.log('Seeding initial agent data...');
      
      // Create agents from templates
      for (const template of agentTemplates) {
        await models.Agent.create(template);
      }
      
      console.log('Agent data seeded successfully');
    }
    
    // Check if default settings exist
    const settingsCount = await models.Settings.countDocuments();
    
    if (settingsCount === 0) {
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
        }
      ];
      
      for (const setting of defaultSettings) {
        await models.Settings.create(setting);
      }
      
      console.log('Settings seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Handle message between agents
  socket.on('send-message', async (data) => {
    try {
      // Create a new message
      const message = new models.Message({
        conversationId: data.conversationId,
        sender: data.sender,
        content: data.content,
        metadata: data.metadata,
        timestamp: new Date()
      });
      
      await message.save();
      
      // Update conversation last activity
      await models.Conversation.findByIdAndUpdate(
        data.conversationId,
        { updatedAt: new Date() }
      );
      
      // Broadcast the message to all connected clients
      io.emit('new-message', message);
      
      // If message is from user, potentially trigger AI agent responses
      // This logic is handled in the message POST API endpoint
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle conversation pinning
  socket.on('pin-conversation', async (data) => {
    try {
      const { conversationId, pinned } = data;
      
      const conversation = await models.Conversation.findByIdAndUpdate(
        conversationId,
        { pinned },
        { new: true }
      );
      
      // Broadcast the updated conversation
      io.emit('conversation-updated', conversation);
    } catch (error) {
      console.error('Error pinning conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize the database after server startup
  await initDatabase();
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('Gracefully shutting down');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

module.exports = { app, server };