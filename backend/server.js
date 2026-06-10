require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDB = require('./src/config/db');
const { initializeSocket } = require('./src/socket/socketHandler');
const rateLimiter = require('./src/middleware/rateLimiter');
const { incrementRequestCount } = require('./src/controllers/adminController');
const { startOrderExpiryScheduler } = require('./src/services/orderExpiryScheduler');

const authRoutes = require('./src/routes/auth');
const orderRoutes = require('./src/routes/orders');
const bidRoutes = require('./src/routes/bids');
const userRoutes = require('./src/routes/users');
const reviewRoutes = require('./src/routes/reviews');
const walletRoutes = require('./src/routes/wallet');
const messageRoutes = require('./src/routes/messages');
const adminRoutes = require('./src/routes/admin');
const serviceRoutes = require('./src/routes/services');
const notificationRoutes = require('./src/routes/notifications');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initializeSocket(io);

// Start scheduled jobs
startOrderExpiryScheduler(io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL === '*' ? true : (process.env.CLIENT_URL || 'http://localhost:3000'),
  credentials: true,
}));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimiter);

// HTTP request counter (for admin health panel)
app.use('/api/', (req, res, next) => { incrementRequestCount(); next(); });

// Make io accessible in routes
app.set('io', io);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root route — needed for Render health checks
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CampusHub API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 CampusHub server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = { app, server };
