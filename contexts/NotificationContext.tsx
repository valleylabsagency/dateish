import React, { createContext, useState, useEffect, ReactNode } from 'react';

interface NotificationContextType {
  visible: boolean;
  message: string;
  chatId: string;
  senderName: string;
  showNotification: (message: string, chatId: string, senderName: string) => void;
  hideNotification: () => void;
  updateNotification: (message: string, chatId: string, senderName: string) => void
}

export const NotificationContext = createContext<NotificationContextType>({
  visible: false,
  message: '',
  chatId: '',
  senderName: '',
  showNotification: () => {},
  hideNotification: () => {},
  updateNotification: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState('');
  const [senderName, setSenderName] = useState('');

  const showNotification = (msg: string, chatId: string, senderName: string) => {
    setMessage(msg);
    setChatId(chatId);
    setSenderName(senderName);
    setVisible(true);
  };

  const updateNotification = (msg: string, senderName: string, chatId: string) => {
    // Only update the content without showing it.
    setMessage(msg);
    setSenderName(senderName);
    setChatId(chatId);
    // Do not change visible
  };

  const hideNotification = () => {
    setVisible(false);
  };

  return (
    <NotificationContext.Provider value={{ visible, message, chatId, senderName, showNotification, hideNotification, updateNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
