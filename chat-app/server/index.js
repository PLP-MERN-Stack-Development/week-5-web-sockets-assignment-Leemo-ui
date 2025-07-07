require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Add to server/index.js
const users = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register', (username) => {
    users.set(socket.id, { username });
    socket.broadcast.emit('user-connected', username);
    io.emit('user-list', Array.from(users.values()));
  });

  socket.on('message', (message) => {
    const user = users.get(socket.id);
    if (user) {
      const messageWithSender = {
        ...message,
        sender: user.username,
        timestamp: new Date().toISOString()
      };
      io.emit('message', messageWithSender);
    }
  });

  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('typing', {
        username: user.username,
        isTyping
      });
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      socket.broadcast.emit('user-disconnected', user.username);
      io.emit('user-list', Array.from(users.values()));
    }
    console.log('User disconnected:', socket.id);
  });
});
// Add to server/index.js
socket.on('private-message', ({ to, text }) => {
  const fromUser = users.get(socket.id);
  if (fromUser) {
    const toSocket = [...users.entries()].find(([_, user]) => user.username === to)?.[0];
    if (toSocket) {
      io.to(toSocket).emit('private-message', {
        from: fromUser.username,
        text,
        timestamp: new Date().toISOString()
      });
    }
  }
});
// Add to server/index.js
socket.on('file-upload', ({ file, fileName, fileType }) => {
  const user = users.get(socket.id);
  if (user) {
    io.emit('file-upload', {
      sender: user.username,
      file,
      fileName,
      fileType,
      timestamp: new Date().toISOString()
    });
  }
});