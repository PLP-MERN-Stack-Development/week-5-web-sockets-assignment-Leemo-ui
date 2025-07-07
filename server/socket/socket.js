const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('register', (username) => {
      socket.username = username;
      socket.broadcast.emit('message', {
        username: 'System',
        text: `${username} has joined the chat`,
        time: new Date().toLocaleTimeString()
      });
    });

    socket.on('message', (message) => {
      io.emit('message', message);
    });

    socket.on('disconnect', () => {
      if (socket.username) {
        io.emit('message', {
          username: 'System',
          text: `${socket.username} has left the chat`,
          time: new Date().toLocaleTimeString()
        });
      }
    });
  });
};

export default setupSocket;