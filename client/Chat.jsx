import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000');

export default function Chat({ username }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [activeUser, setActiveUser] = useState(null);
  const [privateMessages, setPrivateMessages] = useState({});

  useEffect(() => {
    socket.emit('register', username);

    socket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user-list', (userList) => {
      setUsers(userList);
    });

    socket.on('typing', ({ username, isTyping }) => {
      setTypingUsers((prev) => 
        isTyping 
          ? [...new Set([...prev, username])] 
          : prev.filter(user => user !== username)
      );
    });

    socket.on('user-connected', (username) => {
      setMessages((prev) => [...prev, {
        text: `${username} joined the chat`,
        isSystem: true,
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('user-disconnected', (username) => {
      setMessages((prev) => [...prev, {
        text: `${username} left the chat`,
        isSystem: true,
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('private-message', ({ from, text, timestamp }) => {
      setPrivateMessages(prev => ({
        ...prev,
        [from]: [...(prev[from] || []), {
          text,
          sender: from,
          timestamp,
          isPrivate: true
        }]
      }));
    });

    return () => {
      socket.off('message');
      socket.off('user-list');
      socket.off('typing');
      socket.off('user-connected');
      socket.off('user-disconnected');
      socket.off('private-message');
    };
  }, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, privateMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      if (activeUser) {
        handlePrivateMessage(e);
      } else {
        socket.emit('message', { text: message });
        setMessage('');
        socket.emit('typing', false);
      }
    }
  };

  const handleTyping = () => {
    if (message.trim()) {
      socket.emit('typing', true);
    } else {
      socket.emit('typing', false);
    }
  };

  const handlePrivateMessage = (e) => {
    e.preventDefault();
    if (message.trim() && activeUser) {
      socket.emit('private-message', { to: activeUser, text: message });
      setPrivateMessages(prev => ({
        ...prev,
        [activeUser]: [...(prev[activeUser] || []), {
          text: message,
          sender: 'You',
          timestamp: new Date().toISOString(),
          isPrivate: true
        }]
      }));
      setMessage('');
      socket.emit('typing', false);
    }
  };

  return (
    <div className="chat-container">
      <div className="user-list">
        <h3>Online Users ({users.length})</h3>
        <ul>
          {users.map((user, index) => (
            <li 
              key={index} 
              onClick={() => setActiveUser(user.username)}
              className={activeUser === user.username ? 'active' : ''}
            >
              {user.username}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="chat-messages">
        {activeUser ? (
          <div className="private-chat">
            <h4>Private chat with {activeUser}</h4>
            {(privateMessages[activeUser] || []).map((msg, index) => (
              <div key={index} className={`message ${msg.isPrivate ? 'private' : ''}`}>
                <span className="sender">{msg.sender}: </span>
                <span className="text">{msg.text}</span>
                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.isSystem ? 'system' : ''}`}>
                {!msg.isSystem && <span className="sender">{msg.sender}: </span>}
                <span className="text">{msg.text}</span>
                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder={`Type a ${activeUser ? 'private' : 'public'} message...`}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}