const ChatMessages = ({ messages }) => {
  return (
    <div className="messages-container">
      {messages.map((msg, i) => (
        <div key={i} className="message">
          <span className="message-username">{msg.username}: </span>
          <span className="message-text">{msg.text}</span>
          <span className="message-time">{msg.time}</span>
        </div>
      ))}
    </div>
  );
};

export default ChatMessages;