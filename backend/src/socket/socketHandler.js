const jwt = require('jsonwebtoken');
const User = require('../models/User');

const connectedUsers = new Map(); // userId -> socketId

const initializeSocket = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name role isAvailable');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    connectedUsers.set(userId, socket.id);
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Broadcast online presence
    socket.broadcast.emit('user_online', { userId });

    // Join personal room
    socket.join(`user_${userId}`);

    // Join an order room for real-time order updates
    socket.on('join_order', ({ orderId }) => {
      if (orderId) {
        socket.join(`order_${orderId}`);
        console.log(`📦 ${socket.user.name} joined order room: ${orderId}`);
      }
    });

    socket.on('leave_order', ({ orderId }) => {
      if (orderId) {
        socket.leave(`order_${orderId}`);
      }
    });

    // Provider location update (for live tracking)
    socket.on('update_location', ({ orderId, coordinates }) => {
      if (orderId && coordinates) {
        socket.to(`order_${orderId}`).emit('provider_location_update', {
          userId,
          coordinates,
          timestamp: new Date(),
        });
      }
    });

    // Typing indicator for chat
    socket.on('typing_start', ({ orderId }) => {
      socket.to(`order_${orderId}`).emit('user_typing', { userId, name: socket.user.name });
    });

    socket.on('typing_stop', ({ orderId }) => {
      socket.to(`order_${orderId}`).emit('user_stop_typing', { userId });
    });

    // Availability toggle — keep socket.user in sync so new_order filtering works
    socket.on('set_availability', ({ isAvailable }) => {
      socket.user.isAvailable = !!isAvailable;
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
      console.log(`🔌 User disconnected: ${socket.user.name}`);
    });
  });
};

// Utility: Send event to a specific user
const emitToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

// Utility: Get list of online user IDs (for admin dashboard)
const getOnlineUserIds = () => {
  return Array.from(connectedUsers.keys());
};

// Utility: Force-disconnect a specific user (e.g. after banning)
const disconnectUser = (io, userId) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('force_disconnect', { reason: 'Account has been suspended' });
      socket.disconnect(true);
    }
    connectedUsers.delete(userId);
  }
};

module.exports = { initializeSocket, connectedUsers, emitToUser, getOnlineUserIds, disconnectUser };
