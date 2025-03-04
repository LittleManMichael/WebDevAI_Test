// public/js/agent-management.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the agent management system
    const agentManager = {
      agents: [],
      selectedAgent: null,
      
      init: async function() {
        // Load existing agents from the server
        await this.loadAgents();
        
        // Set up event listeners
        document.getElementById('create-agent-btn').addEventListener('click', this.showCreateAgentModal.bind(this));
        document.getElementById('save-agent-btn').addEventListener('click', this.saveAgent.bind(this));
        document.getElementById('agent-list').addEventListener('click', this.handleAgentSelection.bind(this));
        document.getElementById('delete-agent-btn').addEventListener('click', this.deleteAgent.bind(this));
        document.getElementById('test-agent-btn').addEventListener('click', this.testAgent.bind(this));
      },
      
      // Load agents from the server
      loadAgents: async function() {
        try {
          const response = await fetch('/api/agents');
          this.agents = await response.json();
          this.renderAgentList();
        } catch (error) {
          console.error('Error loading agents:', error);
          showNotification('Failed to load agents', 'error');
        }
      },
      
      // Render the list of agents in the sidebar
      renderAgentList: function() {
        const listElement = document.getElementById('agent-list');
        listElement.innerHTML = '';
        
        this.agents.forEach(agent => {
          const listItem = document.createElement('div');
          listItem.className = 'agent-list-item';
          listItem.dataset.id = agent._id;
          
          // Add active status indicator
          const statusIndicator = document.createElement('span');
          statusIndicator.className = `status-indicator ${agent.active ? 'active' : 'inactive'}`;
          listItem.appendChild(statusIndicator);
          
          // Add agent name and role
          const agentInfo = document.createElement('div');
          agentInfo.className = 'agent-info';
          
          const agentName = document.createElement('h3');
          agentName.textContent = agent.name;
          agentInfo.appendChild(agentName);
          
          const agentRole = document.createElement('p');
          agentRole.textContent = agent.role;
          agentInfo.appendChild(agentRole);
          
          listItem.appendChild(agentInfo);
          
          // Add model badge
          const modelBadge = document.createElement('span');
          modelBadge.className = `model-badge ${agent.model}`;
          modelBadge.textContent = agent.model === 'claude' ? 'Claude' : 'GPT';
          listItem.appendChild(modelBadge);
          
          listElement.appendChild(listItem);
        });
      },
      
      // Show the create/edit agent modal
      showCreateAgentModal: function(event) {
        // Reset the form
        document.getElementById('agent-form').reset();
        this.selectedAgent = null;
        
        // Show the modal
        document.getElementById('agent-modal').classList.add('visible');
        document.getElementById('agent-modal-title').textContent = 'Create New Agent';
        document.getElementById('delete-agent-btn').style.display = 'none';
      },
      
      // Show the edit agent modal with agent data
      showEditAgentModal: function(agent) {
        // Fill the form with agent data
        document.getElementById('agent-name').value = agent.name;
        document.getElementById('agent-role').value = agent.role;
        document.getElementById('agent-model').value = agent.model;
        document.getElementById('agent-system-prompt').value = agent.systemPrompt;
        document.getElementById('agent-expertise').value = agent.expertise.join(', ');
        document.getElementById('agent-communication-style').value = agent.communicationStyle;
        document.getElementById('agent-output-format').value = agent.outputFormat;
        document.getElementById('agent-active').checked = agent.active;
        
        // Set the selected agent
        this.selectedAgent = agent;
        
        // Show the modal
        document.getElementById('agent-modal').classList.add('visible');
        document.getElementById('agent-modal-title').textContent = 'Edit Agent';
        document.getElementById('delete-agent-btn').style.display = 'block';
      },
      
      // Save the agent (create or update)
      saveAgent: async function() {
        // Get form data
        const agentData = {
          name: document.getElementById('agent-name').value,
          role: document.getElementById('agent-role').value,
          model: document.getElementById('agent-model').value,
          systemPrompt: document.getElementById('agent-system-prompt').value,
          expertise: document.getElementById('agent-expertise').value.split(',').map(item => item.trim()),
          communicationStyle: document.getElementById('agent-communication-style').value,
          outputFormat: document.getElementById('agent-output-format').value,
          active: document.getElementById('agent-active').checked
        };
        
        try {
          let response;
          
          if (this.selectedAgent) {
            // Update existing agent
            response = await fetch(`/api/agents/${this.selectedAgent._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(agentData)
            });
          } else {
            // Create new agent
            response = await fetch('/api/agents', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(agentData)
            });
          }
          
          if (response.ok) {
            // Reload agents and close modal
            await this.loadAgents();
            this.closeModal();
            showNotification(`Agent ${this.selectedAgent ? 'updated' : 'created'} successfully`, 'success');
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save agent');
          }
        } catch (error) {
          console.error('Error saving agent:', error);
          showNotification(error.message, 'error');
        }
      },
      
      // Handle agent selection from the list
      handleAgentSelection: function(event) {
        const listItem = event.target.closest('.agent-list-item');
        if (!listItem) return;
        
        const agentId = listItem.dataset.id;
        const agent = this.agents.find(a => a._id === agentId);
        
        if (agent) {
          // Select the agent and show its details
          this.selectAgent(agent);
        }
      },
      
      // Select an agent and display its details
      selectAgent: function(agent) {
        // Highlight the selected agent in the list
        const listItems = document.querySelectorAll('.agent-list-item');
        listItems.forEach(item => {
          item.classList.remove('selected');
          if (item.dataset.id === agent._id) {
            item.classList.add('selected');
          }
        });
        
        // Display agent details in the main panel
        const detailsPanel = document.getElementById('agent-details');
        detailsPanel.innerHTML = `
          <div class="agent-header">
            <h2>${agent.name}</h2>
            <span class="model-badge ${agent.model}">${agent.model === 'claude' ? 'Claude' : 'GPT'}</span>
            <span class="status-badge ${agent.active ? 'active' : 'inactive'}">${agent.active ? 'Active' : 'Inactive'}</span>
          </div>
          
          <div class="detail-item">
            <h3>Role</h3>
            <p>${agent.role}</p>
          </div>
          
          <div class="detail-item">
            <h3>Expertise</h3>
            <ul>
              ${agent.expertise.map(exp => `<li>${exp}</li>`).join('')}
            </ul>
          </div>
          
          <div class="detail-item">
            <h3>Communication Style</h3>
            <p>${agent.communicationStyle}</p>
          </div>
          
          <div class="detail-item">
            <h3>Output Format</h3>
            <p>${agent.outputFormat}</p>
          </div>
          
          <div class="detail-item">
            <h3>System Prompt</h3>
            <pre>${agent.systemPrompt}</pre>
          </div>
          
          <div class="agent-actions">
            <button id="edit-agent-btn" class="btn primary">Edit Agent</button>
            <button id="test-agent-btn" class="btn secondary">Test Agent</button>
          </div>
        `;
        
        // Set up event listeners for the detail panel buttons
        document.getElementById('edit-agent-btn').addEventListener('click', () => this.showEditAgentModal(agent));
        document.getElementById('test-agent-btn').addEventListener('click', () => this.testAgent(agent));
        
        // Store the selected agent
        this.selectedAgent = agent;
      },
      
      // Delete the currently selected agent
      deleteAgent: async function() {
        if (!this.selectedAgent) return;
        
        if (!confirm(`Are you sure you want to delete the agent "${this.selectedAgent.name}"?`)) {
          return;
        }
        
        try {
          const response = await fetch(`/api/agents/${this.selectedAgent._id}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            // Reload agents and close modal
            await this.loadAgents();
            this.closeModal();
            document.getElementById('agent-details').innerHTML = '<p class="empty-state">Select an agent to view details</p>';
            showNotification('Agent deleted successfully', 'success');
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete agent');
          }
        } catch (error) {
          console.error('Error deleting agent:', error);
          showNotification(error.message, 'error');
        }
      },
      
      // Test the agent with a sample prompt
      testAgent: async function() {
        if (!this.selectedAgent) return;
        
        // Show the test dialog
        const testDialog = document.getElementById('test-agent-dialog');
        testDialog.classList.add('visible');
        
        // Set up the test form
        document.getElementById('test-agent-name').textContent = this.selectedAgent.name;
        document.getElementById('test-prompt-form').addEventListener('submit', async (event) => {
          event.preventDefault();
          
          const testPrompt = document.getElementById('test-prompt').value;
          if (!testPrompt.trim()) return;
          
          // Show loading state
          document.getElementById('test-response').innerHTML = '<p class="loading">Generating response...</p>';
          
          try {
            const response = await fetch(`/api/agents/${this.selectedAgent._id}/test`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ prompt: testPrompt })
            });
            
            if (response.ok) {
              const result = await response.json();
              document.getElementById('test-response').innerHTML = `<pre>${result.response}</pre>`;
            } else {
              const error = await response.json();
              throw new Error(error.message || 'Failed to test agent');
            }
          } catch (error) {
            console.error('Error testing agent:', error);
            document.getElementById('test-response').innerHTML = `<p class="error">Error: ${error.message}</p>`;
          }
        });
        
        // Set up close button
        document.getElementById('close-test-dialog').addEventListener('click', () => {
          testDialog.classList.remove('visible');
        });
      },
      
      // Close any open modal
      closeModal: function() {
        document.getElementById('agent-modal').classList.remove('visible');
        document.getElementById('test-agent-dialog').classList.remove('visible');
      }
    };
    
    // Initialize the agent manager
    agentManager.init();
    
    // Helper function to show notifications
    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      
      document.getElementById('notification-area').appendChild(notification);
      
      // Remove the notification after 3 seconds
      setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
    
    // Close modal when clicking outside or on close button
    document.querySelectorAll('.modal-overlay, .close-modal').forEach(element => {
      element.addEventListener('click', function(event) {
        if (event.target === this) {
          agentManager.closeModal();
        }
      });
    });
  });