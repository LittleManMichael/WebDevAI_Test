// models/file.js
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: String,
  type: { 
    type: String, 
    enum: ['image', 'document', 'code', 'archive', 'other'],
    required: true
  },
  mimeType: String,
  size: Number, // in bytes
  path: { 
    type: String, 
    required: true 
  },
  url: String,
  content: String, // For code files or text content
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project'
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent'
  },
  isGeneratedByAI: {
    type: Boolean,
    default: false
  },
  metadata: {
    // Additional data specific to the file type
    type: mongoose.Schema.Types.Mixed
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
FileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('File', FileSchema);