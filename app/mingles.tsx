// mingles.tsx
import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { MaterialIcons } from "@expo/vector-icons";
import { ProfileContext } from "../contexts/ProfileContext";
import { NavbarContext } from "../app/_layout";

const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18;

export default function MinglesScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });
  const { profile, saveProfile } = useContext(ProfileContext);
  const { setShowWcButton } = useContext(NavbarContext);

  useEffect(() => {
    setShowWcButton(true);
  }, [setShowWcButton]);

  // Bubble messages
  const messages = [
    "What would you like to drink?",
    "It's Happy Hour! Everything is half price!",
    "Go talk to some humans!",
  ];
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(messages.length - 1, i + 1));

  // Drink‐menu modal state
  const [showDrinkMenu, setShowDrinkMenu] = useState(false);
  const [drinkLoading, setDrinkLoading] = useState(false);
  const drinkMapping: Record<string, any> = {
    wine: require("../assets/images/icons/wine.png"),
    beer: require("../assets/images/icons/beer.png"),
    whiskey: require("../assets/images/icons/whiskey.png"),
    martini: require("../assets/images/icons/martini.png"),
    vodka: require("../assets/images/icons/vodka.png"),
    tequila: require("../assets/images/icons/tequila.png"),
    absinthe: require("../assets/images/icons/absinthe.png"),
    water: require("../assets/images/icons/water.png"),
  };
  const handleDrinkSelect = async (drinkName: string) => {
    setDrinkLoading(true);
    try {
      await saveProfile({ drink: drinkName });
    } catch (err) {
      console.error(err);
    }
    setDrinkLoading(false);
    setShowDrinkMenu(false);
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* 1) BACKGROUND */}
      <ImageBackground
        source={require("../assets/images/mm-back.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      />

      {/* 2) MR. MINGLES BEHIND THE BAR FRONT */}
      <View style={styles.minglesContainer}>
        <Image
          source={require("../assets/images/mr-mingles.png")}
          style={styles.minglesImage}
          resizeMode="contain"
        />
      </View>

      {/* 3) BAR FRONT OVERLAY */}
      <View style={styles.frontContainer}>
        <Image
          source={require("../assets/images/mm-front.png")}
          style={styles.frontImage}
          resizeMode="contain"
        />
      </View>

      {/* 4) FLIPPED SPEECH BUBBLE */}
      <View style={styles.bubbleContainer}>
        <ImageBackground
          source={require("../assets/images/speech-bubble.png")}
          imageStyle={{ transform: [{ scaleX: -1 }] }}
          style={styles.bubble}
          resizeMode="stretch"
        >
          <TouchableOpacity onPress={prev} disabled={idx === 0} style={styles.arrow}>
            <MaterialIcons
              name="chevron-left"
              size={32}
              color={idx === 0 ? "rgba(255,255,255,0.3)" : "#fff"}
            />
          </TouchableOpacity>

          <View style={styles.bubbleContent}>
            <Text style={styles.bubbleText}>{messages[idx]}</Text>
            {idx === 0 && (
              <TouchableOpacity
                style={styles.tapButton}
          
              >
                <Text style={styles.tapText}>- TAP -</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={next}
            disabled={idx === messages.length - 1}
            style={styles.arrow}
          >
            <MaterialIcons
              name="chevron-right"
              size={32}
              color={idx === messages.length - 1 ? "rgba(255,255,255,0.3)" : "#fff"}
            />
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {/* 5) DRINK MENU MODAL */}
      <Modal visible={showDrinkMenu} transparent animationType="slide">
        <View style={drinkModalStyles.modalOverlay}>
          <View style={drinkModalStyles.modalContainer}>
            <ImageBackground
              source={require("../assets/images/drinks-menu.png")}
              style={drinkModalStyles.menuBackground}
              resizeMode="contain"
            >
              <TouchableOpacity
                style={drinkModalStyles.closeHotspot}
                onPress={() => setShowDrinkMenu(false)}
              />
              {Object.entries(drinkMapping).map(([name]) => (
                <TouchableOpacity
                  key={name}
                  style={drinkModalStyles[name]}
                  onPress={() => handleDrinkSelect(name)}
                >
                  <Image
                    source={require("../assets/images/price-label.png")}
                    style={drinkModalStyles.labelImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
              {drinkLoading && (
                <View style={drinkModalStyles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </ImageBackground>
          </View>
        </View>
      </Modal>

      {/* 6) ADJUSTABLE HOTSPOT (bottom-right) */}
      <TouchableOpacity
        style={styles.overlayTouchable}
        onPress={() => setShowDrinkMenu(true)}
        activeOpacity={0.6}
      />

      {/* 7) BOTTOM NAVBAR */}
      <View style={styles.navbarContainer}>
        <BottomNavbar selectedTab="Mr. Mingles" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundImage: {
    position: "absolute",
    top: -70,
    height: "100%",
  },

  minglesContainer: {
    position: "absolute",
    bottom: height * 0.1,
    right: "8%",
    width: width,
    alignItems: "center",
  },
  minglesImage: {
    width: width * 0.8,
    height: height * 0.8,
  },

  frontContainer: {
    position: "absolute",
    bottom: "0%",
    width: "100%",
    height: "80%",
    alignItems: "center",
  },
  frontImage: {
    width: "100%",
    height: height * 0.70,
  },

  bubbleContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bubble: {
    width: width * 0.9,
    height: BUBBLE_HEIGHT,
    flexDirection: "row",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  arrow: { width: 40, alignItems: "center" },
  bubbleContent: { flex: 1, alignItems: "center" },
  bubbleText: {
    position: "relative",
    bottom: 10,
    fontFamily: FontNames.MontserratRegular,
    fontSize: 20,
    color: "#fff",
    textAlign: "center",
  },
  tapButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    position: "relative",
    bottom: 10,
  },
  tapText: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 18,
  },

  /* ←—— Tweak these to move/resize your hotspot: ——→ */
  overlayTouchable: {
    position: "absolute",
    bottom: "26%",                   // how far from bottom
    right: "27%",                     // how far from right
    width: 70,                     // hotspot width
    height: 30,                 // hotspot height
  },

  navbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});

// === DRINK MODAL STYLES (same as bar.tsx) ===
const drinkModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: { width: "90%", height: "80%", backgroundColor: "transparent" },
  menuBackground: { width: "100%", height: "100%" },
  closeHotspot: { position: "absolute", top: 40, right: 0, width: 80, height: 80 },
  labelImage: { width: 55, height: 55 },
  wine:    { position: "absolute", top: "42%", left: "28%" },
  beer:    { position: "absolute", top: "55%", left: "28%" },
  whiskey: { position: "absolute", top: "67%", left: "28%" },
  martini: { position: "absolute", top: "82%", left: "28%" },
  vodka:   { position: "absolute", top: "42%", left: "75%" },
  tequila: { position: "absolute", top: "55%", left: "75%" },
  absinthe:{ position: "absolute", top: "67%", left: "75%" },
  water:   { position: "absolute", top: "82%", left: "75%" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
