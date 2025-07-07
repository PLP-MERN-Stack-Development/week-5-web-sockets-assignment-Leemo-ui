import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import chat from './Chat'; // Assuming Chat component is in the same directory

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000');

function App() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
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

  return (
    <div>
      <h1>Chat App</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
    </div>
  );
}
function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setJoined(true);
    }
  };

  if (!joined) {
    return (
      <div className="join-container">
        <h1>Join Chat</h1>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
          <button type="submit">Join</button>
        </form>
      </div>
    );
  }

  return <Chat username={username} />;
}

export default App;
