// Navbar.tsx

import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { NavbarContext } from "../app/_layout";
import { MusicContext } from "../contexts/MusicContext";

export default function Navbar() {
  const router = useRouter();
  const { showWcButton } = useContext(NavbarContext);

  // Access the music context so we can toggle music or show loading
  const { isPlaying, soundLoading, toggleMusic } = useContext(MusicContext);

  // We'll animate the speaker-lines bigger/smaller for 5s whenever music toggles on
  // but we do NOT hide them in between loops. Instead we let them remain at the last scale value
  const linesAnim = useRef(new Animated.Value(1)).current; 
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // We track whether lines are actually visible on screen at all
  const [linesVisible, setLinesVisible] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      setLinesVisible(true); // ensure lines are on top of the base speaker
      // Start repeating scale 1 -> 1.2 -> 1
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(linesAnim, {
            toValue: 1.2,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(linesAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();

      // Stop the loop after 5s, but keep lines shown at the last scale factor
      const timer = setTimeout(() => {
        // Stop the animation, freeze it at the current scale
        if (loopRef.current) loopRef.current.stop();
        // We can forcibly set linesAnim to e.g. 1.2 or 1 to freeze
        linesAnim.stopAnimation((currentValue) => {
          // e.g. freeze it at whichever scale we ended up at
          // or pick a stable final value
          // linesAnim.setValue(currentValue);
          // We'll just pick 1.2 to keep them slightly bigger
          linesAnim.setValue(1.2);
        });
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // If not playing, hide lines entirely & reset scale
      if (loopRef.current) {
        loopRef.current.stop();
      }
      linesAnim.setValue(1);
      setLinesVisible(false);
    }
  }, [isPlaying]);

  return (
    <View style={styles.navbar}>
      {/* Conditionally render the WC button */}
      {showWcButton ? (
        <TouchableOpacity onPress={() => router.push("/profile")}>
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

      {/* Speaker icon area */}
      {soundLoading ? (
        // If audio is loading, show a spinner
        <ActivityIndicator style={styles.navIcon} color="#fff" />
      ) : (
        <TouchableOpacity onPress={toggleMusic} style={styles.speakerWrapper}>
          {/* speaker-no-lines is always there */}
          <Image
            source={require("../assets/images/icons/speaker-no-lines.png")}
            style={styles.speakerBase}
            resizeMode="contain"
          />
          {linesVisible && (
            <Animated.Image
              source={require("../assets/images/icons/speaker-lines.png")}
              style={[
                styles.speakerLines,
                {
                  transform: [{ scale: linesAnim }],
                },
              ]}
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
    height: 120,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 30,
    zIndex: 2,
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
});
