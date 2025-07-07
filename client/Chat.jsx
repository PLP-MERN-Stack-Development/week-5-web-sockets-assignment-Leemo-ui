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

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const showNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  };

  useEffect(() => {
    // Request notification permission when component mounts
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    socket.emit('register', username);

    socket.on('message', (message) => {
      if (document.hidden || message.sender !== username) {
        playNotificationSound();
        if (document.hidden && message.sender !== username) {
          showNotification(`New message from ${message.sender}`, message.text);
        }
      }
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
      playNotificationSound();
      if (document.hidden) {
        showNotification('User joined', `${username} joined the chat`);
      }
      setMessages((prev) => [...prev, {
        text: `${username} joined the chat`,
        isSystem: true,
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('user-disconnected', (username) => {
      playNotificationSound();
      if (document.hidden) {
        showNotification('User left', `${username} left the chat`);
      }
      setMessages((prev) => [...prev, {
        text: `${username} left the chat`,
        isSystem: true,
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('private-message', ({ from, text, timestamp }) => {
      playNotificationSound();
      if (document.hidden) {
        showNotification(`Private message from ${from}`, text);
      }
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

    socket.on('file-upload', (fileData) => {
      playNotificationSound();
      if (document.hidden) {
        if (fileData.to && fileData.to === username) {
          showNotification(`Private file from ${fileData.from}`, fileData.fileName);
        } else {
          showNotification(`New file from ${fileData.from}`, fileData.fileName);
        }
      }

      if (fileData.to && fileData.to === username) {
        // Private file message
        setPrivateMessages(prev => ({
          ...prev,
          [fileData.from]: [...(prev[fileData.from] || []), {
            file: fileData.file,
            fileName: fileData.fileName,
            fileType: fileData.fileType,
            sender: fileData.from,
            timestamp: new Date().toISOString(),
            isPrivate: true
          }]
        }));
      } else {
        // Public file message
        setMessages(prev => [...prev, {
          file: fileData.file,
          fileName: fileData.fileName,
          fileType: fileData.fileType,
          sender: fileData.from,
          timestamp: new Date().toISOString()
        }]);
      }
    });

    return () => {
      socket.off('message');
      socket.off('user-list');
      socket.off('typing');
      socket.off('user-connected');
      socket.off('user-disconnected');
      socket.off('private-message');
      socket.off('file-upload');
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = {
          file: event.target.result,
          fileName: file.name,
          fileType: file.type
        };
        
        if (activeUser) {
          // Private file upload
          fileData.to = activeUser;
          socket.emit('private-file-upload', fileData);
          setPrivateMessages(prev => ({
            ...prev,
            [activeUser]: [...(prev[activeUser] || []), {
              ...fileData,
              sender: 'You',
              timestamp: new Date().toISOString(),
              isPrivate: true
            }]
          }));
        } else {
          // Public file upload
          socket.emit('file-upload', fileData);
          setMessages(prev => [...prev, {
            ...fileData,
            sender: username,
            timestamp: new Date().toISOString()
          }]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderFileMessage = (msg) => (
    <div className="file-message">
      {msg.fileType.startsWith('image/') ? (
        <img src={msg.file} alt={msg.fileName} className="uploaded-image" />
      ) : (
        <a href={msg.file} download={msg.fileName} className="file-download">
          Download {msg.fileName}
        </a>
      )}
    </div>
  );

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
                {msg.text && (
                  <>
                    <span className="sender">{msg.sender}: </span>
                    <span className="text">{msg.text}</span>
                  </>
                )}
                {msg.file && renderFileMessage(msg)}
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
                {!msg.isSystem && msg.text && (
                  <>
                    <span className="sender">{msg.sender}: </span>
                    <span className="text">{msg.text}</span>
                  </>
                )}
                {msg.isSystem && <span className="text">{msg.text}</span>}
                {msg.file && renderFileMessage(msg)}
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
        <div className="form-actions">
          <button type="submit">Send</button>
          <div className="file-upload-container">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="file-upload-button">
              📎
            </label>
          </div>
        </div>
      </form>
    </div>
  );
}