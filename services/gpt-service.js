// services/gpt-service.js
const { OpenAI } = require('openai');
const { models } = require('../config/ai-providers');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Service for handling interactions with OpenAI's GPT API
 */
const gptService = {
  /**
   * Generate a response from GPT using a system prompt and user input
   * @param {string} systemPrompt - The system prompt that defines agent behavior
   * @param {string} userInput - The user message to respond to
   * @param {number} maxTokens - Maximum tokens to generate (default: 1000)
   * @returns {Promise<string>} GPT's response text
   */
  generateResponse: async (systemPrompt, userInput, maxTokens = 1000) => {
    try {
      const result = await openai.chat.completions.create({
        model: models.gpt, // From config
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        max_tokens: maxTokens
      });
      
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error generating GPT response:', error);
      
      // Enhance error with more details for better handling
      const enhancedError = new Error(
        `OpenAI API error: ${error.message || 'Unknown error'}`
      );
      
      // Add status code for appropriate HTTP response
      enhancedError.statusCode = error.status || 500;
      
      // Add original error for debugging
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },
  
  /**
   * Generate a response from GPT using conversation history
   * @param {string} systemPrompt - The system prompt that defines agent behavior
   * @param {Array} conversationHistory - Array of message objects with role and content
   * @param {number} maxTokens - Maximum tokens to generate (default: 1000)
   * @returns {Promise<string>} GPT's response text
   */
  generateConversationResponse: async (systemPrompt, conversationHistory, maxTokens = 1000) => {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ];
      
      const result = await openai.chat.completions.create({
        model: models.gpt, // From config
        messages,
        max_tokens: maxTokens
      });
      
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error generating GPT conversation response:', error);
      
      // Enhance error with more details for better handling
      const enhancedError = new Error(
        `OpenAI API error: ${error.message || 'Unknown error'}`
      );
      
      // Add status code for appropriate HTTP response
      enhancedError.statusCode = error.status || 500;
      
      // Add original error for debugging
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },
  
  /**
   * Generate structured output from GPT
   * @param {string} systemPrompt - The system prompt that defines agent behavior
   * @param {string} userInput - The user message to respond to
   * @param {Object} structure - Structure specification for GPT to follow
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
      
      const result = await openai.chat.completions.create({
        model: models.gpt, // From config
        messages: [
          { role: 'system', content: combinedSystemPrompt },
          { role: 'user', content: userInput }
        ],
        max_tokens: maxTokens,
        response_format: { type: "json_object" } // GPT-4 specific option for JSON responses
      });
      
      const responseText = result.choices[0].message.content;
      
      // Parse JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON from GPT response:', parseError);
        console.log('Raw response:', responseText);
        
        // If parsing fails, return the raw text
        return { 
          rawResponse: responseText,
          error: 'Failed to parse structured output'
        };
      }
      
      return parsedResponse;
    } catch (error) {
      console.error('Error generating structured GPT response:', error);
      
      const enhancedError = new Error(
        `OpenAI API error: ${error.message || 'Unknown error'}`
      );
      enhancedError.statusCode = error.status || 500;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },
  
  /**
   * Split a task into subtasks using GPT
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

      const result = await openai.chat.completions.create({
        model: models.gpt,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" } // GPT-4 specific option for JSON responses
      });
      
      const responseText = result.choices[0].message.content;
      
      // Parse JSON response
      let subtasks;
      try {
        const parsedResponse = JSON.parse(responseText);
        // Handle case where response might have a container object
        subtasks = Array.isArray(parsedResponse) 
          ? parsedResponse 
          : (parsedResponse.subtasks || parsedResponse.tasks);
      } catch (parseError) {
        console.error('Error parsing subtasks JSON:', parseError);
        throw new Error('Failed to parse subtasks from GPT response');
      }
      
      return subtasks;
    } catch (error) {
      console.error('Error splitting task into subtasks:', error);
      throw error;
    }
  },
  
  /**
   * Generate embeddings for a text
   * @param {string} text - The text to generate embeddings for
   * @returns {Promise<Array>} Vector embeddings
   */
  generateEmbeddings: async (text) => {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
};

module.exports = gptService;
