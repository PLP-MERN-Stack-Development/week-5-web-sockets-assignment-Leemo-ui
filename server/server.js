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

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  }
});

// Security middleware
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

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and messages
const users = new Map(); // Using Map for better performance with frequent additions/removals
const messages = [];
const typingUsers = new Map();
const MAX_MESSAGES_STORED = 200; // Configurable message history limit

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      socket.emit('error', 'Invalid username');
      return;
    }

    if (Array.from(users.values()).some(user => user.username === username)) {
      socket.emit('error', 'Username already taken');
      return;
    }

    users.set(socket.id, { 
      username: username.trim(), 
      id: socket.id,
      joinedAt: new Date().toISOString()
    });

    io.emit('user_list', Array.from(users.values()));
    io.emit('user_joined', { 
      username: username.trim(), 
      id: socket.id,
      timestamp: new Date().toISOString()
    });

    // Send message history to new user
    socket.emit('message_history', messages.slice(-50)); // Last 50 messages

    console.log(`${username.trim()} joined the chat`);
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    if (!users.has(socket.id)) {
      socket.emit('error', 'You must join first before sending messages');
      return;
    }

    if (!messageData || typeof messageData.text !== 'string' || messageData.text.trim().length === 0) {
      socket.emit('error', 'Invalid message');
      return;
    }

    const user = users.get(socket.id);
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // More unique ID
      text: messageData.text.trim(),
      sender: user.username,
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      isPrivate: false,
      ...(messageData.replyTo && { replyTo: messageData.replyTo })
    };

    messages.push(message);
    
    // Limit stored messages
    if (messages.length > MAX_MESSAGES_STORED) {
      messages.shift();
    }
    
    io.emit('receive_message', message);
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (!users.has(socket.id)) return;

    const user = users.get(socket.id);
    
    if (isTyping) {
      typingUsers.set(socket.id, user.username);
    } else {
      typingUsers.delete(socket.id);
    }
    
    io.emit('typing_users', Array.from(typingUsers.values()));
  });

  // Handle private messages
  socket.on('private_message', ({ to, text }) => {
    if (!users.has(socket.id) || !users.has(to)) {
      socket.emit('error', 'Invalid recipient');
      return;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      socket.emit('error', 'Invalid message');
      return;
    }

    const sender = users.get(socket.id);
    const recipient = users.get(to);
    
    const messageData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      text: text.trim(),
      sender: sender.username,
      senderId: socket.id,
      recipientId: to,
      recipient: recipient.username,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      io.emit('user_left', { 
        username: user.username, 
        id: socket.id,
        timestamp: new Date().toISOString()
      });
      console.log(`${user.username} left the chat`);
    }
    
    users.delete(socket.id);
    typingUsers.delete(socket.id);
    
    io.emit('user_list', Array.from(users.values()));
    io.emit('typing_users', Array.from(typingUsers.values()));
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json({
    count: messages.length,
    messages: messages.slice(-100) // Return last 100 messages
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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

module.exports = { app, server, io };