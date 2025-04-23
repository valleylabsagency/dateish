// NotificationContext.tsx
import React, {
  createContext,
  useState,
  useRef,
  ReactNode,
  useEffect,
} from 'react';
import { auth, firestore } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  getDoc
} from 'firebase/firestore';

interface NotificationContextType {
  visible: boolean;
  message: string;
  partnerId: string;
  senderName: string;
  currentChatId: string | null;
  showNotification: (
    message: string,
    partnerId: string,
    senderName: string,
    currentChatId: string | null
  ) => void;
  hideNotification: () => void;
  setCurrentChatId: (chatId: string | null) => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  visible: false,
  message: '',
  partnerId: '',
  senderName: '',
  currentChatId: null,
  showNotification: () => {},
  hideNotification: () => {},
  setCurrentChatId: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // record startup time so we ignore old messages
  const startTimeRef = useRef<number>(Date.now());
  const lastNotifiedRef = useRef<{ [chatId: string]: string }>({});

  // keep a ref in sync with state so callbacks always see the latest
  const currentChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  const showNotification = (
    msg: string,
    pid: string,
    sName: string,
    _cid: string | null
  ) => {
    setMessage(msg);
    setPartnerId(pid);
    setSenderName(sName);
    setVisible(true);
  };

  const hideNotification = () => {
    setVisible(false);
  };

  // subscribe once, on mount
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // we'll collect all our unsub-functions here
    const unsubs: (() => void)[] = [];

    // 1) subscribe to all chats where I'm a participant
    const chatsQ = query(
      collection(firestore, 'chats'),
      where('users', 'array-contains', uid)
    );
    const unsubChats = onSnapshot(chatsQ, (chatSnap) => {
      // for each chat, open a "latest message" listener
      chatSnap.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        const data = chatDoc.data() as any;
        const users: string[] = data.users || [];
        const partner = users.find((u) => u !== uid) || '';
        const partnerName = data.partnerName || 'New message';

        const msgsQ = query(
          collection(firestore, 'chats', chatId, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const unsubMsg = onSnapshot(msgsQ, (msgSnap) => {
          if (msgSnap.empty) return;
        
          // grab the single newest doc and its ID
          const newestDoc = msgSnap.docs[0];
          const msgId     = newestDoc.id;
        
          // if we've already shown this one, skip
          if (lastNotifiedRef.current[chatId] === msgId) return;
        
          const msgData = newestDoc.data() as any;
          if (!msgData.createdAt) return;
        
          // normalize timestamp
          const ts =
            typeof msgData.createdAt.toMillis === 'function'
              ? msgData.createdAt.toMillis()
              : msgData.createdAt.seconds * 1000;
        
          // check your “new” & “not in open chat” conditions
          if (
            msgData.sender !== uid &&
            ts > startTimeRef.current &&
            chatId !== currentChatIdRef.current
          ) {
            // 1) load the sender’s profile first
            const userRef = doc(firestore, 'users', msgData.sender);
            getDoc(userRef)
              .then(userSnap => {
                const realName = userSnap.exists()
                  ? (userSnap.data() as any).name
                  : 'Unknown';
        
                // 2) only now show the notification
                showNotification(
                  msgData.text,
                  msgData.sender,
                  realName,
                  currentChatIdRef.current
                );
        
                // 3) mark this message as “already shown”
                lastNotifiedRef.current[chatId] = msgId;
              })
              .catch(console.error);
          }
        });

        unsubs.push(unsubMsg);
      });
    });

    unsubs.push(unsubChats);

    // cleanup all listeners on unmount
    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, []); // ← empty—only mount once

  return (
    <NotificationContext.Provider
      value={{
        visible,
        message,
        partnerId,
        senderName,
        currentChatId,
        showNotification,
        hideNotification,
        setCurrentChatId,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
