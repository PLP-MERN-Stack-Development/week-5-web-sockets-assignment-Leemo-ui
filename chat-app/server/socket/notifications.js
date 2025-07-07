export const setupNotifications = (io) => {
  const unreadCounts = new Map();

  io.on('connection', (socket) => {
    // Initialize unread counts
    unreadCounts.set(socket.id, { total: 0, byUser: {} });

    // Notify when message is received
    socket.on('message_received', ({ messageId, senderId }) => {
      const recipientSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === senderId);
      
      if (recipientSocket) {
        recipientSocket.emit('message_read', { messageId });
      }
    });

    // Update unread counts
    socket.on('update_unread', ({ userId, count }) => {
      const counts = unreadCounts.get(socket.id);
      counts.byUser[userId] = (counts.byUser[userId] || 0) + count;
      counts.total += count;
      socket.emit('unread_updated', counts);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      unreadCounts.delete(socket.id);
    });
  });
};