import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

const ChatRoom = ({ username }) => {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.connect();
    
    socket.emit('user_join', username);

    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('user_list', (userList) => {
      setUsers(userList);
    });

    socket.on('user_joined', (user) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `${user.username} joined the chat`,
        sender: 'System',
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('user_left', (user) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `${user.username} left the chat`,
        sender: 'System',
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('typing_users', (users) => {
      setTypingUsers(users);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_list');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('typing_users');
      socket.disconnect();
    };
  }, [username, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('send_message', message.trim());
      setMessage('');
      socket.emit('typing', false);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      socket.emit('typing', true);
    } else {
      socket.emit('typing', false);
    }
  };

  return (
    <div className="chat-room">
      <div className="user-list">
        <h3>Online Users ({users.length})</h3>
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.username}</li>
          ))}
        </ul>
      </div>
      
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.sender === username ? 'sent' : 'received'}`}>
            <div className="message-header">
              <span className="sender">{msg.sender}</span>
              <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="message-content">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="typing-indicator">
        {typingUsers.length > 0 && (
          <p>{typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</p>
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatRoom;