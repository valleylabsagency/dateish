// contexts/ForegroundGate.tsx
import React, { ReactNode, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export default function ForegroundGate({ children }: { children: ReactNode }) {
  const stateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Keep this only if you want to observe app state; do NOT navigate here.
    const sub = AppState.addEventListener("change", (next) => {
      stateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
