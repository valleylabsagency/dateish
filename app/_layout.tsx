// _layout.tsx
import React, { useState, createContext } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import Navbar from "../components/Navbar";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";

export const NavbarContext = createContext({
  showWcButton: false,
  setShowWcButton: (value: boolean) => {},
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showWcButton, setShowWcButton] = useState(false);
  const pathname = usePathname();

  // Adjust the condition: hide navbar on both "/profile" and the welcome page ("/" or "/welcome")
  const hideNavbar = pathname === "/profile" || pathname === "/welcome" || pathname === "/chat";

  return (
    <FirstTimeProvider>
      <ProfileProvider>
        <NavbarContext.Provider value={{ showWcButton, setShowWcButton }}>
          <View style={styles.container}>
            {!hideNavbar && <Navbar />}
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </NavbarContext.Provider>
      </ProfileProvider>
    </FirstTimeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
