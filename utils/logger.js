// utils/logger.js
const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json } = format;

// Create logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log file paths
const errorLogPath = path.join(logDir, 'error.log');
const combinedLogPath = path.join(logDir, 'combined.log');
const accessLogPath = path.join(logDir, 'access.log');

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const metadataString = Object.keys(metadata).length ? 
    `\n${JSON.stringify(metadata, null, 2)}` : '';
    
  return `[${timestamp}] ${level}: ${message}${metadataString}`;
});

// Create logger instance
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'ai-agent-workforce' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new transports.File({ 
      filename: errorLogPath, 
      level: 'error',
      maxFiles: 5,
      maxsize: 10485760 // 10MB
    }),
    // Write all logs to combined.log
    new transports.File({ 
      filename: combinedLogPath,
      maxFiles: 5,
      maxsize: 10485760 // 10MB
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logDir, 'exceptions.log') })
  ]
});

// Add HTTP access logging transport
logger.accessLogger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new transports.File({ 
      filename: accessLogPath,
      maxFiles: 5,
      maxsize: 10485760 // 10MB
    })
  ]
});

// Add console transport during development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }));
  
  logger.accessLogger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      printf(info => `[${info.timestamp}] ACCESS: ${info.method} ${info.url} ${info.status} ${info.responseTime}ms`)
    )
  }));
}

// Helper methods for specific logging scenarios
logger.logApiRequest = (req, res, responseTime) => {
  logger.accessLogger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    status: res.statusCode,
    userAgent: req.headers['user-agent'],
    responseTime,
    requestId: req.requestId
  });
};

logger.logAgentActivity = (agentId, agentName, activity, metadata = {}) => {
  logger.info(`Agent activity: ${agentName} (${agentId}) - ${activity}`, {
    agentId,
    agentName,
    activity,
    ...metadata
  });
};

logger.logProjectEvent = (projectId, projectName, event, metadata = {}) => {
  logger.info(`Project event: ${projectName} (${projectId}) - ${event}`, {
    projectId,
    projectName,
    event,
    ...metadata
  });
};

logger.logAiRequest = (provider, model, prompt, metadata = {}) => {
  // Avoid logging full prompts in production to prevent sensitive data exposure
  const logPrompt = process.env.NODE_ENV === 'production' 
    ? `${prompt.substring(0, 100)}... (truncated)`
    : prompt;
  
  logger.debug(`AI request: ${provider} - ${model}`, {
    provider,
    model,
    prompt: logPrompt,
    promptLength: prompt.length,
    ...metadata
  });
};

module.exports = logger;
