import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000');

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Socket connection handlers
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for incoming messages
    socket.on('message', (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      // Send message to server with username
      socket.emit('message', {
        username,
        text: message,
        time: new Date().toLocaleTimeString()
      });
      setMessage('');
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

  return (
    <div className="chat-container">
      <h1>Real-Time Chat</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            <span className="message-username">{msg.username}: </span>
            <span className="message-text">{msg.text}</span>
            <span className="message-time">{msg.time}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;