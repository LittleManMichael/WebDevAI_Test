// utils/ai-prompt-builder.js

/**
 * Utility for building structured AI prompts
 */
const aiPromptBuilder = {
  /**
   * Build a project planning prompt for the Project Manager agent
   * @param {Object} project - Project data
   * @returns {string} Formatted prompt
   */
  buildProjectPlanningPrompt: (project) => {
    return `
# Project Planning Request
## Project: ${project.name}

### Description
${project.description || 'No description provided.'}

### Requirements
${project.requirements || 'No specific requirements provided.'}

### Instructions
As the Project Manager, please create a detailed project plan for this web development project.
Your plan should include:

1. A breakdown of the major components required
2. Specific tasks for each component, organized by development phase 
3. Suggested task assignments based on agent specialties
4. Estimated time frames for each task
5. Dependencies between tasks
6. Potential risks and mitigation strategies

Please structure your response as a comprehensive project plan that can be used to guide our team through successful implementation.
`;
  },

  /**
   * Build a task details prompt for an agent
   * @param {Object} task - Task data 
   * @param {Object} agent - Agent data
   * @param {Object} project - Project data
   * @returns {string} Formatted prompt
   */
  buildTaskDetailsPrompt: (task, agent, project) => {
    return `
# Task Assignment
## Task: ${task.title}
## Assigned to: ${agent.name} (${agent.role})
## Project: ${project ? project.name : 'N/A'}

### Task Description
${task.description || 'No description provided.'}

### Priority
${task.priority.toUpperCase()}

### Dependencies
${task.dependencies && task.dependencies.length > 0 ? 
  task.dependencies.map(dep => `- ${dep.title}`).join('\n') : 
  'No dependencies'}

### Instructions
Please review this task and provide:
1. Your understanding of the requirements
2. Any questions or clarifications needed
3. Your approach to completing this task
4. Estimated time to completion
5. Any resources or assistance you will need

Your expertise as ${agent.role} is essential for this project component.
`;
  },

  /**
   * Build a code generation prompt
   * @param {string} language - Programming language
   * @param {string} description - Code description
   * @param {Array} requirements - Specific requirements
   * @returns {string} Formatted prompt
   */
  buildCodeGenerationPrompt: (language, description, requirements = []) => {
    const requirementsList = requirements.length > 0 
      ? requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')
      : 'No specific requirements provided.';
      
    return `
# Code Generation Request
## Language: ${language}

### Description
${description}

### Requirements
${requirementsList}

### Instructions
Please generate well-structured, clean code that meets the description and requirements above.
Your code should:
- Follow best practices for ${language}
- Include appropriate error handling
- Be well-commented
- Be modular and maintainable
- Handle edge cases appropriately

Please provide the complete code implementation along with a brief explanation of how it works.
`;
  },

  /**
   * Build a review request prompt
   * @param {string} contentType - Type of content to review (code, design, document)
   * @param {string} content - The content to review
   * @returns {string} Formatted prompt
   */
  buildReviewPrompt: (contentType, content) => {
    return `
# Review Request
## Content Type: ${contentType}

### Content to Review
${content}

### Review Instructions
Please provide a thorough review of this ${contentType}, focusing on:
1. Correctness and accuracy
2. Adherence to best practices
3. Potential improvements
4. Any issues or bugs
5. Overall quality assessment

Provide specific feedback with line numbers or references where applicable.
`;
  },

  /**
   * Build a technical discussion prompt
   * @param {string} topic - Discussion topic
   * @param {string} context - Background context
   * @returns {string} Formatted prompt
   */
  buildTechnicalDiscussionPrompt: (topic, context) => {
    return `
# Technical Discussion: ${topic}

### Context
${context}

### Discussion Points
Please provide your expert analysis and recommendations on this topic. Consider:
1. Technical implications
2. Potential approaches
3. Pros and cons of different solutions
4. Best practices relevant to this scenario
5. Any additional considerations we should keep in mind

Your specialized expertise is valuable for making an informed decision.
`;
  },
  
  /**
   * Build an agent collaboration prompt
   * @param {Array} agents - List of agents involved
   * @param {string} task - Task description
   * @returns {string} Formatted prompt
   */
  buildCollaborationPrompt: (agents, task) => {
    const agentsList = agents.map(agent => `- ${agent.name} (${agent.role})`).join('\n');
    
    return `
# Collaboration Request
## Task: ${task}

### Team Members
${agentsList}

### Collaboration Instructions
Please work together with the team members listed above to address this task.
Each team member should contribute based on their specialized role and expertise.

The collaboration should:
1. Respect each team member's area of expertise
2. Build upon each other's contributions
3. Identify and resolve any conflicts or contradictions
4. Produce a coherent and comprehensive solution

Please approach this as a constructive team discussion.
`;
  }
};

module.exports = aiPromptBuilder;
