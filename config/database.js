// config/database.js
const mongoose = require('mongoose');

/**
 * Connect to MongoDB database with enhanced error handling for local use
 * @returns {Promise} Mongoose connection promise
 */
const connectDatabase = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-agent-workforce';
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Provide more helpful error messages for local use
    if (error.name === 'MongoNetworkError') {
      console.error('\nERROR: Could not connect to MongoDB. Please check that:');
      console.error('1. MongoDB is installed and running on your machine');
      console.error('2. The connection string in your .env file is correct');
      console.error('   (Default: mongodb://localhost:27017/ai-agent-workforce)');
      console.error('\nInstallation instructions for MongoDB:');
      console.error('- Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/');
      console.error('- macOS: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/');
      console.error('- Linux: https://docs.mongodb.com/manual/administration/install-on-linux/\n');
    } else if (error.name === 'MongoParseError') {
      console.error('\nERROR: Invalid MongoDB connection string in your .env file');
      console.error('Please use the format: mongodb://localhost:27017/ai-agent-workforce\n');
    }
    
    return false;
  }
};

/**
 * Check if the database is available
 * @returns {Promise<boolean>} Whether the database is accessible
 */
const checkDatabaseConnection = async () => {
  try {
    // Try to connect
    if (mongoose.connection.readyState === 1) {
      // Already connected
      return true;
    }
    
    // Try to connect
    return await connectDatabase();
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

/**
 * Disconnect from MongoDB
 * @returns {Promise} Disconnect promise
 */
const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
};

/**
 * Ensure indexes are created for performance
 * This will create indexes defined in the models
 */
const ensureIndexes = async () => {
  try {
    // Get all models
    const modelNames = mongoose.modelNames();
    console.log('Ensuring indexes for models:', modelNames.join(', '));
    
    // Create indexes for each model
    for (const modelName of modelNames) {
      const model = mongoose.model(modelName);
      await model.createIndexes();
    }
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
  }
};

module.exports = {
  connectDatabase,
  checkDatabaseConnection,
  disconnectDatabase,
  ensureIndexes
};
