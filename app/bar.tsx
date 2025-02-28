import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { NavbarContext } from "./_layout";
import { ProfileContext } from "../contexts/ProfileContext";
import BottomNavbar from "../components/BottomNavbar";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { MaterialIcons } from "@expo/vector-icons";

function BarMessages() {
  const messages = [
    "Beep Boop Beep Mothafuckas!",
    "Hello! I’m Mr. Mingles, how you doin?",
    "Welcome to Dateish!",
    "Yes. It’s another dating app.",
    "Kinda…",
    "We're not like other dating apps.",
    "We don't have a fancy algorithm to match you with your \"perfect match\".",
    "Here you have to talk to people to actually know if you're a good match.",
    "Kinda old school… Go to a bar, talk to several people",
    "And if you like someone, ask for their number!",
    "Remember that shit??",
    "Who will you see? Whoever is in the bar right now!",
    "All genders and ages. Like REAL life.",
    "I mean it’s still an app, but that’s the concept.",
    "So first thing - go to the bathroom and make yourself a profile!",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const { setShowWcButton } = useContext(NavbarContext);
  const router = useRouter();

  // Animated value for WC pointer.
  const pointerAnim = useRef(new Animated.Value(0)).current;
  // Separate animated value for speech bubble pointer.
  const speechPointerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    setDisplayedText("");
    setIsTyping(true);
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index > currentMessage.length) {
        clearInterval(interval);
        setIsTyping(false);
      } else {
        setDisplayedText(currentMessage.substring(0, index));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [currentMessageIndex]);

  // When the last message finishes, show the WC button and start WC pointer animation.
  useEffect(() => {
    if (currentMessageIndex === messages.length - 1 && !isTyping) {
      setShowWcButton(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pointerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pointerAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentMessageIndex, isTyping, setShowWcButton, pointerAnim]);

  // When the first message finishes, start the speech bubble pointer animation.
  useEffect(() => {
    if (currentMessageIndex === 0 && !isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(speechPointerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(speechPointerAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentMessageIndex, isTyping, speechPointerAnim]);

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (!isTyping && currentMessageIndex < messages.length - 1) {
          setCurrentMessageIndex(currentMessageIndex + 1);
        }
      }}
    >
      <View style={styles.container}>
        <Image
          source={require("../assets/images/speech-bubble.png")}
          style={styles.speech}
          resizeMode="contain"
        />
        <MaskedView
          style={styles.maskedContainer}
          maskElement={
            <Image
              source={require("../assets/images/speech-bubble.png")}
              style={styles.speech}
              resizeMode="contain"
            />
          }
        >
          <View style={styles.textContainer}>
            <Text style={styles.text}>{displayedText}</Text>
          </View>
        </MaskedView>
        {/* WC Pointer – appears when introduction is complete */}
        {currentMessageIndex === messages.length - 1 && !isTyping && (
          <Animated.View
            style={[
              styles.wcPointer,
              {
                opacity: pointerAnim,
                transform: [
                  {
                    translateY: pointerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialIcons name="pan-tool-alt" size={60} color="#fff" />
          </Animated.View>
        )}
        {/* Speech Pointer – appears when the first message is complete */}
        {currentMessageIndex === 0 && !isTyping && (
          <Animated.View
            style={[
              styles.speechPointer,
              {
                opacity: speechPointerAnim,
                transform: [
                  {
                    translateY: speechPointerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialIcons name="pan-tool-alt" size={60} color="#fff" />
          </Animated.View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

function BarProfileComplete() {
  const [bubbleText, setBubbleText] = useState("What would you like to drink?");
  const [showDrinkMenu, setShowDrinkMenu] = useState(false);
  const { profile, saveProfile } = useContext(ProfileContext);
  const { setShowWcButton } = useContext(NavbarContext);
  const router = useRouter();

  useEffect(() => {
    setShowWcButton(true);
  }, [setShowWcButton]);

  // If the user never selects a drink, default to "water" when the drink menu is closed.
  useEffect(() => {
    if (!showDrinkMenu && !profile.drink) {
      saveProfile({ drink: "water" });
    }
  }, [showDrinkMenu, profile, saveProfile]);

  const handleTapPress = () => {
    setShowDrinkMenu(true);
  };

  const handleDrinkSelect = async (drinkName: string) => {
    try {
      await saveProfile({ drink: drinkName });
      console.log("Drink updated in profile:", drinkName);
    } catch (error) {
      console.error("Failed to update drink in profile:", error);
    }
    setShowDrinkMenu(false);
    setBubbleText("Go talk to some humans!");
  };

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontSerratSemiBold]: require("../assets/fonts/Montserrat-SemiBold.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <TouchableWithoutFeedback>
        <View style={styles.container}>
          <Image
            source={require("../assets/images/speech-bubble.png")}
            style={styles.speech}
            resizeMode="contain"
          />
          <MaskedView
            style={styles.maskedContainer}
            maskElement={
              <Image
                source={require("../assets/images/speech-bubble.png")}
                style={styles.speech}
                resizeMode="contain"
              />
            }
          >
            <View style={styles.textContainer}>
              <Text style={[styles.text, styles.drinkText]}>{bubbleText}</Text>
              {bubbleText === "What would you like to drink?" && (
                <View style={styles.buttonRow}>
                  <TouchableOpacity onPress={handleTapPress}>
                    <Text style={styles.tapText}>TAP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </MaskedView>
        </View>
      </TouchableWithoutFeedback>

      <Modal animationType="slide" transparent={true} visible={showDrinkMenu}>
        <View style={drinkModalStyles.modalOverlay}>
          <View style={drinkModalStyles.modalContainer}>
            <ImageBackground
              source={require("../assets/images/drinks-menu.png")}
              style={drinkModalStyles.menuBackground}
              resizeMode="contain"
            >
              {[
                { name: "wine", style: drinkModalStyles.wine },
                { name: "beer", style: drinkModalStyles.beer },
                { name: "whiskey", style: drinkModalStyles.whiskey },
                { name: "martini", style: drinkModalStyles.martini },
                { name: "vodka", style: drinkModalStyles.vodka },
                { name: "tequila", style: drinkModalStyles.tequila },
                { name: "absinthe", style: drinkModalStyles.absinthe },
                { name: "water", style: drinkModalStyles.water },
              ].map((label, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[drinkModalStyles.labelContainer, label.style]}
                  onPress={() => handleDrinkSelect(label.name)}
                >
                  <Image
                    source={require("../assets/images/price-label.png")}
                    style={drinkModalStyles.labelImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </ImageBackground>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function BarScreen() {
  const { profileComplete } = useContext(ProfileContext);
  return (
    <ImageBackground
      source={require("../assets/images/bar-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      {profileComplete ? <BarProfileComplete /> : <BarMessages />}
      {profileComplete && (
        <View style={styles.bottomNavbarContainer}>
          <BottomNavbar selectedTab="Bar" />
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  speech: {
    width: 400,
    height: 400,
    position: "absolute",
    top: -50,
  },
  maskedContainer: {
    position: "absolute",
    width: 400,
    height: 300,
    top: -10,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 10,
  },
  drinkText: {
    fontFamily: FontNames.MontserratRegular,
    fontSize: 32,
  },
  tapText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: FontNames.MontserratExtraLight,
  },
  logoutText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: FontNames.MontserratBold,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
    marginTop: 10,
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  // Global pointer style for WC button – positioned near where WC button appears.
  wcPointer: {
    position: "absolute",
    top: 2,
    right: 370,
    zIndex: 9999,
  },
  // Pointer for speech bubble – positioned relative to the speech bubble.
  speechPointer: {
    position: "absolute",
    bottom: 470,
    left: 240,
    zIndex: 9999,
  },
});

const drinkModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: "80%",
    backgroundColor: "transparent", // Transparent because we use an ImageBackground
    justifyContent: "center",
    alignItems: "center",
  },
  menuBackground: {
    width: "100%",
    height: "100%",
  },
  labelContainer: {
    position: "absolute",
  },
  wine: { top: 310, left: 110 },
  beer: { top: 400, left: 110 },
  whiskey: { top: 490, left: 110 },
  martini: { top: 590, left: 110 },
  vodka: { top: 310, left: 300 },
  tequila: { top: 400, left: 300 },
  absinthe: { top: 490, left: 300 },
  water: { top: 590, left: 300 },
  labelImage: {
    width: 65,
    height: 65,
  },
  labelText: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 50,
    textAlign: "center",
    fontSize: 10,
    color: "#000",
    fontFamily: FontNames.MontserratBold,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalContainer: {
    width: "90%",
    height: 400,
    backgroundColor: "#020621",
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: "center",
    position: "relative",
    bottom: 140,
  },
  modalText: {
    color: "#eceded",
    fontSize: 32,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "400",
    fontFamily: FontNames.MontserratExtraLight,
  },
  triangleContainer: {
    position: "absolute",
    bottom: -24,
    right: 24,
    width: 0,
    height: 0,
  },
  outerTriangle: {
    width: 5,
    height: 5,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderTopWidth: 24,
    position: "absolute",
    left: -44,
    top: -24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
  innerTriangle: {
    position: "absolute",
    top: -25,
    left: -40,
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderTopWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#020621",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 100,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 48,
    fontFamily: FontNames.MontserratExtraLight,
  },
  mrMingles: {
    width: 350,
    height: 420,
    position: "absolute",
    bottom: -440,
    right: -100,
  },
});
