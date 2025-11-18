// components/InactivityHandler.tsx
import React, { useEffect, useRef, PropsWithChildren } from "react";
import {
  AppState,
  AppStateStatus,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { getDatabase, ref as rtdbRef, update as rtdbUpdate } from "firebase/database";
import { auth } from "../firebase";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export default function InactivityHandler({ children }: PropsWithChildren<{}>) {
  const router = useRouter();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const handleTimeout = () => {
    const user = auth.currentUser;

    // Mark them as "out of the bar" but keep them logged in
    if (user) {
      try {
        const db = getDatabase();
        const statusRef = rtdbRef(db, `status/${user.uid}`);
        rtdbUpdate(statusRef, {
          online: false,
          bar: false,
          lastActive: Date.now(),
        }).catch(() => {});
      } catch {}
    }

    // Just send to entrance – DO NOT signOut
    router.replace("/entrance");
  };

  const resetIdleTimer = () => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(handleTimeout, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    // Start timer when mounted
    resetIdleTimer();

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        // When app comes back to foreground, restart idle timer
        resetIdleTimer();
      } else {
        // In background / inactive, stop counting foreground inactivity
        clearIdleTimer();
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      clearIdleTimer();
      sub.remove();
    };
  }, []);

  return (
    <TouchableWithoutFeedback
      onPress={resetIdleTimer}
      // This keeps touches from children counting as “activity”
      // If you already track gestures another way, you can tweak/remove this
      onPressIn={resetIdleTimer}
    >
      {children}
    </TouchableWithoutFeedback>
  );
}
