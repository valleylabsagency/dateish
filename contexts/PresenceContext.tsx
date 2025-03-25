import React, { useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import { getDatabase, ref, onDisconnect, onValue, set } from 'firebase/database';
import { auth } from '../firebase';

interface PresenceWrapperProps {
  children: ReactNode;
}

export default function PresenceWrapper({ children }: PresenceWrapperProps) {
  useEffect(() => {
    const db = getDatabase();
    if (!auth.currentUser) return;

    const userStatusRef = ref(db, 'status/' + auth.currentUser.uid);
    const connectedRef = ref(db, '.info/connected');

    // Listen for connection state changes
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // When connected, schedule onDisconnect and set online status
        onDisconnect(userStatusRef).set({ online: false });
        set(userStatusRef, { online: true });
      }
    });

    // Monitor app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (auth.currentUser) {
        if (nextAppState === 'active') {
          set(userStatusRef, { online: true });
        } else {
          set(userStatusRef, { online: false });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      unsubscribeConnected();
    };
  }, []);

  return <>{children}</>;
}
