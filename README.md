# AI Agent Workforce Platform (Local Version)

A local platform that enables AI agents to collaboratively build websites and web applications with minimal human effort. The system creates a workforce of specialized AI agents that communicate with each other, with conversations visible in a Teams-like chat interface.

## How It Works

The AI Agent Workforce is designed to run locally on your machine, allowing you to manage web development projects through a team of specialized AI agents. Each agent has a specific role, expertise, and responsibility within the project. You can observe their discussions and collaborate with them through a simple chat interface.

## Current Project Status

This project is a single-user local application that provides a collaborative AI environment for web development. It uses MongoDB for local data storage and integrates with OpenAI and Anthropic APIs for AI functionality.

## Features

- **Specialized Agent Roles**: Project Manager, Architect, Frontend Developer, Backend Developer, Content Specialist, and Testing Specialist
- **Real-time Communication**: Agents communicating with each other and you, the human user
- **Project Management**: Creation and tracking of web development projects
- **Task Assignment**: Breaking down projects into tasks assigned to specialized agents
- **Interactive Dashboard**: Monitoring project progress, agent workload, and activities
- **Conversation Interface**: Teams-like chat to observe and participate in agent discussions

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation)
- Anthropic Claude API key
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-agent-workforce.git
cd ai-agent-workforce
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on the `.env.example` template
```bash
cp .env.example .env
```

4. Edit the `.env` file with your API keys and configuration
```
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (Local default)
MONGODB_URI=mongodb://localhost:27017/ai-agent-workforce

# API Keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

5. Start MongoDB (if not already running)
```bash
# On macOS/Linux with homebrew
brew services start mongodb-community

# On Windows (assuming MongoDB is installed as a service)
# MongoDB should be running as a service, if not, start it through the Services panel
```

6. Initialize the database with default data
```bash
npm run init-db
```

7. Start the application
```bash
npm run dev
```

8. Access the application
Open your browser and navigate to: http://localhost:3000

## Usage Guide

### Creating a New Project

1. Navigate to the Dashboard
2. Click "New Project" button
3. Fill in project details and select the AI agents you want to include
4. Click "Start Project"

The Project Manager agent will automatically create an initial project plan and break down tasks for the other agents.

### Participating in Conversations

1. Navigate to the Conversations tab
2. Select a project or agent conversation
3. Type your message in the chat input
4. The appropriate AI agents will respond and collaborate to address your request

### Monitoring Progress

1. Check the Dashboard for an overview of project status
2. View the Projects tab for detailed project information
3. Use the Agent Management section to see each agent's workload and tasks

## Troubleshooting

### MongoDB Connection Issues

If you see MongoDB connection errors:
- Ensure MongoDB is installed and running locally
- Check that your MongoDB connection string in the `.env` file is correct
- Default connection is `mongodb://localhost:27017/ai-agent-workforce`

### API Key Issues

If agents aren't responding:
- Verify your OpenAI and Anthropic API keys in the `.env` file
- Ensure your API keys have sufficient quota/credits remaining
- Check the logs for specific API error messages

### Application Not Starting

If the application fails to start:
- Ensure Node.js v18+ is installed (`node -v` to check)
- Verify all dependencies are installed (`npm install`)
- Check for errors in the console output
- Ensure MongoDB is running and accessible

## Development

### Project Structure

- `/controllers` - Business logic for handling API requests
- `/models` - MongoDB data models
- `/routes` - API route definitions
- `/public` - Frontend assets and HTML
- `/services` - Service layers for AI integration
- `/utils` - Utility functions
- `/data` - Agent templates and system prompts

### Custom Agents

To modify existing agents or create new ones:
1. Edit the templates in `/data/agent-templates.js`
2. Update system prompts in `/data/system-prompts/`
3. Restart the application to apply changes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Anthropic for Claude AI
- OpenAI for GPT
- The open source community for the various libraries used in this project
