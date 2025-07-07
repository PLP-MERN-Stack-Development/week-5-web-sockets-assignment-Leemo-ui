export const setupFileSharing = (io) => {
  io.on('connection', (socket) => {
    socket.on('file_upload', ({ file, fileName, fileType, roomId }) => {
      const user = socket.user?.username || 'Anonymous';
      
      io.to(roomId).emit('file_receive', {
        from: socket.id,
        sender: user,
        fileName,
        fileType,
        file,
        timestamp: new Date().toISOString()
      });
    });
  });
};