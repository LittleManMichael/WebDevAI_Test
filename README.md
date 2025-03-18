# AI Agent Workforce Platform

A platform designed to enable AI agents to collaboratively build websites and web applications with minimal human effort. The system creates a workforce of specialized AI agents that communicate with each other, with conversations visible in a Teams-like chat interface.

## Current Project Status: UNDER DEVELOPMENT

This project is currently in development and is **not yet fully functional**. The codebase represents the foundation and architecture for the planned system, and requires additional implementation work before it can be used effectively.

## Concept

The AI Agent Workforce is designed to run locally on your machine, creating a collaborative environment where specialized AI agents work together on web development projects. Each agent has a specific role, expertise, and responsibilities. As the human operator, you can observe their discussions and collaborate with them through a simple chat interface.

## Features (Planned)

- **Specialized Agent Roles**: Project Manager, Architect, Frontend Developer, Backend Developer, Content Specialist, and Testing Specialist
- **Real-time Communication**: Agents communicating with each other and the human user
- **Project Management**: Creation and tracking of web development projects
- **Task Assignment**: Breaking down projects into tasks assigned to specialized agents
- **Interactive Dashboard**: Monitoring project progress, agent workload, and activities
- **Conversation Interface**: Teams-like chat to observe and participate in agent discussions

## What's Implemented

- **Architecture Design**: Overall system architecture with modular component design
- **Database Models**: Schema definitions for agents, projects, tasks, conversations, etc.
- **API Route Structure**: Basic routing framework for the RESTful API endpoints
- **Controller Patterns**: Foundational controller logic (though many functions need additional implementation)
- **Socket.io Setup**: Initial WebSocket configuration for real-time communication
- **UI Mockups**: HTML/CSS templates for the front-end interface
- **Agent Templates**: Definitions for specialized AI agent roles and system prompts

## What Needs To Be Completed

1. **Authentication System**: 
   - Simplify for single-user local use
   - Implement auto-login for local environment

2. **AI Integration**:
   - Finalize LLM API integrations
   - Implement prompt engineering for agent collaboration
   - Add error handling and retry logic for API calls

3. **Frontend Development**:
   - Connect frontend to backend API and WebSockets
   - Complete UI interactivity and data binding

4. **File Management**:
   - Complete upload/download functionality
   - Implement file generation features
   - Setup proper directory permissions

5. **Testing**:
   - Add unit and integration tests
   - Implement API endpoint testing
   - Add validation for database operations

6. **Documentation**:
   - Complete user guides and tutorials
   - Document system architecture

7. **Utility Scripts**:
   - Implement backup system
   - Complete system prompt generation

## Prerequisites (For Development)

- Node.js (v18 or higher)
- MongoDB
- Anthropic Claude API key
- OpenAI API key

## Installation (For Development Only)

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

5. Start the application (for development exploration only)
```bash
npm run dev
```

## Development Notes

This project is being developed with assistance from AI tools, including Claude. While this collaborative approach allows for rapid development of the codebase architecture and foundational elements, interested parties should understand that:

1. The development process may introduce occasional inconsistencies or implementation gaps that require review and correction.

2. Due diligence is being applied throughout the development process, with careful consideration of security practices, scalability concerns, and code quality.

3. Human oversight remains essential, particularly for critical components like authentication, data handling, and external API integrations.

This approach represents an exploration of AI-human collaborative software development, demonstrating both the capabilities and current limitations of such partnerships.

## Contributing

This project is currently in early development. If you're interested in contributing, please check back later when we've established contribution guidelines and the codebase is more stable.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Anthropic for Claude AI
- OpenAI for GPT
- The open source community for the various libraries used in this project
