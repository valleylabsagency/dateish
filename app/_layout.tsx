// _layout.tsx
import React, { useState, createContext } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import Navbar from "../components/Navbar";
import { ProfileProvider } from "../contexts/ProfileContext";

export const NavbarContext = createContext({
  showNavbar: false,
  setShowNavbar: (value: boolean) => {},
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showNavbar, setShowNavbar] = useState(false);
  const pathname = usePathname();

  return (
    <ProfileProvider>
      <NavbarContext.Provider value={{ showNavbar, setShowNavbar }}>
        <View style={styles.container}>
          {/* Only show the top navbar if we’re not on the profile screen */}
          {pathname !== "/profile" && showNavbar && <Navbar />}
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </NavbarContext.Provider>
    </ProfileProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
