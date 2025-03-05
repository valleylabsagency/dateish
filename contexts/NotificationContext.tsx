import React, { createContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  visible: boolean;
  message: string;
  chatId: string;
  senderName: string;
  showNotification: (message: string, chatId: string, senderName: string) => void;
  hideNotification: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  visible: false,
  message: '',
  chatId: '',
  senderName: '',
  showNotification: () => {},
  hideNotification: () => {},
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

  const hideNotification = () => {
    setVisible(false);
  };

  return (
    <NotificationContext.Provider value={{ visible, message, chatId, senderName, showNotification, hideNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
