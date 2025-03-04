// models/conversation.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: String,
  type: { 
    type: String, 
    enum: ['project', 'direct', 'task', 'general'], 
    default: 'general' 
  },
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  },
  agentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent' 
  },
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  metadata: {
    // Additional data specific to the activity type
    type: mongoose.Schema.Types.Mixed
  }
});

// Index for faster querying of recent activities
ActivitySchema.index({ timestamp: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);