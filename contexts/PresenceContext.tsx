import React, { useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import { getDatabase, ref, onDisconnect, set } from 'firebase/database';
import { auth } from '../firebase';

interface PresenceWrapperProps {
  children: ReactNode;
}

export default function PresenceWrapper({ children }: PresenceWrapperProps) {
  useEffect(() => {
    const db = getDatabase();
    
    // Function to update presence based on the app state.
    const handleAppStateChange = (nextAppState: string) => {
      if (auth.currentUser) {
        const userStatusRef = ref(db, 'status/' + auth.currentUser.uid);
        if (nextAppState === 'active') {
          // User is active, mark as online
          set(userStatusRef, { online: true });
        } else {
          // App is backgrounded or inactive, mark as offline
          set(userStatusRef, { online: false });
        }
      }
    };

    // Subscribe to app state changes.
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Immediately set online status and configure onDisconnect.
    if (auth.currentUser) {
      const userStatusRef = ref(db, 'status/' + auth.currentUser.uid);
      set(userStatusRef, { online: true });
      onDisconnect(userStatusRef).set({ online: false });
    }

    return () => {
      subscription.remove();
    };
  }, []);

  return <>{children}</>;
}
