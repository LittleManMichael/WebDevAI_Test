// services/file-service.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const util = require('util');
const mkdirp = require('mkdirp');
const File = require('../models/file');
const Activity = require('../models/activity');

// Promisify fs functions
const writeFileAsync = util.promisify(fs.writeFile);
const readFileAsync = util.promisify(fs.readFile);
const unlinkAsync = util.promisify(fs.unlink);
const statAsync = util.promisify(fs.stat);

// Base upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

/**
 * Service for handling file operations
 */
const fileService = {
  /**
   * Save file to disk and database
   * @param {Object} fileData - File information and content
   * @param {string} fileData.name - Original filename
   * @param {string} fileData.type - MIME type
   * @param {Buffer|string} fileData.content - File content
   * @param {string} fileData.description - Optional file description
   * @param {string} fileData.projectId - Associated project ID (optional)
   * @param {string} fileData.createdBy - ID of agent that created the file (optional)
   * @param {boolean} fileData.isGeneratedByAI - Whether the file was AI-generated
   * @returns {Promise<Object>} Saved file record
   */
  saveFile: async (fileData) => {
    try {
      // Ensure upload directory exists
      await mkdirp(UPLOAD_DIR);
      
      // Generate unique filename to prevent collisions
      const fileExtension = path.extname(fileData.name);
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const safeFileName = fileData.name
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-');
      
      const uniqueFilename = `${safeFileName.substring(0, 50)}-${timestamp}-${randomString}${fileExtension}`;
      const filePath = path.join(UPLOAD_DIR, uniqueFilename);
      
      // Write file to disk
      await writeFileAsync(filePath, fileData.content);
      
      // Get file size
      const stats = await statAsync(filePath);
      
      // Determine file type category based on MIME type
      let fileType = 'other';
      if (fileData.type.startsWith('image/')) {
        fileType = 'image';
      } else if (fileData.type.includes('document') || 
                fileData.type.includes('pdf') || 
                fileData.type.includes('text/')) {
        fileType = 'document';
      } else if (fileData.type.includes('code') || 
                fileData.type.includes('javascript') || 
                fileData.type.includes('html') || 
                fileData.type.includes('css') || 
                fileData.type.includes('json')) {
        fileType = 'code';
      } else if (fileData.type.includes('zip') || 
                fileData.type.includes('compressed') || 
                fileData.type.includes('tar')) {
        fileType = 'archive';
      }
      
      // Create database record
      const file = new File({
        name: fileData.name,
        description: fileData.description || '',
        type: fileType,
        mimeType: fileData.type,
        size: stats.size,
        path: filePath,
        url: `/api/files/${uniqueFilename}`, // Publicly accessible URL
        project: fileData.projectId,
        createdBy: fileData.createdBy,
        isGeneratedByAI: fileData.isGeneratedByAI || false,
        metadata: fileData.metadata || {}
      });
      
      // Save file record to database
      await file.save();
      
      // Create activity for file creation
      const activity = new Activity({
        type: 'file_generated',
        title: 'File Created',
        description: `File "${file.name}" has been ${file.isGeneratedByAI ? 'generated' : 'uploaded'}`,
        projectId: file.project,
        agentId: file.createdBy,
        timestamp: new Date()
      });
      await activity.save();
      
      return { file, activity };
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  },
  
  /**
   * Get file by ID
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} File record
   */
  getFileById: async (fileId) => {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        const error = new Error('File not found');
        error.statusCode = 404;
        throw error;
      }
      
      return file;
    } catch (error) {
      console.error(`Error getting file by ID ${fileId}:`, error);
      throw error;
    }
  },
  
  /**
   * Read file content from disk
   * @param {string} fileId - File ID
   * @returns {Promise<Buffer>} File content
   */
  readFileContent: async (fileId) => {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        const error = new Error('File not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Read file from disk
      const content = await readFileAsync(file.path);
      return content;
    } catch (error) {
      console.error(`Error reading file content for ID ${fileId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get files for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} List of file records
   */
  getProjectFiles: async (projectId) => {
    try {
      const files = await File.find({ project: projectId })
        .sort('-createdAt');
      
      return files;
    } catch (error) {
      console.error(`Error getting files for project ${projectId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update file metadata
   * @param {string} fileId - File ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated file record
   */
  updateFile: async (fileId, updateData) => {
    try {
      // Only allow updating certain fields
      const allowedUpdates = {
        name: updateData.name,
        description: updateData.description,
        metadata: updateData.metadata
      };
      
      // Filter out undefined values
      Object.keys(allowedUpdates).forEach(key => 
        allowedUpdates[key] === undefined && delete allowedUpdates[key]
      );
      
      const file = await File.findByIdAndUpdate(
        fileId,
        allowedUpdates,
        { new: true, runValidators: true }
      );
      
      if (!file) {
        const error = new Error('File not found');
        error.statusCode = 404;
        throw error;
      }
      
      return file;
    } catch (error) {
      console.error(`Error updating file ${fileId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete file from disk and database
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteFile: async (fileId) => {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        const error = new Error('File not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Delete file from disk
      try {
        await unlinkAsync(file.path);
      } catch (unlinkError) {
        console.warn(`Warning: Could not delete file from disk: ${unlinkError.message}`);
        // Continue with database deletion even if file doesn't exist on disk
      }
      
      // Delete file record from database
      await File.findByIdAndDelete(fileId);
      
      return { message: 'File deleted successfully', fileId };
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      throw error;
    }
  },
  
  /**
   * Generate code file from AI
   * @param {string} filename - Name of the file to generate
   * @param {string} language - Programming language
   * @param {string} description - Description of what to generate
   * @param {string} projectId - Associated project ID
   * @param {string} agentId - ID of agent generating the file
   * @returns {Promise<Object>} Generated file record
   */
  generateCodeFile: async (filename, language, description, projectId, agentId) => {
    try {
      // Get the agent that will generate the code
      const Agent = require('../models/agent');
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        throw new Error('Agent not found');
      }
      
      // Determine the appropriate AI service
      let aiResponse;
      if (agent.model === 'claude') {
        const claudeService = require('./claude-service');
        aiResponse = await claudeService.generateResponse(
          agent.systemPrompt,
          `Generate a ${language} file named "${filename}" with the following description: ${description}`,
          3000 // More tokens for code generation
        );
      } else {
        const gptService = require('./gpt-service');
        aiResponse = await gptService.generateResponse(
          agent.systemPrompt,
          `Generate a ${language} file named "${filename}" with the following description: ${description}`,
          3000 // More tokens for code generation
        );
      }
      
      // Extract code from AI response (assuming it might be in markdown code blocks)
      let codeContent = aiResponse;
      const codeBlockMatch = aiResponse.match(/```(?:\w+)?\s*([\s\S]+?)\s*```/);
      if (codeBlockMatch) {
        codeContent = codeBlockMatch[1];
      }
      
      // Determine appropriate MIME type
      let mimeType = 'text/plain';
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          mimeType = 'application/javascript';
          break;
        case 'html':
          mimeType = 'text/html';
          break;
        case 'css':
          mimeType = 'text/css';
          break;
        case 'json':
          mimeType = 'application/json';
          break;
        case 'python':
        case 'py':
          mimeType = 'text/x-python';
          break;
        // Add more languages as needed
      }
      
      // Save the generated file
      return await fileService.saveFile({
        name: filename,
        type: mimeType,
        content: codeContent,
        description: description,
        projectId: projectId,
        createdBy: agentId,
        isGeneratedByAI: true,
        metadata: {
          language,
          generationPrompt: description
        }
      });
    } catch (error) {
      console.error('Error generating code file:', error);
      throw error;
    }
  }
};

module.exports = fileService;
