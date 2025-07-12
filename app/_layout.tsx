import React, { useState, createContext, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ImageBackground,
  ActivityIndicator,
  I18nManager,
  BackHandler,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Stack, usePathname, useLocalSearchParams } from "expo-router";
import Navbar from "../components/Navbar";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";
import { MusicProvider, MusicContext } from "@/contexts/MusicContext";
import { NotificationProvider, NotificationContext } from "@/contexts/NotificationContext";
import InactivityHandler from "../components/InactivityHandler";
import PresenceWrapper from "@/contexts/PresenceContext";
import AuthWrapper from "../contexts/AuthContext";
import * as Updates from "expo-updates";
import { getDatabase, ref, onValue } from "firebase/database";
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import InAppNotification from "../components/InAppNotification";
import OfflineNotice from "../components/OfflineNotice";

// Firebase imports for global notifications
import { auth, firestore } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export const NavbarContext = createContext({
  showWcButton: false,
  setShowWcButton: (value: boolean) => {},
});

function useDisableBackButton() {
  useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, []);
}

/**
 * Renders the splash video and calls onLoaded/onFinish events
 */
function SplashVideo({ onLoaded, onFinish }: { onLoaded: () => void; onFinish: () => void; }) {
  const videoRef = useRef<any>(null);
  const [lastStatus, setLastStatus] = useState<AVPlaybackStatus>({});
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <Video
      ref={videoRef}
      source={
        isTablet
          ? require("../assets/images/splash-screen.mp4")
          : require("../assets/images/splash-screen.mp4")
      }
      style={StyleSheet.absoluteFill}
      shouldPlay={!(lastStatus.isLoaded && lastStatus.didJustFinish)}
      isLooping={false}
      resizeMode={ResizeMode.COVER}
      onPlaybackStatusUpdate={(status) => {
        if (status.isLoaded) {
          if (!lastStatus.isLoaded) {
            onLoaded();
          }
          if (status.didJustFinish) {
            onFinish();
          }
        }
        setLastStatus(status);
      }}
    />
  );
}

/**
 * Wraps children with animated fade-out after splash video and app load
 */
function AnimatedSplashScreen({ children }: { children: React.ReactNode }) {
  const animation = useMemo(() => new Animated.Value(1), []);
  const [isAppReady, setAppReady] = useState(false);
  const [isSplashVideoComplete, setVideoComplete] = useState(false);
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (isAppReady && isSplashVideoComplete) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setAnimationComplete(true));
    }
  }, [isAppReady, isSplashVideoComplete]);

  const onVideoLoaded = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
      // load any resources if needed
    } catch (e) {
      console.warn(e);
    } finally {
      setAppReady(true);
    }
  }, []);

  const videoElement = useMemo(() => (
    <SplashVideo
      onLoaded={onVideoLoaded}
      onFinish={() => setVideoComplete(true)}
    />
  ), [onVideoLoaded]);

  return (
    <View style={{ flex: 1 }}>
      {isAppReady && children}
      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { opacity: animation },
          ]}
        >
          {videoElement}
        </Animated.View>
      )}
    </View>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showWcButton, setShowWcButton] = useState(false);
  const pathname = usePathname();
  const { partner } = useLocalSearchParams<{ partner?: string }>();
  const [didForceRTL, setDidForceRTL] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState<boolean | null>(null);
  const { isPlaying, toggleMusic } = useContext(MusicContext);

  useDisableBackButton();

  // subscribe to the Realtime Database “Demo” flag
  useEffect(() => {
    const db = getDatabase();
    const demoRef = ref(db, "demo");
    const unsub = onValue(
      demoRef,
      (snap) => setDemoAllowed(!!snap.val()),
      () => setDemoAllowed(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (I18nManager.isRTL && !didForceRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
      setDidForceRTL(true);
      Updates.reloadAsync();
    }
  }, [didForceRTL]);

  useEffect(() => {
    if (demoAllowed === false && isPlaying) toggleMusic();
  }, [demoAllowed]);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  const hideNavbar = [
    "/profile",
    "/entrance",
    "/welcome",
    "/chat",
    "/entranceAnimation",
  ].includes(pathname);

  const shouldWrapMusic = pathname !== "/entrance";

  if (demoAllowed === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
    <AnimatedSplashScreen>
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
    </AnimatedSplashScreen>
  );
}

function NotificationDisplay() {
  const { visible, message, partnerId, senderName, hideNotification } = useContext(NotificationContext);
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
  container: { flex: 1 },
  background: { flex: 1, justifyContent: "flex-start", alignItems: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  message: { fontSize: 32, textAlign: "center", padding: 20, color: "yellow" },
});
