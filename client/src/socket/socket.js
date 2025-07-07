import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000', {
  autoConnect: false,
  withCredentials: true
});

export default socket;