// utils/conversation-formatter.js

/**
 * Utility for formatting conversation data
 */
const conversationFormatter = {
  /**
   * Format a list of messages for display in the UI
   * @param {Array} messages - Message objects
   * @param {Array} agents - Agent objects for sender lookup
   * @returns {Array} Formatted messages
   */
  formatMessagesForDisplay: (messages, agents = []) => {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }

    return messages.map(message => {
      // Find sender name for agent messages
      let senderName = 'Unknown';
      let senderRole = '';
      let avatarUrl = '/img/default-avatar.png';
      
      if (message.systemMessage) {
        senderName = 'System';
        avatarUrl = '/img/system-avatar.png';
      } else if (message.sender === 'user') {
        senderName = 'You';
        avatarUrl = '/img/user-avatar.png';
      } else if (message.sender) {
        // Find agent info
        const agent = agents.find(a => a._id.toString() === message.sender.toString());
        if (agent) {
          senderName = agent.name;
          senderRole = agent.role;
          avatarUrl = `/img/agents/${agent.role.toLowerCase()}.png`;
        }
      }
      
      // Format timestamp
      const timestamp = message.timestamp 
        ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      
      // Handle deleted messages
      if (message.deleted) {
        return {
          id: message._id,
          sender: senderName,
          role: senderRole,
          avatar: avatarUrl,
          content: 'This message has been deleted.',
          timestamp,
          isSystem: !!message.systemMessage,
          isDeleted: true
        };
      }
      
      return {
        id: message._id,
        sender: senderName,
        role: senderRole,
        avatar: avatarUrl,
        content: message.content,
        timestamp,
        isSystem: !!message.systemMessage,
        isEdited: !!message.edited,
        attachments: message.attachments || [],
        metadata: message.metadata || {}
      };
    });
  },
  
  /**
   * Format messages for AI context
   * @param {Array} messages - Message objects
   * @param {Array} agents - Agent objects for sender lookup
   * @param {number} limit - Maximum number of messages to include
   * @returns {Array} Formatted messages for AI context
   */
  formatMessagesForAI: (messages, agents = [], limit = 10) => {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    
    // Take the most recent messages up to the limit
    const recentMessages = messages.slice(-limit);
    
    return recentMessages.map(message => {
      let role = 'assistant';
      let content = message.content || '';
      let name = undefined;
      
      if (message.systemMessage) {
        role = 'system';
      } else if (message.sender === 'user' || !message.sender) {
        role = 'user';
      } else if (message.sender) {
        // This is a message from an agent
        const agent = agents.find(a => a._id.toString() === message.sender.toString());
        if (agent) {
          name = agent.name;
        }
      }
      
      const formattedMessage = { role, content };
      if (name) formattedMessage.name = name;
      
      return formattedMessage;
    });
  },
  
  /**
   * Group messages by date for display
   * @param {Array} messages - Message objects
   * @returns {Object} Messages grouped by date
   */
  groupMessagesByDate: (messages) => {
    if (!messages || !Array.isArray(messages)) {
      return {};
    }
    
    const groups = {};
    
    messages.forEach(message => {
      if (!message.timestamp) return;
      
      const date = new Date(message.timestamp);
      const dateString = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(message);
    });
    
    return groups;
  },
  
  /**
   * Format message date for display
   * @param {string} dateString - Date string or timestamp
   * @returns {string} Formatted date string
   */
  formatMessageDate: (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  },
  
  /**
   * Format message content with simple markdown parsing
   * @param {string} content - Raw message content
   * @returns {string} Formatted content with HTML tags
   */
  formatMessageContent: (content) => {
    if (!content) return '';
    
    let formatted = content;
    
    // Replace newlines with <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Handle code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<div class="code-block"><pre><code>${code}</code></pre></div>`;
    });
    
    // Handle inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle mentions
    formatted = formatted.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    return formatted;
  },
  
  /**
   * Export conversation to a formatted string (for download)
   * @param {Object} conversation - Conversation object
   * @param {Array} messages - Message objects
   * @param {Array} agents - Agent objects for sender lookup
   * @returns {string} Formatted conversation text
   */
  exportConversationToText: (conversation, messages, agents = []) => {
    if (!conversation || !messages || !Array.isArray(messages)) {
      return '';
    }
    
    let output = `# ${conversation.title}\n`;
    output += `${conversation.description || ''}\n\n`;
    output += `Generated on ${new Date().toLocaleString()}\n\n`;
    
    // Group messages by date
    const messagesByDate = conversationFormatter.groupMessagesByDate(messages);
    
    // Add messages to log
    Object.entries(messagesByDate).forEach(([date, dateMessages]) => {
      output += `## ${conversationFormatter.formatMessageDate(date)}\n\n`;
      
      dateMessages.forEach(message => {
        let senderName = 'Unknown';
        
        if (message.systemMessage) {
          senderName = 'SYSTEM';
        } else if (message.sender === 'user') {
          senderName = 'You';
        } else if (message.sender) {
          const agent = agents.find(a => a._id.toString() === message.sender.toString());
          if (agent) {
            senderName = agent.name;
          }
        }
        
        const timestamp = message.timestamp
          ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        
        output += `[${timestamp}] ${senderName}:\n${message.content}\n\n`;
      });
    });
    
    return output;
  }
};

module.exports = conversationFormatter;
