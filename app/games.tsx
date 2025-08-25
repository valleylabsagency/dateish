// app/games.tsx
import React, { useState, useContext } from "react";
import {
  View,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import PopUp from "../components/PopUp";
import { spendMoneys } from "../services/moneys";          // ⬅️ add
import { MoneysContext } from "../contexts/MoneysContext";  // ⬅️ add

const { width, height } = Dimensions.get("window");

export default function GamesScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  const [showPopupDarts, setShowPopupDarts] = useState(false);
  const [showPopupArcade, setShowPopupArcade] = useState(false);
  const [paying, setPaying] = useState<"darts" | "arcade" | null>(null);

  const { triggerSpend } = useContext(MoneysContext);       // ⬅️ to animate the navbar

  if (!fontsLoaded) return null;

  const handlePlay = async (which: "darts" | "arcade") => {
    if (paying) return; // debounce
    setPaying(which);
    try {
      // Games cost a flat 2 moneys
      await spendMoneys({ amount: 2, reason: `game-${which}` });
      triggerSpend(2); // animate "-2" in the navbar

      // Close the right modal
      if (which === "darts") setShowPopupDarts(false);
      else setShowPopupArcade(false);
    } catch (e: any) {
      // Friendly error for low balance
      if (e?.code === "functions/failed-precondition" || /Insufficient moneys/i.test(e?.message)) {
        Alert.alert("Out of moneys", "You don’t have enough moneys to play. Visit the shop to top up.");
      } else {
        Alert.alert("Error", "Could not start the game. Please try again.");
        console.error("Play failed:", e);
      }
    } finally {
      setPaying(null);
    }
  };

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
      >
        <View style={styles.popupBody}>
          <Text style={styles.popupLine}>Throw some darts! 🎯</Text>
          <Text style={styles.popupSub}>Cost: 2 moneys</Text>
          <TouchableOpacity
            style={[styles.playButton, paying === "darts" && { opacity: 0.6 }]}
            disabled={paying === "darts"}
            onPress={() => handlePlay("darts")}
          >
            <Text style={styles.playButtonText}>
              {paying === "darts" ? "Starting…" : "Play"}
            </Text>
          </TouchableOpacity>
        </View>
      </PopUp>

      {/* Arcade Popup */}
      <PopUp
        visible={showPopupArcade}
        title="Arcade"
        onClose={() => setShowPopupArcade(false)}
      >
        <View style={styles.popupBody}>
          <Text style={styles.popupLine}>Fire up the cabinet! 🕹️</Text>
          <Text style={styles.popupSub}>Cost: 2 moneys</Text>
          <TouchableOpacity
            style={[styles.playButton, paying === "arcade" && { opacity: 0.6 }]}
            disabled={paying === "arcade"}
            onPress={() => handlePlay("arcade")}
          >
            <Text style={styles.playButtonText}>
              {paying === "arcade" ? "Starting…" : "Play"}
            </Text>
          </TouchableOpacity>
        </View>
      </PopUp>
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

  // Popup content
  popupBody: {
    alignItems: "center",
    paddingTop: 8,
  },
  popupLine: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 18,
    marginBottom: 6,
    textAlign: "center",
  },
  popupSub: {
    color: "#d8bfd8",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
    marginBottom: 16,
  },
  playButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 10,
    borderColor: "#460b2a",
    paddingVertical: 8,
    paddingHorizontal: 26,
    borderRadius: 24,
  },
  playButtonText: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 20,
    textTransform: "uppercase",
  },
});
