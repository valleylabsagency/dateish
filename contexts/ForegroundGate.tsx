import React, { ReactNode, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { usePathname, useRouter } from "expo-router";

export default function ForegroundGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const stateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = stateRef.current;
      stateRef.current = next;

      // Background/inactive -> active
      if ((prev === "background" || prev === "inactive") && next === "active") {
        if (pathname !== "/entrance") router.replace("/entrance");
      }
    });
    return () => sub.remove();
  }, [router, pathname]);

  return <>{children}</>;
}
