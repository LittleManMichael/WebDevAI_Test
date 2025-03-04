// public/js/conversations.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the conversation manager
    const conversationManager = {
      socket: null,
      currentConversation: null,
      conversations: [],
      agents: [],
      
      init: async function() {
        // Connect to WebSocket
        this.socket = io();
        
        // Set up socket event listeners
        this.setupSocketListeners();
        
        // Load data
        await Promise.all([
          this.loadConversations(),
          this.loadAgents()
        ]);
        
        // Set up UI event listeners
        this.setupEventListeners();
        
        // Load the first conversation by default
        if (this.conversations.length > 0) {
          this.loadConversation(this.conversations[0]._id);
        }
      },
      
      setupSocketListeners: function() {
        // Listen for new messages
        this.socket.on('new-message', (message) => {
          if (this.currentConversation && 
              (message.conversationId === this.currentConversation._id)) {
            this.appendMessage(message);
            this.scrollToBottom();
          }
          
          // Update conversation list item if needed
          this.updateConversationListItem(message.conversationId, message);
        });
        
        // Listen for conversation updates
        this.socket.on('conversation-updated', (conversation) => {
          this.updateConversationInList(conversation);
          
          if (this.currentConversation && conversation._id === this.currentConversation._id) {
            this.currentConversation = conversation;
            this.updateConversationHeader();
          }
        });
        
        // Listen for new conversations
        this.socket.on('new-conversation', (conversation) => {
          this.conversations.unshift(conversation);
          this.renderConversationList();
        });
        
        // Handle connection events
        this.socket.on('connect', () => {
          console.log('Connected to server');
          document.body.classList.remove('offline');
        });
        
        this.socket.on('disconnect', () => {
          console.log('Disconnected from server');
          document.body.classList.add('offline');
        });
      },
      
      setupEventListeners: function() {
        // Conversation list click
        document.querySelector('.conversation-list').addEventListener('click', (event) => {
          const conversationItem = event.target.closest('.conversation-item');
          if (conversationItem) {
            const conversationId = conversationItem.dataset.id;
            this.loadConversation(conversationId);
          }
        });
        
        // Message composer
        const messageForm = document.querySelector('.message-composer');
        const messageInput = messageForm.querySelector('textarea');
        
        messageForm.addEventListener('submit', (event) => {
          event.preventDefault();
          
          const message = messageInput.value.trim();
          if (message && this.currentConversation) {
            this.sendMessage(message);
            messageInput.value = '';
          }
        });
        
        // Enter key to send
        messageInput.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const message = messageInput.value.trim();
            if (message && this.currentConversation) {
              this.sendMessage(message);
              messageInput.value = '';
            }
          }
        });
        
        // Chat header actions
        document.querySelector('.chat-actions').addEventListener('click', (event) => {
          const button = event.target.closest('button');
          if (!button) return;
          
          const action = button.getAttribute('title');
          
          switch (action) {
            case 'Pin Conversation':
              this.pinCurrentConversation();
              break;
            case 'Share Conversation':
              this.shareCurrentConversation();
              break;
            case 'Download Chat Log':
              this.downloadChatLog();
              break;
            case 'View Information':
              this.toggleInfoSidebar();
              break;
          }
        });
        
        // Close info sidebar button
        document.querySelector('.close-sidebar-btn').addEventListener('click', () => {
          document.querySelector('.agent-info-sidebar').classList.remove('visible');
        });
        
        // Search box
        const searchInput = document.querySelector('.search-box input');
        searchInput.addEventListener('input', (event) => {
          const searchTerm = event.target.value.toLowerCase();
          this.filterConversationList(searchTerm);
        });
        
        // Filter dropdowns
        document.getElementById('filter-project').addEventListener('change', () => {
          this.applyFilters();
        });
        
        document.getElementById('filter-date').addEventListener('change', () => {
          this.applyFilters();
        });
        
        // View controls (List/Grid view)
        document.querySelector('.view-controls').addEventListener('click', (event) => {
          const button = event.target.closest('button');
          if (!button) return;
          
          // Toggle active class
          document.querySelectorAll('.view-controls .btn').forEach(btn => {
            btn.classList.remove('active');
          });
          button.classList.add('active');
          
          // Toggle view
          const isGridView = button.title === 'Grid View';
          document.querySelector('.conversation-list').classList.toggle('grid-view', isGridView);
        });
      },
      
      // Load conversations from the server
      loadConversations: async function() {
        try {
          const response = await fetch('/api/conversations');
          this.conversations = await response.json();
          this.renderConversationList();
        } catch (error) {
          console.error('Error loading conversations:', error);
          this.showNotification('Failed to load conversations', 'error');
        }
      },
      
      // Load agents from the server
      loadAgents: async function() {
        try {
          const response = await fetch('/api/agents');
          this.agents = await response.json();
        } catch (error) {
          console.error('Error loading agents:', error);
        }
      },
      
      // Render the list of conversations in the sidebar
      renderConversationList: function() {
        const listElement = document.querySelector('.conversation-list');
        
        // Clear existing items except for any that might be placeholders
        const existingItems = listElement.querySelectorAll('.conversation-item');
        existingItems.forEach(item => {
          if (!item.classList.contains('empty-state')) {
            item.remove();
          }
        });
        
        // Check if we have conversations
        if (this.conversations.length === 0) {
          const emptyState = document.createElement('div');
          emptyState.className = 'empty-state';
          emptyState.innerHTML = `
            <p>No conversations yet</p>
            <button class="btn primary">Start a New Conversation</button>
          `;
          listElement.appendChild(emptyState);
          return;
        }
        
        // Hide any empty state message
        const emptyState = listElement.querySelector('.empty-state');
        if (emptyState) {
          emptyState.style.display = 'none';
        }
        
        // Add conversation items
        this.conversations.forEach(conversation => {
          const item = this.createConversationListItem(conversation);
          listElement.appendChild(item);
        });
      },
      
      // Create a single conversation list item
      createConversationListItem: function(conversation) {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.id = conversation._id;
        
        // Set active class if this is the current conversation
        if (this.currentConversation && conversation._id === this.currentConversation._id) {
          item.classList.add('active');
        }
        
        // Determine icon type based on conversation type
        let iconSvg = '';
        let iconClass = '';
        
        switch (conversation.type) {
          case 'project':
            iconClass = 'project';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"></path></svg>';
            break;
          case 'direct':
            iconClass = 'direct';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 6.1H3"></path><path d="M21 12.1H3"></path><path d="M15.1 18H3"></path></svg>';
            break;
          case 'task':
            iconClass = 'task';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>';
            break;
          default:
            iconClass = 'default';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        }
        
        // Format time
        const timeAgo = this.formatTimeAgo(new Date(conversation.updatedAt || conversation.createdAt));
        
        item.innerHTML = `
          <div class="conversation-icon ${iconClass}">
            ${iconSvg}
          </div>
          <div class="conversation-details">
            <h3>${conversation.title}</h3>
            <p class="conversation-description">${conversation.description || ''}</p>
            <div class="conversation-meta">
              <span class="conversation-time">${timeAgo}</span>
              <span class="message-count">${conversation.messageCount || 0} messages</span>
            </div>
          </div>
        `;
        
        return item;
      },
      
      // Load a specific conversation
      loadConversation: async function(conversationId) {
        try {
          // Show loading state
          document.querySelector('.chat-body').innerHTML = '<div class="loading-messages">Loading conversation...</div>';
          
          // Fetch conversation details
          const response = await fetch(`/api/conversations/${conversationId}`);
          const conversation = await response.json();
          
          this.currentConversation = conversation;
          
          // Update the conversation list (highlight active)
          document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === conversationId);
          });
          
          // Update the conversation header
          this.updateConversationHeader();
          
          // Load messages
          const messagesResponse = await fetch(`/api/conversations/${conversationId}/messages`);
          const messages = await messagesResponse.json();
          
          // Render messages
          this.renderMessages(messages);
          
          // Scroll to bottom
          this.scrollToBottom();
          
          // Update the info sidebar
          this.updateInfoSidebar();
        } catch (error) {
          console.error('Error loading conversation:', error);
          document.querySelector('.chat-body').innerHTML = '<div class="error-state">Failed to load conversation</div>';
        }
      },
      
      // Update the conversation header with current conversation details
      updateConversationHeader: function() {
        if (!this.currentConversation) return;
        
        const headerTitle = document.querySelector('.chat-title h2');
        const headerDescription = document.querySelector('.chat-title p');
        
        headerTitle.textContent = this.currentConversation.title;
        headerDescription.textContent = this.currentConversation.description || '';
      },
      
      // Render messages in the chat body
      renderMessages: function(messages) {
        if (!messages || messages.length === 0) {
          document.querySelector('.chat-body').innerHTML = `
            <div class="empty-chat">
              <div class="empty-chat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3>No messages yet</h3>
              <p>Start the conversation by typing a message below.</p>
            </div>
          `;
          return;
        }
        
        const chatBody = document.querySelector('.chat-body');
        chatBody.innerHTML = '';
        
        // Group messages by date
        const messagesByDate = this.groupMessagesByDate(messages);
        
        // Render each date group
        Object.entries(messagesByDate).forEach(([date, dateMessages]) => {
          const messageGroup = document.createElement('div');
          messageGroup.className = 'message-group';
          
          // Add date divider
          const dateDivider = document.createElement('div');
          dateDivider.className = 'message-date-divider';
          dateDivider.innerHTML = `<span>${this.formatMessageDate(date)}</span>`;
          messageGroup.appendChild(dateDivider);
          
          // Add messages for this date
          dateMessages.forEach(message => {
            messageGroup.appendChild(this.createMessageElement(message));
          });
          
          chatBody.appendChild(messageGroup);
        });
      },
      
      // Group messages by date (for date separators)
      groupMessagesByDate: function(messages) {
        const groups = {};
        
        messages.forEach(message => {
          const date = new Date(message.timestamp);
          const dateString = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          
          if (!groups[dateString]) {
            groups[dateString] = [];
          }
          
          groups[dateString].push(message);
        });
        
        return groups;
      },
      
      // Create a single message element
      createMessageElement: function(message) {
        const messageEl = document.createElement('div');
        
        // Determine message type
        if (message.systemMessage) {
          // System message
          messageEl.className = 'message system';
          messageEl.innerHTML = `
            <div class="message-content">
              <p>${message.content}</p>
            </div>
            <div class="message-time">${this.formatMessageTime(message.timestamp)}</div>
          `;
        } else {
          // Regular message
          const isCurrentUser = message.sender === 'user';
          messageEl.className = `message ${isCurrentUser ? 'you' : ''}`;
          
          // Find agent details if it's an agent message
          let senderName = 'Unknown';
          let avatarUrl = '/img/default-avatar.png';
          
          if (isCurrentUser) {
            senderName = 'You';
            avatarUrl = '/img/user-avatar.png';
          } else if (message.sender) {
            // Find the agent
            const agent = this.agents.find(a => a._id === message.sender);
            if (agent) {
              senderName = agent.name;
              avatarUrl = `/img/agents/${agent.role.toLowerCase()}.png`;
            }
          }
          
          messageEl.innerHTML = `
            <div class="message-avatar">
              <img src="${avatarUrl}" alt="${senderName}">
            </div>
            <div class="message-bubble">
              <div class="message-header">
                <span class="message-sender">${senderName}</span>
                <span class="message-time">${this.formatMessageTime(message.timestamp)}</span>
              </div>
              <div class="message-content">
                ${this.formatMessageContent(message.content)}
              </div>
            </div>
          `;
        }
        
        return messageEl;
      },
      
      // Format message content (handle markdown, code blocks, etc.)
      formatMessageContent: function(content) {
        if (!content) return '';
        
        // Replace newlines with <br>
        let formatted = content.replace(/\n/g, '<br>');
        
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
      
      // Append a new message to the chat
      appendMessage: function(message) {
        const chatBody = document.querySelector('.chat-body');
        
        // Check if we need to add a new date divider
        const messageDate = new Date(message.timestamp);
        const dateString = `${messageDate.getFullYear()}-${messageDate.getMonth()}-${messageDate.getDate()}`;
        
        let messageGroup = chatBody.querySelector('.message-group:last-child');
        const lastDateDivider = messageGroup ? messageGroup.querySelector('.message-date-divider span') : null;
        
        // If no message group or different date, create a new group
        if (!messageGroup || lastDateDivider.textContent !== this.formatMessageDate(dateString)) {
          messageGroup = document.createElement('div');
          messageGroup.className = 'message-group';
          
          const dateDivider = document.createElement('div');
          dateDivider.className = 'message-date-divider';
          dateDivider.innerHTML = `<span>${this.formatMessageDate(dateString)}</span>`;
          messageGroup.appendChild(dateDivider);
          
          chatBody.appendChild(messageGroup);
        }
        
        // Add the message to the group
        messageGroup.appendChild(this.createMessageElement(message));
      },
      
      // Send a message
      sendMessage: function(content) {
        if (!this.currentConversation) return;
        
        // Create message object
        const message = {
          sender: 'user',
          content: content,
          conversationId: this.currentConversation._id,
          timestamp: new Date().toISOString()
        };
        
        // Optimistically add message to UI
        this.appendMessage(message);
        this.scrollToBottom();
        
        // Send to server
        this.socket.emit('send-message', message);
      },
      
      // Update conversation list item with latest message
      updateConversationListItem: function(conversationId, message) {
        // Find the conversation in our list
        const conversation = this.conversations.find(c => c._id === conversationId);
        if (!conversation) return;
        
        // Update the conversation
        conversation.updatedAt = message.timestamp;
        conversation.messageCount = (conversation.messageCount || 0) + 1;
        
        // Re-render the conversation list
        this.renderConversationList();
      },
      
      // Update conversation in the list
      updateConversationInList: function(updatedConversation) {
        const index = this.conversations.findIndex(c => c._id === updatedConversation._id);
        
        if (index > -1) {
          this.conversations[index] = updatedConversation;
          this.renderConversationList();
        }
      },
      
      // Filter conversation list by search term
      filterConversationList: function(searchTerm) {
        if (!searchTerm) {
          // Show all conversations
          document.querySelectorAll('.conversation-item').forEach(item => {
            item.style.display = 'flex';
          });
          return;
        }
        
        // Filter by title and description
        document.querySelectorAll('.conversation-item').forEach(item => {
          const title = item.querySelector('h3').textContent.toLowerCase();
          const description = item.querySelector('.conversation-description').textContent.toLowerCase();
          
          if (title.includes(searchTerm) || description.includes(searchTerm)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      },
      
      // Apply filters from dropdowns
      applyFilters: function() {
        const projectFilter = document.getElementById('filter-project').value;
        const dateFilter = document.getElementById('filter-date').value;
        
        document.querySelectorAll('.conversation-item').forEach(item => {
          const conversationId = item.dataset.id;
          const conversation = this.conversations.find(c => c._id === conversationId);
          
          if (!conversation) return;
          
          let showItem = true;
          
          // Apply project filter
          if (projectFilter && conversation.projectId !== projectFilter) {
            showItem = false;
          }
          
          // Apply date filter
          if (dateFilter && showItem) {
            const date = new Date(conversation.updatedAt || conversation.createdAt);
            const now = new Date();
            
            switch (dateFilter) {
              case 'today':
                showItem = date.toDateString() === now.toDateString();
                break;
              case 'yesterday':
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                showItem = date.toDateString() === yesterday.toDateString();
                break;
              case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                showItem = date >= weekAgo;
                break;
              case 'month':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                showItem = date >= monthAgo;
                break;
            }
          }
          
          item.style.display = showItem ? 'flex' : 'none';
        });
      },
      
      // Pin the current conversation
      pinCurrentConversation: function() {
        if (!this.currentConversation) return;
        
        this.socket.emit('pin-conversation', {
          conversationId: this.currentConversation._id,
          pinned: !this.currentConversation.pinned
        });
        
        // Update locally while waiting for server response
        this.currentConversation.pinned = !this.currentConversation.pinned;
        
        // Show notification
        this.showNotification(
          this.currentConversation.pinned ? 'Conversation pinned' : 'Conversation unpinned',
          'success'
        );
      },
      
      // Share the current conversation
      shareCurrentConversation: function() {
        if (!this.currentConversation) return;
        
        // Create a shareable link
        const shareLink = `${window.location.origin}/conversations/shared/${this.currentConversation._id}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareLink).then(() => {
          this.showNotification('Share link copied to clipboard', 'success');
        }).catch(err => {
          console.error('Failed to copy link:', err);
          this.showNotification('Failed to copy share link', 'error');
        });
      },
      
      // Download chat log
      downloadChatLog: async function() {
        if (!this.currentConversation) return;
        
        try {
          // Fetch all messages for the conversation
          const response = await fetch(`/api/conversations/${this.currentConversation._id}/messages`);
          const messages = await response.json();
          
          // Create a formatted log
          let log = `# ${this.currentConversation.title}\n`;
          log += `${this.currentConversation.description || ''}\n\n`;
          log += `Generated on ${new Date().toLocaleString()}\n\n`;
          
          // Group messages by date
          const messagesByDate = this.groupMessagesByDate(messages);
          
          // Add messages to log
          Object.entries(messagesByDate).forEach(([date, dateMessages]) => {
            log += `## ${this.formatMessageDate(date)}\n\n`;
            
            dateMessages.forEach(message => {
              if (message.systemMessage) {
                log += `[${this.formatMessageTime(message.timestamp)}] SYSTEM: ${message.content}\n\n`;
              } else {
                let senderName = 'Unknown';
                
                if (message.sender === 'user') {
                  senderName = 'You';
                } else {
                  const agent = this.agents.find(a => a._id === message.sender);
                  if (agent) {
                    senderName = agent.name;
                  }
                }
                
                log += `[${this.formatMessageTime(message.timestamp)}] ${senderName}:\n${message.content}\n\n`;
              }
            });
          });
          
          // Create download link
          const blob = new Blob([log], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.currentConversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-chat-log.md`;
          a.click();
          
          // Clean up
          URL.revokeObjectURL(url);
          
          this.showNotification('Chat log downloaded', 'success');
        } catch (error) {
          console.error('Error downloading chat log:', error);
          this.showNotification('Failed to download chat log', 'error');
        }
      },
      
      // Toggle info sidebar
      toggleInfoSidebar: function() {
        const sidebar = document.querySelector('.agent-info-sidebar');
        sidebar.classList.toggle('visible');
        
        if (sidebar.classList.contains('visible')) {
          this.updateInfoSidebar();
        }
      },
      
      // Update info sidebar with current conversation details
      updateInfoSidebar: function() {
        if (!this.currentConversation) return;
        
        const sidebar = document.querySelector('.agent-info-sidebar');
        
        // Only update if sidebar is visible
        if (!sidebar.classList.contains('visible')) return;
        
        // Update project info
        sidebar.querySelector('h3').textContent = this.currentConversation.title;
        
        const descriptionEl = sidebar.querySelector('.project-description');
        if (descriptionEl) {
          descriptionEl.textContent = this.currentConversation.description || 'No description available';
        }
        
        // Update status
        const statusBadge = sidebar.querySelector('.status-badge');
        if (statusBadge) {
          statusBadge.className = `status-badge ${this.currentConversation.status || 'in-progress'}`;
          statusBadge.textContent = this.formatStatus(this.currentConversation.status || 'in-progress');
        }
        
        // Update timeline
        const timelineSection = sidebar.querySelector('.info-section:nth-of-type(2)');
        if (timelineSection) {
          const startDate = new Date(this.currentConversation.createdAt).toLocaleDateString();
          const deadlineDate = this.currentConversation.deadline ? new Date(this.currentConversation.deadline).toLocaleDateString() : 'Not set';
          
          timelineSection.innerHTML = `
            <h4>Timeline</h4>
            <p>Started: ${startDate}</p>
            <p>Deadline: ${deadlineDate}</p>
          `;
        }
        
        // Update participants
        // This would require fetching detailed participant info from the server
      },
      
      // Format message date for display
      formatMessageDate: function(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
          return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          return 'Yesterday';
        } else {
          return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        }
      },
      
      // Format message time for display
      formatMessageTime: function(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      },
      
      // Format time ago for conversation list
      formatTimeAgo: function(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
          return 'just now';
        } else if (diffMin < 60) {
          return `${diffMin} min ago`;
        } else if (diffHour < 24) {
          return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else if (diffDay < 7) {
          return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        } else {
          return date.toLocaleDateString();
        }
      },
      
      // Format status for display
      formatStatus: function(status) {
        switch (status) {
          case 'planning':
            return 'Planning';
          case 'in-progress':
            return 'In Progress';
          case 'review':
            return 'Under Review';
          case 'completed':
            return 'Completed';
          default:
            return status.charAt(0).toUpperCase() + status.slice(1);
        }
      },
      
      // Scroll chat to bottom
      scrollToBottom: function() {
        const chatBody = document.querySelector('.chat-body');
        chatBody.scrollTop = chatBody.scrollHeight;
      },
      
      // Show notification
      showNotification: function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
          // Create notification area if it doesn't exist
          const notificationArea = document.createElement('div');
          notificationArea.id = 'notification-area';
          notificationArea.className = 'notification-area';
          document.body.appendChild(notificationArea);
        }
        
        notificationArea.appendChild(notification);
        
        // Remove notification after a delay
        setTimeout(() => {
          notification.classList.add('hiding');
          setTimeout(() => {
            notification.remove();
          }, 300);
        }, 3000);
      }
    };
    
    // Initialize the conversation manager
    conversationManager.init();
  });