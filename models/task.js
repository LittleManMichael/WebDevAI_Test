// models/task.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: String,
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'review', 'completed'], 
    default: 'pending' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  dependencies: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task' 
  }],
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true
  },
  output: String,
  startDate: Date,
  endDate: Date,
  estimatedHours: Number,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field on save
TaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // If status changed to in-progress, set startDate
  if (this.isModified('status') && this.status === 'in-progress' && !this.startDate) {
    this.startDate = new Date();
  }
  
  // If status changed to completed, set endDate
  if (this.isModified('status') && this.status === 'completed' && !this.endDate) {
    this.endDate = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Task', TaskSchema);