// models/message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation',
    required: true
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent' 
  }, // If null, it's from the human user
  systemMessage: { 
    type: Boolean, 
    default: false 
  },
  content: { 
    type: String, 
    required: true 
  },
  attachments: [{
    type: { 
      type: String, 
      enum: ['image', 'document', 'code'] 
    },
    name: String,
    url: String,
    content: String // For code snippets
  }],
  metadata: {
    type: { 
      type: String, 
      enum: ['request', 'response', 'update', 'notification'] 
    },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'] 
    },
    relatedTask: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Task' 
    }
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Message', MessageSchema);