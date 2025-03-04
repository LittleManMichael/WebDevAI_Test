// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    const dashboard = {
      socket: null,
      stats: {
        activeProjects: 0,
        activeAgents: 0,
        completedTasks: 0,
        aiMessages: 0
      },
      projects: [],
      agents: [],
      activities: [],
      
      init: async function() {
        // Connect to WebSocket
        this.socket = io();
        
        // Setup socket listeners
        this.setupSocketListeners();
        
        // Load initial data
        await Promise.all([
          this.loadStats(),
          this.loadProjects(),
          this.loadAgents(),
          this.loadActivities()
        ]);
        
        // Set up UI event listeners
        this.setupEventListeners();
        
        // Start periodic refresh of activity data
        this.startActivityRefresh();
      },
      
      setupSocketListeners: function() {
        // Listen for stat updates
        this.socket.on('stats-updated', (stats) => {
          this.updateStats(stats);
        });
        
        // Listen for new projects
        this.socket.on('project-created', (project) => {
          this.addProject(project);
          this.showNotification(`Project "${project.name}" created successfully`, 'success');
        });
        
        // Listen for project updates
        this.socket.on('project-updated', (project) => {
          this.updateProject(project);
        });
        
        // Listen for new activities
        this.socket.on('new-activity', (activity) => {
          this.addActivity(activity);
        });
        
        // Listen for agent updates
        this.socket.on('agent-updated', (agent) => {
          this.updateAgent(agent);
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
        // Create project button
        document.getElementById('create-project-btn').addEventListener('click', () => {
          this.showCreateProjectModal();
        });
        
        // Start project button
        document.getElementById('start-project-btn').addEventListener('click', () => {
          this.createProject();
        });
        
        // Close modal when clicking outside or on close button
        document.querySelectorAll('.modal-overlay, .close-modal').forEach(element => {
          element.addEventListener('click', (event) => {
            if (event.target === element) {
              this.closeModal();
            }
          });
        });
        
        // Activity refresh button
        document.querySelector('.recent-activity .btn').addEventListener('click', () => {
          this.loadActivities();
        });
        
        // Agent workload details button
        document.querySelector('.agent-workload .btn').addEventListener('click', () => {
          window.location.href = '/agent-management.html';
        });
      },
      
      // Load dashboard statistics
      loadStats: async function() {
        try {
          const response = await fetch('/api/stats');
          this.stats = await response.json();
          this.updateStatsUI();
        } catch (error) {
          console.error('Error loading stats:', error);
        }
      },
      
      // Load projects
      loadProjects: async function() {
        try {
          const response = await fetch('/api/projects?limit=3&status=active');
          this.projects = await response.json();
          this.renderProjects();
        } catch (error) {
          console.error('Error loading projects:', error);
        }
      },
      
      // Load agents
      loadAgents: async function() {
        try {
          const response = await fetch('/api/agents?active=true');
          this.agents = await response.json();
          this.renderAgentWorkload();
        } catch (error) {
          console.error('Error loading agents:', error);
        }
      },
      
      // Load recent activities
      loadActivities: async function() {
        try {
          // Show loading state
          const activityList = document.querySelector('.activity-list');
          activityList.innerHTML = '<div class="loading">Loading activities...</div>';
          
          const response = await fetch('/api/activities?limit=5');
          this.activities = await response.json();
          this.renderActivities();
        } catch (error) {
          console.error('Error loading activities:', error);
          document.querySelector('.activity-list').innerHTML = '<div class="error-state">Failed to load activities</div>';
        }
      },
      
      // Update statistics UI
      updateStatsUI: function() {
        // Update active projects stat
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = this.stats.activeProjects;
        
        // Update active agents stat
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = this.stats.activeAgents;
        
        // Update completed tasks stat
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = this.stats.completedTasks;
        
        // Update AI messages stat
        document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = this.stats.aiMessages;
      },
      
      // Render active projects
      renderProjects: function() {
        const projectCards = document.querySelector('.project-cards');
        
        // Clear existing cards
        projectCards.innerHTML = '';
        
        if (this.projects.length === 0) {
          projectCards.innerHTML = `
            <div class="empty-state">
              <p>No active projects found. Create your first project to get started.</p>
              <button class="btn primary">Create Project</button>
            </div>
          `;
          
          // Add event listener to the create project button
          const createButton = projectCards.querySelector('.btn.primary');
          if (createButton) {
            createButton.addEventListener('click', () => {
              this.showCreateProjectModal();
            });
          }
          
          return;
        }
        
        // Add project cards
        this.projects.forEach(project => {
          projectCards.appendChild(this.createProjectCard(project));
        });
      },
      
      // Create a project card element
      createProjectCard: function(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.id = project._id;
        
        // Calculate progress percentage
        const totalTasks = project.totalTasks || 0;
        const completedTasks = project.completedTasks || 0;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Format deadline
        const deadline = project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set';
        
        card.innerHTML = `
          <div class="project-header">
            <h3>${project.name}</h3>
            <span class="status-badge ${project.status}">${this.formatStatus(project.status)}</span>
          </div>
          <p class="project-description">${project.description || 'No description available.'}</p>
          <div class="project-meta">
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Deadline: ${deadline}</span>
            </div>
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
              <span>Tasks: ${completedTasks}/${totalTasks}</span>
            </div>
          </div>
          <div class="project-agents">
            <div class="agents-list">
              ${this.renderProjectAgents(project.agents)}
            </div>
            <a href="/conversations.html?project=${project._id}" class="btn text-btn">View Conversation</a>
          </div>
          <div class="progress-bar">
            <div class="progress" style="width: ${progressPercentage}%;"></div>
          </div>
        `;
        
        return card;
      },
      
      // Render agent icons for a project
      renderProjectAgents: function(agentIds) {
        if (!agentIds || agentIds.length === 0) {
          return '<span class="no-agents">No agents assigned</span>';
        }
        
        return agentIds.map(agentId => {
          const agent = this.agents.find(a => a._id === agentId);
          if (!agent) return '';
          
          return `<img src="/img/agents/${agent.role.toLowerCase()}.png" alt="${agent.name}" title="${agent.name}">`;
        }).join('');
      },
      
      // Render recent activities
      renderActivities: function() {
        const activityList = document.querySelector('.activity-list');
        
        // Clear existing activities
        activityList.innerHTML = '';
        
        if (this.activities.length === 0) {
          activityList.innerHTML = `
            <div class="empty-state">
              <p>No recent activities found.</p>
            </div>
          `;
          return;
        }
        
        // Add activity items
        this.activities.forEach(activity => {
          activityList.appendChild(this.createActivityItem(activity));
        });
      },
      
      // Create an activity item element
      createActivityItem: function(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        // Determine icon based on activity type
        let iconClass = '';
        let iconSvg = '';
        
        switch (activity.type) {
          case 'task_completed':
            iconClass = 'check';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            break;
          case 'message':
            iconClass = 'message';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
            break;
          case 'task_started':
            iconClass = 'start';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
            break;
          case 'project_created':
            iconClass = 'create';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
            break;
          case 'file_generated':
            iconClass = 'file';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
            break;
          default:
            iconClass = 'default';
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }
        
        // Format time ago
        const timeAgo = this.formatTimeAgo(new Date(activity.timestamp));
        
        item.innerHTML = `
          <div class="activity-icon ${iconClass}">
            ${iconSvg}
          </div>
          <div class="activity-details">
            <h4>${activity.title}</h4>
            <p>${activity.description}</p>
            <span class="activity-time">${timeAgo}</span>
          </div>
        `;
        
        return item;
      },
      
      // Render agent workload
      renderAgentWorkload: function() {
        const workloadGrid = document.querySelector('.workload-grid');
        
        // Clear existing cards
        workloadGrid.innerHTML = '';
        
        if (this.agents.length === 0) {
          workloadGrid.innerHTML = `
            <div class="empty-state">
              <p>No active agents found. Create agents in the Agent Management section.</p>
              <a href="/agent-management.html" class="btn primary">Manage Agents</a>
            </div>
          `;
          return;
        }
        
        // Sort agents by workload (highest first)
        const sortedAgents = [...this.agents].sort((a, b) => (b.workload || 0) - (a.workload || 0));
        
        // Take the top 4 agents with highest workload
        const topAgents = sortedAgents.slice(0, 4);
        
        // Add agent workload cards
        topAgents.forEach(agent => {
          workloadGrid.appendChild(this.createAgentWorkloadCard(agent));
        });
      },
      
      // Create an agent workload card element
      createAgentWorkloadCard: function(agent) {
        const card = document.createElement('div');
        card.className = 'agent-workload-card';
        card.dataset.id = agent._id;
        
        // Calculate workload percentage
        const workloadPercentage = agent.workload || 0;
        
        card.innerHTML = `
          <div class="agent-info">
            <img src="/img/agents/${agent.role.toLowerCase()}.png" alt="${agent.name}">
            <div>
              <h3>${agent.name}</h3>
              <p>${agent.role}</p>
            </div>
          </div>
          <div class="workload-data">
            <div class="workload-stat">
              <span class="stat-label">Active Tasks</span>
              <span class="stat-value">${agent.activeTasks || 0}</span>
            </div>
            <div class="workload-stat">
              <span class="stat-label">Messages</span>
              <span class="stat-value">${agent.messageCount || 0}</span>
            </div>
            <div class="workload-stat">
              <span class="stat-label">Projects</span>
              <span class="stat-value">${agent.projectCount || 0}</span>
            </div>
          </div>
          <div class="workload-bar">
            <div class="workload-progress" style="width: ${workloadPercentage}%;"></div>
            <span class="workload-label">${workloadPercentage}% Capacity</span>
          </div>
        `;
        
        return card;
      },
      
      // Show create project modal
      showCreateProjectModal: function() {
        const modal = document.getElementById('create-project-modal');
        modal.classList.add('visible');
        
        // Reset form
        document.getElementById('create-project-form').reset();
        
        // Pre-select Project Manager agent (required)
        document.getElementById('agent-project-manager').checked = true;
        document.getElementById('agent-project-manager').disabled = true;
        
        // Set default deadline to 2 weeks from now
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        
        const dateInput = document.getElementById('project-deadline');
        dateInput.value = twoWeeksFromNow.toISOString().split('T')[0];
        
        // Focus on the project name input
        document.getElementById('project-name').focus();
      },
      
      // Close any open modal
      closeModal: function() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
          modal.classList.remove('visible');
        });
      },
      
      // Create a new project
      createProject: async function() {
        // Get form values
        const name = document.getElementById('project-name').value.trim();
        const description = document.getElementById('project-description').value.trim();
        const deadline = document.getElementById('project-deadline').value;
        const requirements = document.getElementById('project-requirements').value.trim();
        
        // Validate required fields
        if (!name) {
          this.showNotification('Project name is required', 'error');
          return;
        }
        
        // Get selected agents
        const selectedAgents = [];
        
        document.querySelectorAll('.agent-option input:checked').forEach(checkbox => {
          const agentRole = checkbox.id.replace('agent-', '');
          
          // Find the agent by role
          const agent = this.agents.find(a => a.role.toLowerCase() === agentRole.toLowerCase());
          if (agent) {
            selectedAgents.push(agent._id);
          }
        });
        
        // Create project data
        const projectData = {
          name,
          description,
          deadline,
          requirements,
          agents: selectedAgents,
          status: 'planning'
        };
        
        try {
          // Show loading state on the button
          const startButton = document.getElementById('start-project-btn');
          startButton.textContent = 'Creating...';
          startButton.disabled = true;
          
          // Send request to create project
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create project');
          }
          
          // Close the modal
          this.closeModal();
          
          // Show success notification (project created event will be handled by the socket)
          this.showNotification('Creating your project...', 'info');
        } catch (error) {
          console.error('Error creating project:', error);
          this.showNotification(error.message || 'Failed to create project', 'error');
        } finally {
          // Reset button state
          const startButton = document.getElementById('start-project-btn');
          startButton.textContent = 'Start Project';
          startButton.disabled = false;
        }
      },
      
      // Add a new project to the list
      addProject: function(project) {
        // Update the stats
        this.stats.activeProjects++;
        this.updateStatsUI();
        
        // Add to projects array
        this.projects.unshift(project);
        
        // If we have more than 3 projects, remove the last one
        if (this.projects.length > 3) {
          this.projects.pop();
        }
        
        // Re-render the projects
        this.renderProjects();
      },
      
      // Update an existing project
      updateProject: function(updatedProject) {
        // Find the project index
        const index = this.projects.findIndex(p => p._id === updatedProject._id);
        
        if (index > -1) {
          // Update the project
          this.projects[index] = updatedProject;
          
          // Re-render the projects
          this.renderProjects();
        }
      },
      
      // Add a new activity to the list
      addActivity: function(activity) {
        // Add to activities array
        this.activities.unshift(activity);
        
        // If we have more than 5 activities, remove the last one
        if (this.activities.length > 5) {
          this.activities.pop();
        }
        
        // Re-render the activities
        this.renderActivities();
      },
      
      // Update an agent
      updateAgent: function(updatedAgent) {
        // Find the agent index
        const index = this.agents.findIndex(a => a._id === updatedAgent._id);
        
        if (index > -1) {
          // Update the agent
          this.agents[index] = updatedAgent;
          
          // Re-render the agent workload
          this.renderAgentWorkload();
        }
      },
      
      // Update stats
      updateStats: function(newStats) {
        this.stats = newStats;
        this.updateStatsUI();
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
      
      // Format time ago for activities
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
          return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else if (diffHour < 24) {
          return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else if (diffDay < 7) {
          return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        } else {
          return date.toLocaleDateString();
        }
      },
      
      // Start periodic refresh of activity data
      startActivityRefresh: function() {
        // Refresh activities every 30 seconds
        setInterval(() => {
          this.loadActivities();
        }, 30000);
      },
      
      // Show notification
      showNotification: function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const notificationArea = document.getElementById('notification-area');
        notificationArea.appendChild(notification);
        
        // Remove notification after a delay
        setTimeout(() => {
          notification.classList.add('hiding');
          setTimeout(() => {
            notification.remove();
          }, 300);
        }, 5000);
      }
    };
    
    // Initialize the dashboard
    dashboard.init();
  });