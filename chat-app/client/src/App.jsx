import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingStatus, setTypingStatus] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Connect to Socket.io server
  useEffect(() => {
    socketRef.current = io('http://localhost:5173'); // Update with your server URL

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('message_received', (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    socketRef.current.on('typing_response', (data) => {
      setTypingStatus(data);
      setTimeout(() => setTypingStatus(''), 2000);
    });

    socketRef.current.on('user_joined', (name) => {
      setMessages((prev) => [...prev, {
        text: `${name} joined the chat`,
        system: true
      }]);
    });

    socketRef.current.on('user_left', (name) => {
      setMessages((prev) => [...prev, {
        text: `${name} left the chat`,
        system: true
      }]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && username) {
      const newMessage = {
        text: message,
        sender: username,
        timestamp: new Date().toLocaleTimeString()
      };
      
      socketRef.current.emit('send_message', newMessage);
      setMessage('');
    }
  };

  const handleTyping = () => {
    if (username) {
      socketRef.current.emit('typing', `${username} is typing...`);
    }
  };

  const handleJoinChat = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socketRef.current.emit('join_chat', username);
    }
  };

  return (
    <div className="chat-app">
      {!username ? (
        <div className="join-container">
          <h1>Join Chat</h1>
          <form onSubmit={handleJoinChat}>
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button type="submit">Join</button>
          </form>
        </div>
      ) : (
        <div className="chat-container">
          <div className="chat-header">
            <h2>Chat Room</h2>
            <div className="status">
              <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? 'Online' : 'Offline'}
              </span>
              <span className="username">Hello, {username}</span>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.sender === username ? 'sent' : 'received'} ${msg.system ? 'system' : ''}`}
              >
                {!msg.system && (
                  <span className="sender">{msg.sender === username ? 'You' : msg.sender}</span>
                )}
                <p>{msg.text}</p>
                {!msg.system && <span className="timestamp">{msg.timestamp}</span>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="typing-status">
            {typingStatus && <p>{typingStatus}</p>}
          </div>

          <form onSubmit={handleSendMessage} className="message-form">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              disabled={!isConnected}
            />
            <button type="submit" disabled={!message.trim() || !isConnected}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;