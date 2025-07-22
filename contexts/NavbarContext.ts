// app/contexts/NavbarContext.ts
import { createContext } from 'react';

export interface NavbarContextValue {
  showWcButton: boolean;
  setShowWcButton(v: boolean): void;
}

export const NavbarContext = createContext<NavbarContextValue>({
  showWcButton: false,
  setShowWcButton: () => {},
});
