import "react-native-reanimated";
import React, {
  useState,
  createContext,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  ImageBackground,
  I18nManager,
  BackHandler,
  Animated,
  useWindowDimensions,
} from "react-native";
import {
  usePathname,
  useLocalSearchParams,
  withLayoutContext,
} from "expo-router";
import Navbar from "../components/Navbar";
import { NavbarContext } from "../contexts/NavbarContext";
import { MoneysProvider } from "../contexts/MoneysContext";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";
import { MusicProvider, MusicContext } from "@/contexts/MusicContext";
import {
  NotificationProvider,
  NotificationContext,
} from "@/contexts/NotificationContext";
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
import LottieView from "lottie-react-native";
import animationData from "../assets/videos/mm-dancing.json";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import PushNavBridge from "./PushNavBridge";
import * as SystemUI from "expo-system-ui";

import {
  createStackNavigator,
  CardStyleInterpolators,
} from "@react-navigation/stack";

const BaseStack = createStackNavigator();
const Stack = withLayoutContext(BaseStack.Navigator);

//import { initAds } from "@/services/ads";

// Firebase imports for global notifications
import { auth, firestore } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

// Prevent native splash from auto-hiding
//SplashScreen.preventAutoHideAsync().catch(() => {});

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    (layer) => layer.ty !== 1 || layer.nm !== "Dark Blue Solid 1"
  ),
};

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
      shouldPlay={
        !(
          lastStatus &&
          "isLoaded" in lastStatus &&
          lastStatus.isLoaded &&
          "didJustFinish" in lastStatus &&
          lastStatus.didJustFinish
        )
      }
      isLooping={false}
      resizeMode={ResizeMode.COVER}
      onPlaybackStatusUpdate={(status) => {
        if ("isLoaded" in status && status.isLoaded) {
          if (!(lastStatus && "isLoaded" in lastStatus && lastStatus.isLoaded))
            onLoaded();
          if (status.didJustFinish) onFinish();
        }
        setLastStatus(status);
      }}
      onError={() => {
        // ✅ If Android can't decode the file, complete the splash flow
        onFinish();
      }}
      useNativeControls={false}
    />
  );
}

/**
 * Wraps children with animated fade-out after splash video and app load
 */
function AnimatedSplashScreen({ children }: { children?: React.ReactNode }) {
  const animation = useMemo(() => new Animated.Value(1), []);
  const [isAppReady, setAppReady] = useState(false);
  const [isSplashVideoComplete, setVideoComplete] = useState(false);
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);
  const [minDurationReached, setMinDurationReached] = useState(false);

  // App ready independent of video
  useEffect(() => {
    let raf = requestAnimationFrame(() => setAppReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ✅ Minimum visible time (e.g., 1200 ms) so it doesn’t insta-skip
  useEffect(() => {
    const t = setTimeout(() => setMinDurationReached(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isAppReady && isSplashVideoComplete && minDurationReached) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setAnimationComplete(true));
    }
  }, [isAppReady, isSplashVideoComplete, minDurationReached, animation]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#000");
  }, []);

  const onVideoLoaded = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {}
  }, []);

  // Safety: if the video never reports finish, complete after 4s
  useEffect(() => {
    const t = setTimeout(() => {
      if (!isSplashVideoComplete) setVideoComplete(true);
    }, 6000);
    return () => clearTimeout(t);
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
      {children}
      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="box-only"
          style={[
            StyleSheet.absoluteFill,
            { opacity: animation, backgroundColor: "#000" },
          ]}
        >
          {videoElement}
        </Animated.View>
      )}
    </View>
  );
}

// Stop RTL mirroring globally
try {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  I18nManager.swapLeftAndRightInRTL(false);
} catch {}

// Freeze system font scaling globally (TS-safe casts)
const TextAny = Text as any;
const TextInputAny = TextInput as any;

TextAny.defaultProps = TextAny.defaultProps || {};
TextInputAny.defaultProps = TextInputAny.defaultProps || {};

TextAny.defaultProps.allowFontScaling = false;
TextAny.defaultProps.maxFontSizeMultiplier = 1;

TextInputAny.defaultProps.allowFontScaling = false;
TextInputAny.defaultProps.maxFontSizeMultiplier = 1;

const slideFadeHorizontal = ({ current, next, layouts }: any) => {
  const { width } = layouts.screen;

  // Slide in from right (like forHorizontalIOS)
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  // Incoming screen fades in as it slides in
  const incomingOpacity = current.progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });

  // Outgoing screen fades out as it slides away
  const outgoingOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [1, 1, 0], // stays solid, then fades near the end
      })
    : 1;

  return {
    cardStyle: {
      transform: [{ translateX }],
      // both cards share this interpolator: multiply keeps things smooth
      opacity: Animated.multiply(incomingOpacity, outgoingOpacity),
      backgroundColor: "#000",
    },
  };
};

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
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  //useEffect(() => { initAds(); }, []);

  const hideNavbar = [
    "/bathroom",
    "/profile",
    "/settings",
    "/entrance",
    "/welcome",
    "/chat",
    "/entranceAnimation",
    "/lyd",
    "/darts",
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
        style={[styles.background, { flex: 1 }]}
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
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        <InactivityHandler>
          <AuthProvider>
            <PresenceWrapper>
              <MoneysProvider>
                <ForegroundGate>
                  <MusicProvider>
                    <FirstTimeProvider>
                      <ProfileProvider>
                        <NavbarContext.Provider
                          value={{ showWcButton, setShowWcButton }}
                        >
                          <View style={styles.container}>
                            <NotificationDisplay />
                            <OfflineNotice />
                            {!hideNavbar && <Navbar />}
                            <Stack
                              detachInactiveScreens={false}
                              screenOptions={{
                                headerShown: false,
                                cardStyleInterpolator: slideFadeHorizontal,
                                transitionSpec: {
                                  open: {
                                    animation: "timing",
                                    config: { duration: 600 },
                                  },
                                  close: {
                                    animation: "timing",
                                    config: { duration: 600 },
                                  },
                                },
                                cardStyle: { backgroundColor: "#000" },
                                contentStyle: { backgroundColor: "#000" },
                                gestureEnabled: true,
                              }}
                            />
                            <StatusBar hidden />
                          </View>
                        </NavbarContext.Provider>
                      </ProfileProvider>
                    </FirstTimeProvider>
                  </MusicProvider>
                </ForegroundGate>
              </MoneysProvider>
            </PresenceWrapper>
          </AuthProvider>
        </InactivityHandler>
      </GestureHandlerRootView>
    </AnimatedSplashScreen>
  );
}

function NotificationDisplay() {
  const { visible, message, partnerId, senderName, hideNotification } =
    useContext(NotificationContext);
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
  container: { flex: 1, backgroundColor: "#000" },
  background: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  message: { fontSize: 32, textAlign: "center", padding: 20, color: "yellow" },
});
