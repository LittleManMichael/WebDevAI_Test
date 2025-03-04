/**
 * Application constants
 */
module.exports = {
    // Agent roles
    AGENT_ROLES: {
      PROJECT_MANAGER: 'Project Manager',
      ARCHITECT: 'Architect',
      FRONTEND: 'Frontend',
      BACKEND: 'Backend',
      CONTENT: 'Content',
      TESTING: 'Testing'
    },
    
    // Project statuses
    PROJECT_STATUS: {
      PLANNING: 'planning',
      IN_PROGRESS: 'in-progress',
      REVIEW: 'review',
      COMPLETED: 'completed'
    },
    
    // Task statuses
    TASK_STATUS: {
      PENDING: 'pending',
      IN_PROGRESS: 'in-progress',
      REVIEW: 'review',
      COMPLETED: 'completed'
    },
    
    // Task priorities
    TASK_PRIORITY: {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      URGENT: 'urgent'
    },
    
    // Activity types
    ACTIVITY_TYPES: {
      PROJECT_CREATED: 'project_created',
      PROJECT_UPDATED: 'project_updated',
      PROJECT_COMPLETED: 'project_completed',
      TASK_CREATED: 'task_created',
      TASK_STARTED: 'task_started',
      TASK_COMPLETED: 'task_completed',
      MESSAGE: 'message',
      FILE_GENERATED: 'file_generated',
      AGENT_CREATED: 'agent_created',
      AGENT_UPDATED: 'agent_updated'
    },
    
    // File types
    FILE_TYPES: {
      IMAGE: 'image',
      DOCUMENT: 'document',
      CODE: 'code',
      ARCHIVE: 'archive',
      OTHER: 'other'
    },
    
    // AI response timeout (ms)
    AI_RESPONSE_TIMEOUT: 60000,
    
    // Default pagination limits
    DEFAULT_PAGE_SIZE: 20
  };
  