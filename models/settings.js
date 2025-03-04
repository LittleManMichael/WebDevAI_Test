// models/settings.js
const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['general', 'appearance', 'notification', 'agent', 'project', 'api'],
    default: 'general'
  },
  isUserEditable: {
    type: Boolean,
    default: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

// Update the lastModified field on save
SettingsSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

module.exports = mongoose.model('Settings', SettingsSchema);