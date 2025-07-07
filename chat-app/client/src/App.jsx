import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// WebSocket URL configuration - IMPORTANT: Use WS protocol, not HTTP
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5175';

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

  // Connect to Socket.io server with proper configuration
  useEffect(() => {
    console.log('Attempting to connect to:', WS_URL);
    
    socketRef.current = io(WS_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'], // Force WebSocket only
      withCredentials: true,
      autoConnect: true
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Connected with ID:', socketRef.current.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setConnectionError('Disconnected by server. Trying to reconnect...');
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnectionError(`Connection failed: ${err.message}`);
      setIsConnected(false);
      
      // Attempt manual reconnect after delay
      setTimeout(() => {
        if (!isConnected) {
          socketRef.current.connect();
        }
      }, 2000);
    });

    // Message handling
    socketRef.current.on('message_received', (newMessage) => {
      setMessages((prev) => [...prev, { 
        ...newMessage, 
        id: Date.now() + Math.random().toString(36).substr(2, 5) // More unique ID
      }]);
    });

    // Typing indicators
    socketRef.current.on('typing_response', (data) => {
      setTypingStatus(data);
      if (data) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingStatus(''), 2000);
      }
    });

    // User notifications
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

    // Cleanup function
    return () => {
      clearTimeout(typingTimeout.current);
      if (socketRef.current) {
        socketRef.current.off(); // Remove all listeners
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !username) return;
    
    // Basic XSS protection and trimming
    const sanitizedMessage = message
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const newMessage = {
      id: Date.now().toString(),
      text: sanitizedMessage,
      sender: username,
      timestamp: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      pending: true
    };
    
    // Optimistic UI update
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    
    // Clear typing indicator
    socketRef.current.emit('stop_typing');
    clearTimeout(typingTimeout.current);
    
    // Send with error handling
    try {
      socketRef.current.emit('send_message', newMessage, (ack) => {
        if (!ack) {
          console.error('No acknowledgement from server');
          setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
        } else {
          setMessages(prev => prev.map(msg => 
            msg.id === newMessage.id ? { ...msg, pending: false } : msg
          ));
        }
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    }
  };

  const handleTyping = () => {
    if (!username || !isConnected) return;
    
    clearTimeout(typingTimeout.current);
    socketRef.current.emit('typing', `${username} is typing...`);
    
    typingTimeout.current = setTimeout(() => {
      socketRef.current.emit('stop_typing');
    }, 1000);
  };

  const handleJoinChat = (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (trimmedUsername) {
      socketRef.current.emit('join_chat', trimmedUsername, (response) => {
        if (response?.error) {
          console.error('Join error:', response.error);
          setConnectionError(response.error);
        }
      });
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
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9]+" // Basic username validation
            />
            <button type="submit">Join</button>
            {connectionError && (
              <div className="error-message">{connectionError}</div>
            )}
          </form>
        </div>
      ) : (
        <div className="chat-container">
          <div className="chat-header">
            <h2>Chat Room</h2>
            <div className="status">
              <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? 'Online' : 'Offline'}
                {!isConnected && (
                  <span className="reconnecting"> (Reconnecting...)</span>
                )}
              </span>
              <span className="username">Hello, {username}</span>
            </div>
            {connectionError && (
              <div className="connection-error">
                {connectionError}
                <button 
                  onClick={() => socketRef.current.connect()} 
                  className="reconnect-btn"
                >
                  Reconnect
                </button>
              </div>
            )}
          </div>

          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                No messages yet. Send the first message!
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`message ${msg.sender === username ? 'sent' : 'received'} ${msg.system ? 'system' : ''} ${msg.pending ? 'pending' : ''}`}
                >
                  {!msg.system && (
                    <span className="sender">
                      {msg.sender === username ? 'You' : msg.sender}
                    </span>
                  )}
                  <p>{msg.text}</p>
                  {!msg.system && !msg.pending && (
                    <span className="timestamp">{msg.timestamp}</span>
                  )}
                  {msg.pending && (
                    <span className="pending-indicator">Sending...</span>
                  )}
                </div>
              ))
            )}
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
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              disabled={!isConnected}
              maxLength={500}
              aria-disabled={!isConnected}
            />
            <button 
              type="submit" 
              disabled={!message.trim() || !isConnected}
              aria-label="Send message"
            >
              {isConnected ? 'Send' : 'Disconnected'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;