import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import ChatMessages from '../components/ChatMessages';
import ChatInput from '../components/ChatInput';

const ChatPage = ({ username }) => {
  const [messages, setMessages] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    const messageHandler = (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    socket.on('message', messageHandler);

    return () => {
      socket.off('message', messageHandler);
    };
  }, [socket]);

  const handleSendMessage = (message) => {
    socket.emit('message', {
      username,
      text: message,
      time: new Date().toLocaleTimeString()
    });
  };

  return (
    <div className="chat-container">
      <h1>Real-Time Chat</h1>
      <p>Status: {socket.connected ? 'Connected' : 'Disconnected'}</p>
      <ChatMessages messages={messages} />
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatPage;