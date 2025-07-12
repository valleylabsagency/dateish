// app/games.tsx
import React, { useState } from "react";
import {
  View,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import PopUp from "../components/PopUp";

const { width, height } = Dimensions.get("window");

export default function GamesScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });
  const [showPopupDarts, setShowPopupDarts] = useState(false);
  const [showPopupArcade, setShowPopupArcade] = useState(false);

  if (!fontsLoaded) return null;

  return (
    <>
      <ImageBackground
        source={require("../assets/images/games-full.png")}
        style={styles.background}
      >
        {/* Darts hotspot */}
        <TouchableOpacity
          style={styles.overlayTouchableDarts}
          onPress={() => setShowPopupDarts(true)}
          activeOpacity={0.6}
        />

        {/* Arcade hotspot */}
        <TouchableOpacity
          style={styles.overlayTouchableArcade}
          onPress={() => setShowPopupArcade(true)}
          activeOpacity={0.6}
        />

        {/* Bottom Navbar */}
        <View style={styles.bottomNavbarContainer}>
          <BottomNavbar selectedTab="Games" />
        </View>
      </ImageBackground>

      {/* Darts Popup */}
      <PopUp
        visible={showPopupDarts}
        title="Darts"
        onClose={() => setShowPopupDarts(false)}
      />

      {/* Arcade Popup */}
      <PopUp
        visible={showPopupArcade}
        title="Arcade"
        onClose={() => setShowPopupArcade(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  /* tweak these values to position the hitboxes correctly */
  overlayTouchableArcade: {
    position: "absolute",
    bottom: height * 0.15,
    left: width * 0.05,
    width: 200,
    height: 400,
   
  },
  overlayTouchableDarts: {
    position: "absolute",
    bottom: height * 0.4,
    right: width * 0,
    width: 150,
    height: 240,
  },
});
