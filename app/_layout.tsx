// _layout.tsx
import React, { useState, createContext } from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import Navbar from "../components/Navbar";

export const NavbarContext = createContext({
  showNavbar: false,
  setShowNavbar: (value: boolean) => {},
});

export default function Layout() {
  const [showNavbar, setShowNavbar] = useState(false);

  return (
    <NavbarContext.Provider value={{ showNavbar, setShowNavbar }}>
      <View style={styles.container}>
        {showNavbar && <Navbar />}
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </NavbarContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
