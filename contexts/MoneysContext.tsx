// contexts/MoneysContext.tsx
import React, { createContext, useCallback, useMemo, useState } from "react";
import { Animated } from "react-native";

type Drop = {
  id: string;
  amount: number;
  y: Animated.Value;
  opacity: Animated.Value;
};

type MoneysContextType = {
  triggerSpend: (amount: number) => void;
  activeDrops: Drop[];
};

export const MoneysContext = createContext<MoneysContextType>({
  triggerSpend: () => {},
  activeDrops: [],
});

export const MoneysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drops, setDrops] = useState<Drop[]>([]);

  const triggerSpend = useCallback((amount: number) => {
    const id = Math.random().toString(36).slice(2);
    const y = new Animated.Value(0);
    const opacity = new Animated.Value(1);
    const drop: Drop = { id, amount, y, opacity };

    setDrops(prev => [...prev, drop]);

    Animated.parallel([
      Animated.timing(y, {
        toValue: 40,       // how far it falls (px)
        duration: 800,     // how long the fall lasts
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // remove when finished
      setDrops(prev => prev.filter(d => d.id !== id));
    });
  }, []);

  const value = useMemo(() => ({ triggerSpend, activeDrops: drops }), [triggerSpend, drops]);

  return (
    <MoneysContext.Provider value={value}>
      {children}
    </MoneysContext.Provider>
  );
};
