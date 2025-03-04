// models/activity.js
const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'project_created', 
      'project_updated', 
      'project_completed',
      'task_created', 
      'task_started', 
      'task_completed', 
      'message',
      'file_generated',
      'agent_created',
      'agent_updated'
    ],
    required: true
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
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