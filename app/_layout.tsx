// _layout.tsx
import React, { useState, createContext } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import Navbar from "../components/Navbar";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { NotificationContext, NotificationProvider } from "@/contexts/NotificationContext";
import AuthWrapper  from "@/contexts/AuthContext";

import InAppNotification from '../components/InAppNotification';
import OfflineNotice from '../components/OfflineNotice';

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
    <AuthWrapper>
      <MusicProvider>
        <NotificationProvider>
        <FirstTimeProvider>
          <ProfileProvider>
            <NavbarContext.Provider value={{ showWcButton, setShowWcButton }}>
              <View style={styles.container}>
                <OfflineNotice />
                {!hideNavbar && <Navbar />}
                <Stack screenOptions={{ headerShown: false }} />
              </View>
            </NavbarContext.Provider>
          </ProfileProvider>
        </FirstTimeProvider>
      </NotificationProvider>
      </MusicProvider>
      
    </AuthWrapper>
    
    
  );
}

function GlobalLayout({ children }: { children: React.ReactNode }) {
  const { visible, message, chatId, hideNotification } = useContext(NotificationContext);

  return (
    <View style={styles.container}>
      {/* Render the notification over all screens */}
      <InAppNotification visible={visible} message={message} chatId={chatId} onDismiss={hideNotification} />
      {children}
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
