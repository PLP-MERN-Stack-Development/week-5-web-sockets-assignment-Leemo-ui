export const setupPrivateChat = (io) => {
  io.on('connection', (socket) => {
    socket.on('private_message', ({ to, message }) => {
      const sender = socket.user?.username || 'Anonymous';
      
      const privateMsg = {
        id: Date.now(),
        from: socket.id,
        to,
        sender,
        message,
        timestamp: new Date().toISOString(),
      };
      
      socket.to(to).emit('private_message', privateMsg);
      socket.emit('private_message', privateMsg);
    });
  });
};