import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';

const JoinPage = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const socket = useSocket();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('register', username.trim());
      onJoin(username);
    }
  };

  return (
    <div className="join-container">
      <h1>Chat App</h1>
      <p>Status: {socket.connected ? 'Connected to server' : 'Disconnected from server'}</p>
      <form onSubmit={handleSubmit}>
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
};

export default JoinPage;