// services/claude-service.js
const { Anthropic } = require('@anthropic-ai/sdk');
const { models } = require('../config/ai-providers');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Service for handling interactions with Anthropic's Claude API
 */
const claudeService = {
  /**
   * Generate a response from Claude using a system prompt and user input
   * @param {string} systemPrompt - The system prompt that defines agent behavior
   * @param {string} userInput - The user message to respond to
   * @param {number} maxTokens - Maximum tokens to generate (default: 1000)
   * @returns {Promise<string>} Claude's response text
   */
  generateResponse: async (systemPrompt, userInput, maxTokens = 1000) => {
    try {
      const result = await anthropic.messages.create({
        model: models.claude, // From config
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userInput }]
      });
      
      return result.content[0].text;
    } catch (error) {
      console.error('Error generating Claude response:', error);
      
      // Enhance error with more details for better handling
      const enhancedError = new Error(
        `Claude API error: ${error.message || 'Unknown error'}`
      );
      
      // Add status code for appropriate HTTP response
      enhancedError.statusCode = error.status || 500;
      
      // Add original error for debugging
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },
  
  /**
   * Generate a response from Claude using conversation history
   * @param {string} systemPrompt - The system prompt that defines agent behavior
   * @param {Array} conversationHistory - Array of message objects with role and content
   * @param {number} maxTokens - Maximum tokens to generate (default: 1000)
   * @returns {Promise<string>} Claude's response text
   */
  generateConversationResponse: async (systemPrompt, conversationHistory, maxTokens = 1000) => {
    try {
      const result = await anthropic.messages.create({
        model: models.claude, // From config
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: conversationHistory
      });
      
      return result.content[0].text;
    } catch (error) {
      console.error('Error generating Claude conversation response:', error);
      
      // Enhance error with more details for better handling
      const enhancedError = new Error(
        `Claude API error: ${error.message || 'Unknown error'}`
      );
      
      // Add status code for appropriate HTTP response
      enhancedError.statusCode = error.status || 500;
      
      // Add original error for debugging
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },
  
  /**
   * Generate structured output from Claude
   * @param {string} systemPrompt - The system prompt that defines agent behavior
   * @param {string} userInput - The user message to respond to
   * @param {Object} structure - Structure specification for Claude to follow
   * @param {number} maxTokens - Maximum tokens to generate (default: 1000)
   * @returns {Promise<Object>} Structured response object
   */
  generateStructuredOutput: async (systemPrompt, userInput, structure, maxTokens = 1000) => {
    try {
      // Create a structured output prompt
      const structurePrompt = `
Please provide your response in the following JSON structure:
${JSON.stringify(structure, null, 2)}

Ensure that your response can be parsed as valid JSON.
`;
      
      // Combine with system prompt
      const combinedSystemPrompt = `${systemPrompt}\n\n${structurePrompt}`;
      
      const result = await anthropic.messages.create({
        model: models.claude, // From config
        max_tokens: maxTokens,
        system: combinedSystemPrompt,
        messages: [{ role: 'user', content: userInput }]
      });
      
      const responseText = result.content[0].text;
      
      // Extract and parse JSON from the response
      // Find JSON pattern between triple backticks, or just parse the whole response
      let jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      
      let parsedResponse;
      try {
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } else {
          parsedResponse = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('Error parsing JSON from Claude response:', parseError);
        console.log('Raw response:', responseText);
        
        // If parsing fails, return the raw text
        return { 
          rawResponse: responseText,
          error: 'Failed to parse structured output'
        };
      }
      
      return parsedResponse;
    } catch (error) {
      console.error('Error generating structured Claude response:', error);
      
      const enhancedError = new Error(
        `Claude API error: ${error.message || 'Unknown error'}`
      );
      enhancedError.statusCode = error.status || 500;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },
  
  /**
   * Split a task into subtasks using Claude
   * @param {string} taskDescription - Description of the main task
   * @param {number} numberOfSubtasks - Target number of subtasks (approx)
   * @returns {Promise<Array>} Array of subtask objects
   */
  splitTaskIntoSubtasks: async (taskDescription, numberOfSubtasks = 5) => {
    try {
      const systemPrompt = `
You are an expert project manager. Your task is to break down a given task into smaller, 
actionable subtasks. Each subtask should be clear, specific, and manageable.

The response should be a valid JSON array with each subtask having:
- title: A short, descriptive title
- description: A detailed explanation of what needs to be done
- estimatedTimeHours: Estimated time to complete (number)
- priority: One of ["low", "medium", "high", "urgent"]
`;

      const userInput = `
Please break down the following task into approximately ${numberOfSubtasks} subtasks:

${taskDescription}

Provide the subtasks as a JSON array.
`;

      const result = await anthropic.messages.create({
        model: models.claude,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userInput }]
      });
      
      const responseText = result.content[0].text;
      
      // Extract and parse JSON from the response
      let jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      
      let subtasks;
      try {
        if (jsonMatch) {
          subtasks = JSON.parse(jsonMatch[1]);
        } else {
          subtasks = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('Error parsing subtasks JSON:', parseError);
        
        // If parsing fails, try to extract any array pattern
        const arrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          try {
            subtasks = JSON.parse(arrayMatch[0]);
          } catch (secondError) {
            console.error('Second attempt to parse JSON failed:', secondError);
            throw new Error('Failed to parse subtasks from Claude response');
          }
        } else {
          throw new Error('Failed to parse subtasks from Claude response');
        }
      }
      
      return subtasks;
    } catch (error) {
      console.error('Error splitting task into subtasks:', error);
      throw error;
    }
  }
};

module.exports = claudeService;
