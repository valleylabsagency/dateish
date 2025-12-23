// components/Navbar.tsx
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";

import { NavbarContext } from "../contexts/NavbarContext";
import { MusicContext } from "../contexts/MusicContext";
import { ProfileContext } from "../contexts/ProfileContext";
import animationData from "../assets/videos/mm-dancing.json";

const { width, height } = Dimensions.get("window");

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    (layer: any) => layer.ty !== 1 || layer.nm !== "Dark Blue Solid 1"
  ),
};

type NavbarProps = {
  /** If provided, overrides default push behavior. */
  onBathroomPress?: () => void;

  /** If provided, overrides the default /bathroom path. */
  bathroomRoute?: string;

  /** When true, disables speaker (and any other non-bathroom actions). */
  lockNonBathroom?: boolean;

  /** When true, disables the WC button (greys it out + no-op). */
  bathroomDisabled?: boolean;

  /** If provided, overrides context visibility (rarely needed). */
  showBathroomButton?: boolean;
};

export default function Navbar({
  onBathroomPress,
  bathroomRoute,
  lockNonBathroom = false,
  bathroomDisabled = false,
  showBathroomButton,
}: NavbarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const insetTop = Math.max(6, insets.top * 0.6);

  const { profileComplete } = useContext(ProfileContext);
  const { showWcButton } = useContext(NavbarContext);

  // Visibility: prop override wins, else context controls it.
  const shouldShowWc = typeof showBathroomButton === "boolean" ? showBathroomButton : showWcButton;

  const bathroomPath =
    bathroomRoute ??
    (!profileComplete ? "/bathroom?onboard=true" : "/bathroom");

  const { isPlaying, soundLoading, toggleMusic } = useContext(MusicContext);

  // Speaker lines animation
  const linesAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [linesVisible, setLinesVisible] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      setLinesVisible(true);

      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(linesAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(linesAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      );

      loopRef.current.start();

      const timer = setTimeout(() => {
        loopRef.current?.stop();
        linesAnim.stopAnimation(() => linesAnim.setValue(1.2));
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      loopRef.current?.stop();
      linesAnim.setValue(1);
      setLinesVisible(false);
    }
  }, [isPlaying, linesAnim]);

  const handleWcPress = () => {
    if (bathroomDisabled) return;
    if (onBathroomPress) return onBathroomPress();
    router.push(bathroomPath as any);
  };

  const handleSpeakerPress = () => {
    if (lockNonBathroom) return;
    toggleMusic();
  };

  return (
    <View
      style={[
        styles.navbar,
        {
          paddingTop: insetTop,
          height: (Platform.OS === "ios" ? 85 : 65) + insetTop,
        },
      ]}
    >
      {shouldShowWc ? (
        <TouchableOpacity
          onPress={handleWcPress}
          disabled={bathroomDisabled}
          accessibilityRole="button"
          accessibilityLabel="Open bathroom"
          testID="wc-button"
          style={bathroomDisabled ? styles.disabled : undefined}
        >
          <Image
            source={require("../assets/images/icons/WC.png")}
            style={styles.navIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.navPlaceholder} />
      )}

      <View style={styles.navSpacer} />

      {soundLoading ? (
        <LottieView
          source={withoutBg}
          autoPlay
          loop
          style={{ width: 600, height: 600, backgroundColor: "transparent" }}
        />
      ) : (
        <TouchableOpacity
          onPress={handleSpeakerPress}
          disabled={lockNonBathroom}
          pointerEvents={lockNonBathroom ? "none" : "auto"}
          style={[styles.speakerWrapper, lockNonBathroom ? styles.disabled : undefined]}
          accessibilityRole="button"
          accessibilityLabel="Toggle music"
        >
          <Image
            source={require("../assets/images/icons/speaker-no-lines.png")}
            style={styles.speakerBase}
            resizeMode="contain"
          />
          {linesVisible && (
            <Animated.Image
              source={require("../assets/images/icons/speaker-lines.png")}
              style={[styles.speakerLines, { transform: [{ scale: linesAnim }] }]}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    width: "100%",
    backgroundColor: "#460b2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
  navPlaceholder: {
    width: 50,
    height: 50,
  },
  navSpacer: {
    flex: 1,
  },
  speakerWrapper: {
    width: 50,
    height: 50,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  speakerBase: {
    width: 45,
    height: 45,
    position: "absolute",
  },
  speakerLines: {
    width: 55,
    height: 40,
    position: "absolute",
  },
  disabled: {
    opacity: 0.45,
  },
});
