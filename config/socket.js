const socketIo = require('socket.io');

/**
 * Configure Socket.io for real-time communication
 * @param {object} server - HTTP server instance
 * @returns {object} Configured Socket.io instance
 */
const configureSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Setup connection event
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  return io;
};

module.exports = { configureSocket };