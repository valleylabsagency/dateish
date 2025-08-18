import React, { useEffect, ReactNode } from "react";
import { AppState } from "react-native";
import { getDatabase, ref, onDisconnect, onValue, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

interface PresenceWrapperProps {
  children: ReactNode;
}

export default function PresenceWrapper({ children }: PresenceWrapperProps) {
  useEffect(() => {
    const db = getDatabase();
    // Listen for auth state changes to ensure a user is present
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return; // No user is logged in
      
      const userStatusRef = ref(db, `status/${user.uid}`);
      const connectedRef = ref(db, ".info/connected");

      // Listen for connection state changes
      const unsubscribeConnected = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          onDisconnect(userStatusRef).set({ online: false });
          set(userStatusRef, { online: true });
        }
      });

      // sets to offline if the user has app in the background.
      //  Commented out so a user is offline only if they close the app entirely
      
      /*const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === "active") {
          set(userStatusRef, { online: true });
          console.log(`User ${user.uid} active`);
        } else {
          set(userStatusRef, { online: false });
          console.log(`User ${user.uid} inactive`);
        }
      };

      const subscription = AppState.addEventListener("change", handleAppStateChange); */

      // Cleanup the connected listener and AppState listener for this user
      return () => {
        unsubscribeConnected();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  return <>{children}</>;
}
