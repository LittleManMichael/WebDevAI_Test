// models/project.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: String,
  requirements: String,
  status: { 
    type: String, 
    enum: ['planning', 'in-progress', 'review', 'completed'], 
    default: 'planning' 
  },
  deadline: Date,
  agents: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent' 
  }],
  tasks: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task' 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Virtual field for progress calculation
ProjectSchema.virtual('progress').get(function() {
  if (!this.tasks || this.tasks.length === 0) {
    return 0;
  }
  
  const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedTasks / this.tasks.length) * 100);
});

// Update the updatedAt field on save
ProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);