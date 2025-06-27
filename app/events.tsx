// stage.tsx
import React from "react";
import { View, Text, ImageBackground, StyleSheet } from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";

export default function EventsScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ImageBackground
      source={require("../assets/images/events-full.png")}
      style={styles.background}
    >
      {/* Bottom Navbar */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Events" />
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
