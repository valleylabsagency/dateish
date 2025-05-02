import React, { useState, createContext, useEffect, useContext } from "react";
import { View, Text, StyleSheet, TouchableWithoutFeedback, ImageBackground, ActivityIndicator, I18nManager, BackHandler } from "react-native";
import { Stack, usePathname, useRouter, useLocalSearchParams} from "expo-router";
import Navbar from "../components/Navbar";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";
import { MusicProvider, MusicContext } from "@/contexts/MusicContext";
import { NotificationProvider, NotificationContext } from "@/contexts/NotificationContext";
import InactivityHandler from "../components/InactivityHandler";
import PresenceWrapper from "@/contexts/PresenceContext"
import AuthWrapper from "@/contexts/AuthContext";
import * as Updates from "expo-updates";
import { getDatabase, ref, onValue } from "firebase/database";


import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";

import InAppNotification from "../components/InAppNotification";
import OfflineNotice from "../components/OfflineNotice";

// Firebase imports for global notifications
import { auth, firestore } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";


export const NavbarContext = createContext({
  showWcButton: false,
  setShowWcButton: (value: boolean) => {},
});

function useDisableBackButton() {
  useEffect(() => {
    const onBackPress = () => {
      // Return true to prevent the default behavior (exit app or navigate back)
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => subscription.remove();
  }, []);
}


export default function Layout({ children }: { children: React.ReactNode }) {
  const [showWcButton, setShowWcButton] = useState(false);
  const pathname = usePathname();
  const [didForceRTL, setDidForceRTL] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState<boolean | null>(null);
  const { isPlaying, toggleMusic } = useContext(MusicContext);

  useDisableBackButton();

  // subscribe to the Realtime Database “Demo” flag
  useEffect(() => {
    const db = getDatabase();
    const demoRef = ref(db, "demo"); // ← match your exact key
    const unsub = onValue(
      demoRef,
      (snap) => {
        console.log("🔥 demo snapshot:", snap.val());
        setDemoAllowed(!!snap.val());
      },
      (err) => {
        console.error("❌ demo onValue error:", err);
        // if there’s a permissions error, bail out so you don’t spin forever
        setDemoAllowed(false);
      }
    );
    return () => unsub();
  }, []);


  useEffect(() => {
    if (I18nManager.isRTL && !didForceRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
      setDidForceRTL(true);    // mark that we've done it
      Updates.reloadAsync();   // reload once
    }
  }, [didForceRTL]);

  useEffect(() => {
     if (demoAllowed === false && isPlaying) {
       toggleMusic();
     }
  }, [demoAllowed]);

  useEffect(() => {
    // Hide bottom navigation bar
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  // Hide navbar on /profile, /welcome, and /chat pages.
  const hideNavbar =
    pathname === "/profile" || pathname === "/welcome" || pathname === "/chat";

  // Determine if we should wrap in MusicProvider.
  const shouldWrapMusic = pathname !== "/welcome";

  // while we wait on the initial flag…
  if (demoAllowed === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // demo over screen
  if (demoAllowed === false) {
    return (
      <ImageBackground
              source={require("../assets/images/chat-background.png")}
              style={styles.background}
              resizeMode="cover"
            >
              <View style={styles.centered}>
        <Text style={styles.message}>
          Demo trial is over, thanks for participating!
        </Text>
      </View>
            </ImageBackground>
      
    );
  }


    return (
      <InactivityHandler>
        <AuthWrapper>
        <PresenceWrapper>
        {shouldWrapMusic ? (
          <MusicProvider>
            <NotificationProvider>
              
              <FirstTimeProvider>
                <ProfileProvider>
                  <NavbarContext.Provider value={{ showWcButton, setShowWcButton }}>
                    <View style={styles.container}>
                    <NotificationDisplay />
                    <OfflineNotice />
                   
                      {!hideNavbar && <Navbar />}
                      <Stack screenOptions={{ headerShown: false }} />
                          
                      <StatusBar hidden />
                    </View>
                  </NavbarContext.Provider>
                </ProfileProvider>
              </FirstTimeProvider>
            </NotificationProvider>
          </MusicProvider>
        ) : (
          <NotificationProvider>
           
            <FirstTimeProvider>
              <ProfileProvider>
                <NavbarContext.Provider value={{ showWcButton, setShowWcButton }}>
                  <View style={styles.container}>
                  <NotificationDisplay />
                    <OfflineNotice />
                    {!hideNavbar && <Navbar />}
                    <Stack screenOptions={{ headerShown: false }} />
                    <StatusBar hidden />
                  </View>
                </NavbarContext.Provider>
              </ProfileProvider>
            </FirstTimeProvider>
          </NotificationProvider>
        )}
        </PresenceWrapper>
      </AuthWrapper>
      </InactivityHandler>
      
    );
  
}

function NotificationDisplay() {
  const { visible, message, partnerId, senderName, hideNotification } = useContext(NotificationContext);
  //console.log('🔔 NotificationDisplay →', { visible, message, senderName });
  return (
    <InAppNotification
      visible={visible}
      message={message}
      partnerId={partnerId}
      senderName={senderName}
      onDismiss={hideNotification}
    />
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  message: { fontSize: 32, textAlign: "center", padding: 20, color: "white" },
});
