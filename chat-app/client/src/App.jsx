import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// WebSocket URL configuration
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5175';

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingStatus, setTypingStatus] = useState('');
  const [connectionError, setConnectionError] = useState(null);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef();

  // Connect to Socket.io server
  useEffect(() => {
    socketRef.current = io(WS_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      setConnectionError(`Connection error: ${err.message}`);
      setIsConnected(false);
    });

    socketRef.current.on('reconnect', (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    // Message handling
    socketRef.current.on('message_received', (newMessage) => {
      setMessages((prev) => [...prev, { ...newMessage, id: Date.now() }]);
    });

    // Typing indicators
    socketRef.current.on('typing_response', (data) => {
      setTypingStatus(data);
      if (data) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingStatus(''), 2000);
      }
    });

    // User join/leave notifications
    socketRef.current.on('user_joined', (name) => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `${name} joined the chat`,
        system: true
      }]);
    });

    socketRef.current.on('user_left', (name) => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `${name} left the chat`,
        system: true
      }]);
    });

    return () => {
      clearTimeout(typingTimeout.current);
      socketRef.current.disconnect();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !username) return;
    
    // Basic XSS protection
    const sanitizedMessage = message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const newMessage = {
      id: Date.now(),
      text: sanitizedMessage,
      sender: username,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pending: true
    };
    
    // Optimistic UI update
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    
    // Clear typing indicator
    socketRef.current.emit('stop_typing');
    clearTimeout(typingTimeout.current);
    
    // Send to server with acknowledgement
    socketRef.current.emit('send_message', newMessage, (ack) => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, pending: false } : msg
      ));
    });
  };

  const handleTyping = () => {
    if (!username) return;
    
    clearTimeout(typingTimeout.current);
    socketRef.current.emit('typing', `${username} is typing...`);
    
    typingTimeout.current = setTimeout(() => {
      socketRef.current.emit('stop_typing');
    }, 1000);
  };

  const handleJoinChat = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socketRef.current.emit('join_chat', username.trim());
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
              maxLength={20}
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
            {connectionError && (
              <div className="connection-error">
                {connectionError} - Trying to reconnect...
              </div>
            )}
          </div>

          <div className="messages-container">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`message ${msg.sender === username ? 'sent' : 'received'} ${msg.system ? 'system' : ''} ${msg.pending ? 'pending' : ''}`}
              >
                {!msg.system && (
                  <span className="sender">{msg.sender === username ? 'You' : msg.sender}</span>
                )}
                <p>{msg.text}</p>
                {!msg.system && !msg.pending && (
                  <span className="timestamp">{msg.timestamp}</span>
                )}
                {msg.pending && (
                  <span className="pending-indicator">Sending...</span>
                )}
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
                if (e.target.value) handleTyping();
              }}
              placeholder="Type a message..."
              disabled={!isConnected}
              maxLength={500}
            />
            <button 
              type="submit" 
              disabled={!message.trim() || !isConnected}
              aria-label="Send message"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;