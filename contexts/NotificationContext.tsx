import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
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
  setDoc,
} from 'firebase/firestore';


const PROJECT_ID = "91d81c7f-935a-4bb4-8f75-062721f369ba";

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,   // shows alert-style UI in foreground
    shouldPlaySound: false,  // no sound in foreground
    shouldSetBadge: false,   // don’t change app badge
    shouldShowBanner: true,  // iOS foreground banner
    shouldShowList: true,    // show in Android/iOS notification list
  }),
});

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
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);
  

  // 1️⃣ Register for push and save token
useEffect(() => {
  let unsubAuth: (() => void) | null = null;

  (async () => {
    try {
      console.log("[Push] registration effect start. isDevice =", Constants.isDevice);

      // You can keep this check if you want, but log it
      if (!Constants.isDevice) {
        console.warn("[Push] Not a physical device – token registration skipped");
        return;
      }

      // Ask / check permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log("[Push] existing permission status =", existingStatus);

      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("[Push] requestPermissionsAsync returned =", status);
      }

      if (finalStatus !== "granted") {
        console.warn("[Push] Push notification permission not granted!");
        return;
      }

      // Android channel
      if (Platform.OS === "android") {
        console.log("[Push] setting Android notification channel");
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          sound: "push_notif.wav",
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // Get Expo token
      console.log("[Push] calling getExpoPushTokenAsync with projectId =", PROJECT_ID);
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
      const expoPushToken = tokenResponse.data;
      console.log("[Push] got Expo push token:", expoPushToken);

      // Write for current user if already logged in
      if (auth.currentUser) {
        console.log("[Push] writing token for currentUser uid =", auth.currentUser.uid);
        await setDoc(
          doc(firestore, "users", auth.currentUser.uid),
          { expoPushToken },
          { merge: true }
        );
        console.log("[Push] token written for currentUser");
      }

      // Also update token when auth state changes
      unsubAuth = auth.onAuthStateChanged(async (u) => {
        if (u) {
          console.log("[Push] auth state changed – writing token for uid =", u.uid);
          await setDoc(doc(firestore, "users", u.uid), { expoPushToken }, { merge: true });
          console.log("[Push] token written after auth state change");
        }
      });
    } catch (err) {
      console.error("[Push] Error during registration:", err);
    }
  })();

  return () => {
    if (unsubAuth) unsubAuth();
  };
}, []);


  // keep refs for filtering
  const uidRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastNotifiedRef = useRef<{ [chat: string]: string }>({});
  const msgUnsubs = useRef<(() => void)[]>([]);

  const hideNotification = () => {
    setVisible(false);
  };

  const showNotification = (msg: string, pid: string, name: string) => {
  console.log("[Notif] showNotification called with:", { msg, pid, name });
  setVisible(false);
  setMessage(msg);
  setPartnerId(pid);
  setSenderName(name);
  setTimeout(() => setVisible(true), 50);
};


  // 2️⃣ Listen for incoming push responses (foreground behavior)
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      // You could also inspect notification.request.content.data here
      const { body, data } = notification.request.content;
      showNotification(body || '', data.partnerId || '', data.senderName || '');
    });
    return () => receivedSub.remove();
  }, []);

 // 3️⃣ Existing Firestore message‐watching logic triggers local in‐app banners
// 3️⃣ Firestore message‐watching logic triggers local in‐app banners
// 1️⃣ Register for push and save token
useEffect(() => {
  let unsubAuth: (() => void) | null = null;

  (async () => {
    try {
      console.log("[Push] registration effect start");

      // Ask / check permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log("[Push] existing permission status =", existingStatus);

      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("[Push] requestPermissionsAsync returned =", status);
      }

      if (finalStatus !== "granted") {
        console.warn("[Push] Push notification permission not granted!");
        return;
      }

      // Android channel
      if (Platform.OS === "android") {
        console.log("[Push] setting Android notification channel");
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          sound: "push_notif.wav",
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // Get Expo token
      console.log("[Push] calling getExpoPushTokenAsync with projectId =", PROJECT_ID);
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
      const expoPushToken = tokenResponse.data;
      console.log("[Push] got Expo push token:", expoPushToken);

      // Write for current user if already logged in
      if (auth.currentUser) {
        console.log("[Push] writing token for currentUser uid =", auth.currentUser.uid);
        await setDoc(
          doc(firestore, "users", auth.currentUser.uid),
          { expoPushToken },
          { merge: true }
        );
        console.log("[Push] token written for currentUser");
      }

      // Also update token when auth state changes
      unsubAuth = auth.onAuthStateChanged(async (u) => {
        if (u) {
          console.log("[Push] auth state changed – writing token for uid =", u.uid);
          await setDoc(doc(firestore, "users", u.uid), { expoPushToken }, { merge: true });
          console.log("[Push] token written after auth state change");
        }
      });
    } catch (err) {
      console.error("[Push] Error during registration:", err);
    }
  })();

  return () => {
    if (unsubAuth) unsubAuth();
  };
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
      }}>
      {children}
    </NotificationContext.Provider>
  );
}
