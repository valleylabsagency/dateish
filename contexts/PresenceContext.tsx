// PresenceWrapper.tsx
import React, { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { getDatabase, ref, onDisconnect, set, update } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { auth } from "../firebase";

type Props = React.PropsWithChildren<{}>;

const IDLE_LIMIT_MS  = 10 * 60 * 1000;   // 10 minutes
const LAST_BG_KEY    = "presence:lastBackgroundAt";

export default function PresenceWrapper({ children }: Props) {
  useEffect(() => {
    const db = getDatabase();
    let cleanupUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (cleanupUser) { cleanupUser(); cleanupUser = null; }
      if (!user) return;

      const userStatusRef = ref(db, `status/${user.uid}`);

      // If the app/socket dies, force hidden
      onDisconnect(userStatusRef)
        .set({ online: false, bar: false, lastActive: Date.now() })
        .catch(() => {});

      // Default state while not in the bar: hidden
      set(userStatusRef, { online: false, bar: false, lastActive: Date.now() }).catch(() => {});

      const onAppStateChange = async (next: AppStateStatus) => {
        if (next === "active") {
          const lastBgStr = await AsyncStorage.getItem(LAST_BG_KEY);
          const lastBg = lastBgStr ? parseInt(lastBgStr, 10) : 0;

          if (lastBg && Date.now() - lastBg >= IDLE_LIMIT_MS) {
            // Idle too long → send to entrance and keep hidden
            update(userStatusRef, { online: false, bar: false, lastActive: Date.now() }).catch(() => {});
            router.replace("/entrance");
          } else {
            // Foreground quickly → keep whatever 'online' was (don’t force true)
            update(userStatusRef, { lastActive: Date.now() }).catch(() => {});
          }
          await AsyncStorage.removeItem(LAST_BG_KEY);
        } else {
          // background/inactive — record the time; do not flip online=true
          await AsyncStorage.setItem(LAST_BG_KEY, String(Date.now()));
        }
      };

      const appSub = AppState.addEventListener("change", onAppStateChange);

      cleanupUser = () => {
        appSub.remove();
      };
    });

    return () => {
      if (cleanupUser) cleanupUser();
      unsubscribeAuth();
    };
  }, []);

  return <>{children}</>;
}
