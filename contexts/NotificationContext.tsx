import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
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
  getDoc,
} from 'firebase/firestore';

interface NotificationContextType {
  visible: boolean;
  message: string;
  senderName: string;
  partnerId: string;
  currentChatId: string | null;
  hideNotification: () => void;
  setCurrentChatId: (chatId: string | null) => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  visible: false,
  message: '',
  senderName: '',
  partnerId: '',
  currentChatId: null,
  hideNotification: () => {},
  setCurrentChatId: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // keep a ref in sync
  const currentChatIdRef = useRef<string | null>(null);
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

  const uidRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastNotifiedRef = useRef<{ [chat: string]: string }>({});
  const subscribedChats = useRef<Set<string>>(new Set());
  const msgUnsubs = useRef<(() => void)[]>([]);

  const hideNotification = () => {
    setVisible(false);
  };

  const showNotification = (msg: string, pid: string, name: string) => {
    setVisible(false);
    setMessage(msg);
    setPartnerId(pid);
    setSenderName(name);
    setTimeout(() => setVisible(true), 50);
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (!user) return;
      uidRef.current = user.uid;
      startTimeRef.current = Date.now();

      const chatsQ = query(
        collection(firestore, 'chats'),
        where('users', 'array-contains', user.uid)
      );

      const unsubChats = onSnapshot(chatsQ, snapshot => {
        // clear previous message listeners
        msgUnsubs.current.forEach(unsub => unsub());
        msgUnsubs.current = [];

        snapshot.forEach(chatDoc => {
          const chatId = chatDoc.id;

          const msgsQ = query(
            collection(firestore, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(1)
          );

          const unsubMsg = onSnapshot(msgsQ, msgSnap => {
            if (msgSnap.empty) return;
            

            const doc0 = msgSnap.docs[0];
            const id0 = doc0.id;
            const data0 = doc0.data() as any;

            if (!data0.createdAt || !data0.sender) return;
            const ts =
              typeof data0.createdAt.toMillis === 'function'
                ? data0.createdAt.toMillis()
                : data0.createdAt.seconds * 1000;

            if (
              ts > startTimeRef.current &&
              data0.sender !== uidRef.current &&
              currentChatIdRef.current !== chatId &&
              lastNotifiedRef.current[chatId] !== id0
            ) {
              getDoc(doc(firestore, 'users', data0.sender)).then(u => {
                const realName = u.exists() ? (u.data() as any).name : 'Unknown';
                showNotification(data0.text, data0.sender, realName);
                lastNotifiedRef.current[chatId] = id0;
              });
            }
          });

          msgUnsubs.current.push(unsubMsg);
        });
      });

      return () => {
        unsubChats();
        msgUnsubs.current.forEach(unsub => unsub());
      };
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        visible,
        message,
        senderName,
        partnerId,
        currentChatId,
        hideNotification,
        setCurrentChatId,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
