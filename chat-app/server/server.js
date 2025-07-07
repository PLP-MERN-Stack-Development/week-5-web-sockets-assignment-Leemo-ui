// server.js - Main server file for Socket.io chat application
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Security middleware (moved before Socket.io initialization)
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Configure Socket.io with CORS (fixed client URL)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Changed to match client port
    methods: ['GET', 'POST'],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  transports: ['websocket', 'polling'] // Explicitly set transports
});

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and messages
const users = new Map();
const messages = [];
const typingUsers = new Map();
const MAX_MESSAGES_STORED = 200;

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // [Rest of your existing socket event handlers...]
  // Keep all your existing user_join, send_message, typing, etc. handlers
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json({
    count: messages.length,
    messages: messages.slice(-100)
  });
});

app.get('/api/users', (req, res) => {
  res.json({
    count: users.size,
    users: Array.from(users.values())
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    users: users.size,
    uptime: process.uptime()
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server with proper error handling
const PORT = process.env.PORT || 5175;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`HTTP endpoint: http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying alternative port...`);
    server.listen(0, () => { // Let OS assign available port
      console.log(`Server running on fallback port ${server.address().port}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

module.exports = { app, server, io };