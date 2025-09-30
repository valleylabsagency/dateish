import 'react-native-reanimated';
import React, { useState, createContext, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ImageBackground,
  I18nManager,
  BackHandler,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Stack, usePathname, useLocalSearchParams, Slot } from "expo-router";
import Navbar from "../components/Navbar";
import { NavbarContext } from '../contexts/NavbarContext';
import { MoneysProvider } from "../contexts/MoneysContext";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";
import { MusicProvider, MusicContext } from "@/contexts/MusicContext";
import { NotificationProvider, NotificationContext } from "@/contexts/NotificationContext";
import InactivityHandler from "../components/InactivityHandler";
import PresenceWrapper from "@/contexts/PresenceContext";
import { AuthProvider } from "../contexts/AuthContext";
import ForegroundGate from "../contexts/ForegroundGate";
import * as Updates from "expo-updates";
import { getDatabase, ref, onValue } from "firebase/database";
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import InAppNotification from "../components/InAppNotification";
import OfflineNotice from "../components/OfflineNotice";
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import PushNavBridge from './PushNavBridge';

//import { initAds } from "@/services/ads";


// Firebase imports for global notifications
import { auth, firestore } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

// Prevent native splash from auto-hiding
//SplashScreen.preventAutoHideAsync().catch(() => {});

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
  ),
}

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

function SplashVideo({
    onLoaded,
    onFinish,
  }: {
    onLoaded: () => void;
    onFinish: () => void;
  }) {
  const videoRef = useRef<any>(null);
  const [lastStatus, setLastStatus] = useState<AVPlaybackStatus | null>(null);

  return (
    <Video
      ref={videoRef}
      source={require("../assets/images/splash-screen.mp4")}
      style={StyleSheet.absoluteFill}
      shouldPlay={!(lastStatus && "isLoaded" in lastStatus && lastStatus.isLoaded && "didJustFinish" in lastStatus && lastStatus.didJustFinish)}
      isLooping={false}
      resizeMode={ResizeMode.COVER}
      onPlaybackStatusUpdate={(status) => {
        if ("isLoaded" in status && status.isLoaded) {
          // first time we see loaded -> trigger onLoaded
          if (!(lastStatus && "isLoaded" in lastStatus && lastStatus.isLoaded)) {
            onLoaded();
          }
          if (status.didJustFinish) {
            onFinish();
          }
        }
        setLastStatus(status);
      }}
      onError={() => {
        // If the asset can’t load, skip the splash
        onFinish();
      }}
      // Optional: prevent transport controls from flashing
      useNativeControls={false}
    />
  );
}

/**
 * Wraps children with animated fade-out after splash video and app load
 */
function AnimatedSplashScreen({
  children,
}: {
  children?: React.ReactNode;
}) {
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
  }, [isAppReady, isSplashVideoComplete, animation]);

  const onVideoLoaded = useCallback(async () => {
    try {
      // Only hide native splash if you previously called preventAutoHideAsync
      // It's safe to call hide even if prevent wasn't called, but wrap in try/catch
      await SplashScreen.hideAsync();
    } catch {}
    finally {
      setAppReady(true);
    }
  }, []);

  // Safety: if the video never reports finish (bad asset, codec issue), move on after a timeout
  useEffect(() => {
    const failSafe = setTimeout(() => {
      if (!isSplashVideoComplete) setVideoComplete(true);
    }, 4000);
    return () => clearTimeout(failSafe);
  }, [isSplashVideoComplete]);

  const videoElement = useMemo(
    () => (
      <SplashVideo
        onLoaded={onVideoLoaded}
        onFinish={() => setVideoComplete(true)}
      />
    ),
    [onVideoLoaded]
  );

  return (
    <View style={{ flex: 1 }}>
      {isAppReady && children}
      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="box-only"
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          style={[StyleSheet.absoluteFill, { opacity: animation }]}
        >
          {videoElement}
        </Animated.View>
      )}
    </View>
  );
}


export default function Layout() {
  const [showWcButton, setShowWcButton] = useState(false);
  const pathname = usePathname();
  const { partner } = useLocalSearchParams<{ partner?: string }>();
  const [didForceRTL, setDidForceRTL] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState<boolean | null>(null);

  const music = useContext(MusicContext); // may be undefined

useEffect(() => {
  if (demoAllowed === false && music?.isPlaying) {
    music.toggleMusic();
  }
}, [demoAllowed, music]);

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
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  //useEffect(() => { initAds(); }, []);

  const hideNavbar = [
    "/bathroom",
    "/bar-2",
    "/profile",
    "/settings",
    "/entrance",
    "/welcome",
    "/chat",
    "/entranceAnimation",
  ].includes(pathname);

  const shouldWrapMusic = pathname !== "/entrance";

  if (demoAllowed === null) {
    return (
      <View style={styles.centered}>
        <LottieView
                source={withoutBg}
                autoPlay
                loop
                style={{ width: 600, height: 600, backgroundColor: "transparent" }}
               />
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
    
      <GestureHandlerRootView style={{ flex: 1 }}>
        <InactivityHandler>
          <AuthProvider>
            <PresenceWrapper>
              <MoneysProvider>
                <ForegroundGate>
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
                </ForegroundGate>
              </MoneysProvider>
            </PresenceWrapper>
          </AuthProvider>
        </InactivityHandler>
      </GestureHandlerRootView>

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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "black" },
  message: { fontSize: 32, textAlign: "center", padding: 20, color: "yellow" },
});
