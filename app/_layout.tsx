// app/_layout.tsx
import "react-native-reanimated";
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  I18nManager,
  BackHandler,
  Animated,
  AppState,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";

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
import { NotificationContext } from "@/contexts/NotificationContext";
import InactivityHandler from "../components/InactivityHandler";
import PresenceWrapper from "@/contexts/PresenceContext";
import { AuthProvider } from "../contexts/AuthContext";
import ForegroundGate from "../contexts/ForegroundGate";
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
import * as SystemUI from "expo-system-ui";

import { createStackNavigator } from "@react-navigation/stack";
import closeIcon from "../assets/images/x.png";

const BaseStack = createStackNavigator();
const Stack = withLayoutContext(BaseStack.Navigator);

import { ScaledSheet } from "react-native-size-matters";
import { FontNames } from "@/constants/fonts";
import MMAnimated from "@/services/MMAnimated";

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
        // If Android can't decode the file, complete the splash flow
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

  // Minimum visible time so it doesn’t insta-skip
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

  // Safety: if the video never reports finish, complete after 6s
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

  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  const incomingOpacity = current.progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });

  const outgoingOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [1, 1, 0],
      })
    : 1;

  return {
    cardStyle: {
      transform: [{ translateX }],
      opacity: Animated.multiply(incomingOpacity, outgoingOpacity),
      backgroundColor: "#000",
    },
  };
};

// -------------------- LAST CALL CONFIG --------------------
// 4:30 AM local device time
const LAST_CALL_HOUR = 4;
const LAST_CALL_MINUTE = 30;
const LAST_CALL_STORAGE_KEY = "lastCall_shown_yyyy_mm_dd";

// -------------------- LAST CALL (component + hook) --------------------
type LastCallConfig = {
  enabled: boolean;
  hidden: boolean;
  hour: number;
  minute: number;
  storageKey: string;
};

function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isTargetMinute(d: Date, hour: number, minute: number) {
  return d.getHours() === hour && d.getMinutes() === minute;
}

function msUntilNextTarget(d: Date, hour: number, minute: number) {
  const next = new Date(d);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);
  if (next <= d) next.setDate(next.getDate() + 1);
  return next.getTime() - d.getTime();
}

const DEBUG_FORCE_LASTCALL = false; // <-- set true to force popup immediately for UI testing

function useLastCallTrigger(cfg: LastCallConfig) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    console.log(
      "[LastCall] effect start",
      JSON.stringify({
        enabled: cfg.enabled,
        hidden: cfg.hidden,
        target: `${cfg.hour}:${String(cfg.minute).padStart(2, "0")}`,
        storageKey: cfg.storageKey,
      })
    );

    if (!cfg.enabled) {
      console.log("[LastCall] NOT enabled yet (demoAllowed likely not true)");
      return;
    }

    let timeoutId: any = null;
    let guardId: any = null;

    const checkAndMaybeShow = async (now = new Date(), reason = "check") => {
      const targetStr = `${cfg.hour}:${String(cfg.minute).padStart(2, "0")}`;
      const nowStr = `${now.getHours()}:${String(now.getMinutes()).padStart(
        2,
        "0"
      )}:${String(now.getSeconds()).padStart(2, "0")}`;

      console.log(
        `[LastCall] ${reason}`,
        JSON.stringify({
          now: nowStr,
          target: targetStr,
          enabled: cfg.enabled,
          hidden: cfg.hidden,
          force: DEBUG_FORCE_LASTCALL,
        })
      );

      if (cfg.hidden) {
        console.log("[LastCall] skip: hidden route");
        return;
      }

      const isMatch = isTargetMinute(now, cfg.hour, cfg.minute);

      if (!DEBUG_FORCE_LASTCALL && !isMatch) return;

      console.log(
        "[LastCall] SHOULD SHOW (time match or forced)",
        JSON.stringify({ now: nowStr, target: targetStr })
      );

      const today = yyyymmdd(now);
      const already = await AsyncStorage.getItem(cfg.storageKey);

      console.log(
        "[LastCall] storage check",
        JSON.stringify({ today, already })
      );

      if (!DEBUG_FORCE_LASTCALL && already === today) {
        console.log("[LastCall] skip: already shown today");
        return;
      }

      await AsyncStorage.setItem(cfg.storageKey, today);
      console.log("[LastCall] set visible = true");
      setVisible(true);
    };

    const scheduleNext = () => {
      if (timeoutId) clearTimeout(timeoutId);

      const delay = msUntilNextTarget(new Date(), cfg.hour, cfg.minute);
      console.log("[LastCall] schedule next in ms:", delay);

      timeoutId = setTimeout(async () => {
        await checkAndMaybeShow(new Date(), "timer fired");

        // Guard for ~1 minute to avoid missing due to timer drift
        const start = Date.now();
        guardId = setInterval(async () => {
          await checkAndMaybeShow(new Date(), "guard tick");
          if (Date.now() - start > 65_000) {
            clearInterval(guardId);
            guardId = null;
            console.log("[LastCall] guard done");
          }
        }, 1000);

        scheduleNext();
      }, delay);
    };

    // initial
    checkAndMaybeShow(new Date(), "initial");
    scheduleNext();

    const sub = AppState.addEventListener("change", (state) => {
      console.log("[LastCall] AppState:", state);
      if (state === "active") {
        checkAndMaybeShow(new Date(), "resume");
        scheduleNext();
      }
    });

    return () => {
      console.log("[LastCall] cleanup");
      if (timeoutId) clearTimeout(timeoutId);
      if (guardId) clearInterval(guardId);
      sub.remove();
    };
  }, [cfg.enabled, cfg.hidden, cfg.hour, cfg.minute, cfg.storageKey]);

  return {
    visible,
    dismiss: () => setVisible(false),
  };
}

function LastCallOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <View style={lastCallStyles.mingModalOverlay} pointerEvents="box-none">
        <View style={lastCallStyles.mingModalContainer} pointerEvents="auto">
          <TouchableOpacity
            style={lastCallStyles.mingModalCloseButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image source={closeIcon} style={styles.closeIcon} />
          </TouchableOpacity>

          <Text style={lastCallStyles.mingModalText}>
            {"Last Call!\nWe're closing in 30 minutes."}
          </Text>

          <View style={lastCallStyles.mingTriangleContainer}>
            <View style={lastCallStyles.mingOuterTriangle} />
            <View style={lastCallStyles.mingInnerTriangle} />
          </View>

          <MMAnimated
            showBackground={false}
            showBarFront={false}
            showControls={false}
            enterOnMount
            minglesOffsetY={-10}
          />
        </View>
      </View>
    </View>
  );
}

export default function Layout() {
  const [showWcButton, setShowWcButton] = useState(false);
  const pathname = usePathname();
  useLocalSearchParams<{ partner?: string }>(); // kept to match your existing file shape
  const [demoAllowed, setDemoAllowed] = useState<boolean | null>(null);

  const music = useContext(MusicContext);

  useDisableBackButton();

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontSerratSemiBold]: require("../assets/fonts/Montserrat-SemiBold.ttf"),
  });

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

  useEffect(() => {
    if (demoAllowed === false && music?.isPlaying) {
      music.toggleMusic();
    }
  }, [demoAllowed, music]);

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

  const hideLastCall = ["/entrance", "/entranceAnimation"].includes(pathname);

  // useEffect(() => {
  //   AsyncStorage.removeItem(LAST_CALL_STORAGE_KEY).then(() =>
  //     console.log("[LastCall] cleared storage for testing")
  //   );
  // }, []);

  // MUST be before early returns; safe because it does nothing until enabled=true
  const lastCall = useLastCallTrigger({
    enabled: demoAllowed === true && fontsLoaded,
    hidden: hideLastCall,
    hour: LAST_CALL_HOUR,
    minute: LAST_CALL_MINUTE,
    storageKey: LAST_CALL_STORAGE_KEY,
  });

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

                            <LastCallOverlay
                              visible={!hideLastCall && lastCall.visible}
                              onClose={lastCall.dismiss}
                            />

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

  closeIcon: {
    width: 24,
    height: 24,
    tintColor: "#F5E1C4",
  },
});

const lastCallStyles = ScaledSheet.create({
  mingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 9999,
  },
  mingModalContainer: {
    width: "90%",
    height: "400@vs",
    backgroundColor: "#020621",
    borderWidth: "4@ms",
    borderColor: "#fff",
    borderRadius: "20@ms",
    paddingVertical: "50@ms",
    paddingHorizontal: "8@ms",
    alignItems: "center",
    position: "relative",
    bottom: "18%",
  },
  mingModalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  mingModalCloseButtonText: {
    color: "#fff",
    fontSize: "32@ms",
    fontFamily: FontNames.MontserratExtraLight,
  },
  mingModalText: {
    color: "#eceded",
    fontSize: "32@ms",
    textAlign: "center",
    marginBottom: "20@ms",
    fontWeight: "400",
    fontFamily: FontNames.MontserratExtraLight,
  },
  mingTriangleContainer: {
    position: "absolute",
    bottom: "-24@ms",
    right: "24@ms",
    width: 0,
    height: 0,
  },
  mingOuterTriangle: {
    width: 5,
    height: 5,
    borderLeftWidth: "26@ms",
    borderRightWidth: "26@ms",
    borderTopWidth: "24@ms",
    position: "absolute",
    left: "-44@ms",
    top: "-24@ms",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
  mingInnerTriangle: {
    position: "absolute",
    top: "-25@ms",
    left: "-40@ms",
    width: 0,
    height: 0,
    borderLeftWidth: "22@ms",
    borderRightWidth: "22@ms",
    borderTopWidth: "22@ms",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#020621",
  },
  mingMrMingles: {
    width: "350@ms",
    height: "420@ms",
    position: "absolute",
    bottom: "-95%",
    right: "-20%",
  },
});
