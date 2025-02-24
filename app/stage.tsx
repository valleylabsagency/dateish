// stage.tsx
import React from "react";
import { View, Text, ImageBackground, StyleSheet } from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";

export default function StageScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ImageBackground
      source={require("../assets/images/stage-background.png")}
      style={styles.background}
    >
      <View style={styles.centerContainer}>
        <Text style={styles.comingSoonText}>Coming Soon...</Text>
      </View>
      {/* Bottom Navbar */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Stage" />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonText: {
    fontFamily: FontNames.MontserratRegular,
    fontSize: 58,
    width: 300,
    textAlign: "center",
    color: "gold",
    textShadowColor: "#000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    position: "relative",
    bottom: 40,
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});
