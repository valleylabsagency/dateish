// NotificationContext.tsx
import React, { createContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  visible: boolean;
  message: string;
  chatId: string;
  showNotification: (message: string, chatId: string) => void;
  hideNotification: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  visible: false,
  message: '',
  chatId: '',
  showNotification: () => {},
  hideNotification: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState('');

  const showNotification = (msg: string, chatId: string) => {
    setMessage(msg);
    setChatId(chatId);
    setVisible(true);
  };

  const hideNotification = () => {
    setVisible(false);
  };

  return (
    <NotificationContext.Provider value={{ visible, message, chatId, showNotification, hideNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
