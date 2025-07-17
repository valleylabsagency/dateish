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
import PopUp from "../components/PopUp";

const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18;

export default function MinglesScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });
  const { profile, saveProfile } = useContext(ProfileContext);
  const { setShowWcButton } = useContext(NavbarContext);

  const [showPopupShop, setShowPopupShop] = useState(false);
  const [showPopupRules, setShowPopupRules] = useState(false);
  const [showPopupTips, setShowPopupTips] = useState(false);
  const [popupFlag, setPopupFlag] = useState<string | null>(null);

  // new state for toggling the drink speech bubble
  const [showDrinkSpeech, setShowDrinkSpeech] = useState(false);

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
  // mr mingles click cycles through messages, wrapping back to 0
  const cycle = () => setIdx(i => (i + 1) % messages.length);

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
      setShowDrinkSpeech(false);
    } catch (err) {
      console.error(err);
    }
    setDrinkLoading(false);
    setShowDrinkMenu(false);
  };

  // derive user's drink icon, size, and bubble text
  const userDrink = (profile?.drink || "water").toLowerCase();
  const drinkIcon = drinkMapping[userDrink];
  const isSmall = ["vodka", "tequila"].includes(userDrink);
  const drinkSize = isSmall ? width * 0.10 : width * 0.15;
  const drinkTextMapping: Record<string, string> = {
    wine: "Where's the romance at?",
    beer: "Chill night... Sup?",
    whiskey: "I'm an adult.",
    martini: "I'm smart and beautiful!",
    vodka: "Get the party started!",
    tequila: "Gonna get fucked tonight",
    absinthe: "Who are you?",
    water: "I don't need alcohol to have fun",
  };
  const drinkText = drinkTextMapping[userDrink];

  if (!fontsLoaded) return null;

  return (
    <>
      <View style={styles.container}>
        {/* 1) BACKGROUND */}
        <ImageBackground
          source={require("../assets/images/mm-back.png")}
          style={styles.background}
          imageStyle={styles.backgroundImage}
        />

        {/* 2) MR. MINGLES – click to cycle messages */}
        <TouchableOpacity
          style={styles.minglesContainer}
          onPress={cycle}
          activeOpacity={0.8}
        >
          <Image
            source={require("../assets/images/mr-mingles.png")}
            style={styles.minglesImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* 3) BAR FRONT OVERLAY */}
        <View style={styles.frontContainer}>
          <Image
            source={require("../assets/images/mm-front.png")}
            style={styles.frontImage}
            resizeMode="contain"
          />
        </View>

        {/* 4) SPEECH BUBBLE */}
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
                <TouchableOpacity style={styles.tapButton}>
                  <Text style={styles.tapText}>- TAP -</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setIdx(i => Math.min(messages.length - 1, i + 1))}
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

        {/* Hotspots */}
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={() => setShowDrinkMenu(true)}
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={styles.overlayTouchableShop}
          onPress={() => {
            setPopupFlag("shop");
            setShowPopupShop(true);
          }}
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={styles.overlayTouchableRules}
          onPress={() => {
            setPopupFlag("rules");
            setShowPopupRules(true);
          }}
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={styles.overlayTouchableTips}
          onPress={() => {
            setPopupFlag("tips");
            setShowPopupTips(true);
          }}
          activeOpacity={0.6}
        />

        {/* 6) USER DRINK ICON + SPEECH – toggle on press, black background */}
        {profile?.drink && (
          <TouchableOpacity
            style={[
              styles.userDrinkIconContainer,
              { top: isSmall ? height * 0.50 : height * 0.47 },
            ]}
            onPress={() => setShowDrinkSpeech(prev => !prev)}
            activeOpacity={0.8}
          >
            {showDrinkSpeech && (
              <View
                style={[
                  styles.drinkSpeechBubble,
                  { bottom: drinkSize + 8 },
                ]}
              >
                <Text style={styles.drinkSpeechBubbleText}>{drinkText}</Text>
              </View>
            )}
            <Image
              source={drinkIcon}
              style={{ width: drinkSize, height: drinkSize }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* 7) BOTTOM NAVBAR */}
        <View style={styles.navbarContainer}>
          <BottomNavbar selectedTab="Mr. Mingles" />
        </View>
      </View>

      <PopUp
        visible={showPopupShop}
        flag={popupFlag || undefined}
        title="Shop"
        onClose={() => setShowPopupShop(false)}
      />

      <PopUp
        visible={showPopupRules}
        flag={popupFlag || undefined}
        title="Bar Rules"
        onClose={() => setShowPopupRules(false)}
      >
        {/* …bar rules content… */}
      </PopUp>

      <PopUp
        visible={showPopupTips}
        flag={popupFlag || undefined}
        title="Tips"
        onClose={() => setShowPopupTips(false)}
      />
    </>
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
    width,
    alignItems: "center",
  },
  minglesImage: {
    width: width * 0.8,
    height: height * 0.8,
  },
  frontContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "80%",
    alignItems: "center",
  },
  frontImage: {
    width: "100%",
    height: height * 0.7,
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
  },
  tapText: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 18,
  },

  overlayTouchable: {
    position: "absolute",
    bottom: "26%",
    right: "27%",
    width: 70,
    height: 30,
  },
  overlayTouchableShop: {
    position: "absolute",
    bottom: "21.5%",
    right: "27%",
    width: 70,
    height: 30,
  },
  overlayTouchableRules: {
    position: "absolute",
    bottom: "17%",
    right: "30%",
    width: 70,
    height: 30,
  },
  overlayTouchableTips: {
    position: "absolute",
    bottom: "42%",
    left: "3%",
    width: 83,
    height: 105,
  },

  userDrinkIconContainer: {
    position: "absolute",
    right: width * 0.31,
    zIndex: 5,
    alignItems: "center",
  },
  drinkSpeechBubble: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: width * 0.4,
    alignItems: "center",
  },
  drinkSpeechBubbleText: {
    color: "#fff",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
    textAlign: "center",
  },

  navbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  // …pop-up styles, rules, etc.
});

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
