import React, { createContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  visible: boolean;
  message: string;
  partnerId: string;
  senderName: string;
  showNotification: (
    message: string,
    partnerId: string,
    senderName: string,
    currentChatId: string
  ) => void;
  hideNotification: () => void;
  updateNotification: (
    message: string,
    partnerId: string,
    senderName: string
  ) => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  visible: false,
  message: '',
  partnerId: '',
  senderName: '',
  showNotification: () => {},
  hideNotification: () => {},
  updateNotification: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [senderName, setSenderName] = useState('');

  const showNotification = (
    msg: string,
    partnerId: string,
    senderName: string,
    currentChatId: string
  ) => {
    // If you're already in the current chat with this partner, don't show the notification.
    console.log(currentChatId);
    if (currentChatId && partnerId === currentChatId) {
      return;
    }
    setMessage(msg);
    setPartnerId(partnerId);
    setSenderName(senderName);
    setVisible(true);
  };

  const updateNotification = (
    msg: string,
    partnerId: string,
    senderName: string
  ) => {
    setMessage(msg);
    setPartnerId(partnerId);
    setSenderName(senderName);
    // Keep visible as is.
  };

  const hideNotification = () => {
    setVisible(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        visible,
        message,
        partnerId,
        senderName,
        showNotification,
        hideNotification,
        updateNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
