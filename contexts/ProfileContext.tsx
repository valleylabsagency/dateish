// ProfileContext.tsx
import React, { createContext, useState, ReactNode } from "react";

interface ProfileContextProps {
  profileComplete: boolean;
  setProfileComplete: (value: boolean) => void;
}

export const ProfileContext = createContext<ProfileContextProps>({
  profileComplete: false,
  setProfileComplete: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profileComplete, setProfileComplete] = useState(false);
  return (
    <ProfileContext.Provider value={{ profileComplete, setProfileComplete }}>
      {children}
    </ProfileContext.Provider>
  );
}
