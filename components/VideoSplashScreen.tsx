import React, { useState, useEffect, createContext, useCallback, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import Navbar from "../components/Navbar";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { NotificationContext, NotificationProvider } from "@/contexts/NotificationContext";
import AuthWrapper from "@/contexts/AuthContext";

import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { Video } from "expo-av";

import InAppNotification from "../components/InAppNotification";
import OfflineNotice from "../components/OfflineNotice";

// Prevent the native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

export const NavbarContext = createContext({
  showWcButton: false,
  setShowWcButton: (value: boolean) => {},
});

// VideoSplashScreen component that plays your video splash
function VideoSplashScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <View style={styles.splashContainer}>
      <Video
        source={require("../assets/videos/splash-movie.mp4")}
        style={styles.video}
        resizeMode="cover"
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.didJustFinish) {
            onFinish();
          }
        }}
      />
    </View>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showWcButton, setShowWcButton] = useState(false);
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide the Android navigation bar
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  // Hide the navbar on certain routes
  const hideNavbar =
    pathname === "/profile" || pathname === "/welcome" || pathname === "/chat";

  // When the video splash finishes, hide the native splash screen
  const handleSplashFinish = useCallback(async () => {
    setShowSplash(false);
    await SplashScreen.hideAsync();
  }, []);

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
                  {showSplash ? (
                    <VideoSplashScreen onFinish={handleSplashFinish} />
                  ) : (
                    <Stack screenOptions={{ headerShown: false }} />
                  )}
                  <StatusBar hidden />
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
      <InAppNotification
        visible={visible}
        message={message}
        chatId={chatId}
        onDismiss={hideNotification}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: "transparent", // use transparent so nothing obstructs the video
  },
  video: {
    flex: 1,
  },
});
