// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "../firebase";
import type { User } from "firebase/auth";

type AuthValue = { user: User | null; authReady: boolean };
type Props = React.PropsWithChildren<{}>;

const AuthContext = createContext<AuthValue>({ user: null, authReady: false });

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  return <AuthContext.Provider value={{ user, authReady }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
