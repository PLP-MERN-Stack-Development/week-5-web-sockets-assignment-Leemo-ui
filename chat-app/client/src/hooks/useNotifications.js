import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const useNotifications = () => {
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNewMessage = (message) => {
      // Play notification sound
      const audio = new Audio('/notification.mp3');
      audio.play();
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(`New message from ${message.sender}`, {
          body: message.text,
          icon: '/logo.png'
        });
      }

      // Add to notifications
      setNotifications(prev => [...prev, message]);
      setUnreadCount(prev => prev + 1);
    };

    const handleUnreadUpdate = (counts) => {
      setUnreadCount(counts.total);
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('private_message', handleNewMessage);
    socket.on('unread_updated', handleUnreadUpdate);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('private_message', handleNewMessage);
      socket.off('unread_updated', handleUnreadUpdate);
    };
  }, [socket]);

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    requestNotificationPermission,
    markAsRead
  };
};

export default useNotifications;