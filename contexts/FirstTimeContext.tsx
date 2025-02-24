// contexts/FirstTimeContext.tsx
import React, { createContext, useState, ReactNode } from "react";

interface FirstTimeContextProps {
  firstTime: boolean;
  setFirstTime: (value: boolean) => void;
}

export const FirstTimeContext = createContext<FirstTimeContextProps>({
  firstTime: false,
  setFirstTime: () => {},
});

export function FirstTimeProvider({ children }: { children: ReactNode }) {
  const [firstTime, setFirstTime] = useState(false);
  return (
    <FirstTimeContext.Provider value={{ firstTime, setFirstTime }}>
      {children}
    </FirstTimeContext.Provider>
  );
}
