import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const PrivateChat = ({ currentUser, recipient }) => {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handlePrivateMessage = (msg) => {
      if ((msg.from === socket.id && msg.to === recipient.id) || 
          (msg.to === socket.id && msg.from === recipient.id)) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on('private_message', handlePrivateMessage);

    return () => {
      socket.off('private_message', handlePrivateMessage);
    };
  }, [recipient, socket]);

  const sendPrivateMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('private_message', {
        to: recipient.id,
        message: message.trim()
      });
      setMessage('');
    }
  };

  return (
    <div className="private-chat">
      <h3>Chat with {recipient.username}</h3>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.from === socket.id ? 'sent' : 'received'}`}>
            <div className="message-content">{msg.message}</div>
            <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <form onSubmit={sendPrivateMessage}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your private message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default PrivateChat;