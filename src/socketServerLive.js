const jwt = require('jsonwebtoken');
const User = require('./models/UserModel');
let io;

function setIO(ioInstance) {
  io = ioInstance;

  const viewers = {}; // Track viewer count per room

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        throw new Error('Authentication token is required');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Attach user info to socket
      socket.user = {
        id: user._id,
        name: user.role === 'seller' ? user.shopName : user.name,
        role: user.role
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Handle viewer joining a room
    socket.on('joinRoom', async (data) => {
      const { roomId } = data;
      
      socket.join(roomId);
      viewers[roomId] = (viewers[roomId] || 0) + 1;
      
      // Emit viewer info to room
      io.to(roomId).emit('viewerCount', viewers[roomId]);
      io.to(roomId).emit('userJoined', {
        userId: socket.user.id,
        username: socket.user.name
      });
    });

    // Handle chat messages
    socket.on('chat', (data) => {
      io.to(data.roomId).emit('chat', {
        userId: socket.user.id,
        username: socket.user.name,
        message: data.message,
        timestamp: new Date()
      });
    });

    // Handle heart (like button)
    socket.on('heart', (roomId) => {
      io.to(roomId).emit('heart', {
        userId: socket.user.id,
        username: socket.user.name
      });
    });

    // Handle disconnections and update viewer count
    socket.on('disconnecting', () => {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      rooms.forEach(room => {
        viewers[room] = Math.max((viewers[room] || 1) - 1, 0);
        io.to(room).emit('viewerCount', viewers[room]);
        io.to(room).emit('userLeft', {
          userId: socket.user.id,
          username: socket.user.name
        });
      });
    });
  });
}

module.exports = { setIO };
