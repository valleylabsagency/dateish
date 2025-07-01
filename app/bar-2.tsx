// stage.tsx
import React from "react";
import { View, Text, ImageBackground, Image, StyleSheet } from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";

export default function Bar2Screen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ImageBackground
      source={require("../assets/images/bar-back.png")}
      style={styles.background}
    >
        <View style={styles.barFrontContainer}>
            <Image style={styles.barFront} 
            source={require("../assets/images/bar-front.png")} 
            resizeMode="contain"
            />
        </View>
      {/* Bottom Navbar */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="bar-2" />
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
  barFrontContainer: {
   position: "absolute",
   bottom: "-5%",
   width: "100%",
   alignItems: "center"
  },

  barFront: {
    height: 730,
    width: "100%",

  }
});
