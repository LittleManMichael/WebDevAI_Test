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
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task' 
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent' 
  }],
  pinned: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster querying of recent conversations
ConversationSchema.index({ updatedAt: -1 });

// Update the updatedAt field on save
ConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', ConversationSchema);
