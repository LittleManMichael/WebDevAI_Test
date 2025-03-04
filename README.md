# AI Agent Workforce Platform

A custom platform that enables AI agents to collaboratively build websites and web applications with minimal human effort. The system creates a workforce of specialized AI agents that communicate with each other, with conversations visible in a Teams-like chat interface.

## Features

- **Specialized Agent Roles**: Project Manager, Architect, Frontend Developer, Backend Developer, Content Specialist, and Testing Specialist
- **Real-time Communication**: Agents can communicate with each other and the human user
- **Project Management**: Create and track web development projects
- **Task Assignment**: Break down projects into tasks assigned to specialized agents
- **Interactive Dashboard**: Monitor project progress, agent workload, and activities
- **Conversation Interface**: Teams-like chat to observe and participate in agent discussions

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
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

5. Start the application
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Create Agents**: Start by reviewing and potentially customizing the pre-configured agent templates
2. **Start a Project**: Create a new project with specific requirements
3. **Monitor Progress**: Watch as agents collaborate to build your website/application
4. **Provide Feedback**: Intervene in conversations when needed to guide the direction

## Architecture

The platform consists of several key components:

- **Frontend**: React-based user interface with dashboard, agent management, and conversation views
- **Backend**: Node.js/Express API handling agent communication and project management
- **Database**: MongoDB storing agents, projects, tasks, conversations, and files
- **AI Integration**: Connections to Claude and GPT APIs for agent intelligence
- **Real-time Communication**: Socket.io for live updates and agent conversations

## Extending the Platform

You can extend the platform by:

1. **Adding New Agent Types**: Create new specialized roles in the agent templates
2. **Customizing System Prompts**: Refine how agents behave and communicate
3. **Adding Integrations**: Connect with external services like GitHub, Vercel, etc.
4. **Enhancing Visualization**: Add more charts and metrics to the dashboard

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Anthropic for Claude AI
- OpenAI for GPT
- The open source community for the various libraries used in this project
