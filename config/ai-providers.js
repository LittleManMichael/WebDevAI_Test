const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

module.exports = {
  openai,
  anthropic,
  models: {
    claude: 'claude-3-opus-20240229',
    gpt: 'gpt-4'
  }
};