// models/agent.js
const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  role: { 
    type: String, 
    required: true,
    trim: true 
  },
  model: { 
    type: String, 
    required: true,
    enum: ['claude', 'gpt'],
    default: 'claude'
  },
  systemPrompt: { 
    type: String, 
    required: true 
  },
  expertise: [String],
  communicationStyle: String,
  outputFormat: String,
  active: { 
    type: Boolean, 
    default: true 
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

// Update the updatedAt field on save
AgentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Agent', AgentSchema);