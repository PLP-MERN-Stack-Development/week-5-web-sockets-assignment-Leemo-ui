export const setupChat = (io) => {
  const users = new Map();
  const messages = [];
  const typingUsers = new Set();

  io.on('connection', (socket) => {
    // User joins
    socket.on('user_join', (username) => {
      users.set(socket.id, { username, id: socket.id });
      io.emit('user_list', Array.from(users.values()));
      io.emit('user_joined', { username, id: socket.id });
    });

    // Message handling
    socket.on('send_message', (message) => {
      const user = users.get(socket.id);
      if (!user) return;

      const msg = {
        id: Date.now(),
        text: message,
        sender: user.username,
        senderId: socket.id,
        timestamp: new Date().toISOString(),
      };
      
      messages.push(msg);
      io.emit('receive_message', msg);
    });

    // Typing indicator
    socket.on('typing', (isTyping) => {
      const user = users.get(socket.id);
      if (!user) return;

      if (isTyping) {
        typingUsers.add(user.username);
      } else {
        typingUsers.delete(user.username);
      }
      
      io.emit('typing_users', Array.from(typingUsers));
    });

    // Disconnect
    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user) {
        io.emit('user_left', { username: user.username, id: socket.id });
        users.delete(socket.id);
        typingUsers.delete(user.username);
        io.emit('user_list', Array.from(users.values()));
      }
    });
  });
};