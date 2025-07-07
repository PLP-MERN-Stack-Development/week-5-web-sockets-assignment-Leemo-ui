import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Chat from './Chat'; // Make sure this import matches your file name

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000');

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Socket connection handlers
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setJoined(true);
      // Register the user with the server
      socket.emit('register', username.trim());
    }
  };

  if (!joined) {
    return (
      <div className="join-container">
        <h1>Chat App</h1>
        <p>Status: {isConnected ? 'Connected to server' : 'Disconnected from server'}</p>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
          <button type="submit">Join Chat</button>
        </form>
      </div>
    );
  }

  return <Chat username={username} socket={socket} />;
}

export default App;