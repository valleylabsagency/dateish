import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { NavbarContext } from "./_layout";
import { ProfileContext } from "../contexts/ProfileContext";
import BottomNavbar from "../components/BottomNavbar";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useRouter } from "expo-router";
import { auth } from "../firebase";
import { MaterialIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Calculate relative dimensions for the speech bubble.
const SPEECH_WIDTH = width * 0.9;
const SPEECH_HEIGHT = SPEECH_WIDTH; // Square speech bubble
const MASKED_HEIGHT = SPEECH_WIDTH * 0.75;

// Define a base width for the design (iOS reference)
const baseWidth = 375;
const scaleFactor = width / baseWidth;

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

  // Hide the WC button on mount.
  useEffect(() => {
    setShowWcButton(false);
  }, [setShowWcButton]);

  // Delay showing messages for 2 seconds.
  const [showMessages, setShowMessages] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowMessages(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Animated values for pointers.
  const speechPointerAnim = useRef(new Animated.Value(0)).current;
  const wcPointerAnim = useRef(new Animated.Value(0)).current;

  // Type out the current message gradually.
  useEffect(() => {
    if (!showMessages) return;
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
  }, [currentMessageIndex, showMessages]);

  // Animate the speech bubble pointer after the first message completes.
  useEffect(() => {
    if (showMessages && currentMessageIndex === 0 && !isTyping) {
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
  }, [currentMessageIndex, isTyping, speechPointerAnim, showMessages]);

  // When the last message finishes, show the WC button & animate the pointer.
  useEffect(() => {
    if (showMessages && currentMessageIndex === messages.length - 1 && !isTyping) {
      setShowWcButton(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(wcPointerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(wcPointerAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentMessageIndex, isTyping, setShowWcButton, wcPointerAnim, showMessages]);

  // Handler to cycle messages when pressing the Mr. Mingles area.
  const handleMessagePress = () => {
    if (!isTyping && currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    }
  };

  if (!showMessages) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/speech-bubble.png")}
        style={[styles.speech, { width: SPEECH_WIDTH, height: SPEECH_HEIGHT }]}
        resizeMode="contain"
      />
      <MaskedView
        style={[styles.maskedContainer, { width: SPEECH_WIDTH, height: MASKED_HEIGHT }]}
        maskElement={
          <Image
            source={require("../assets/images/speech-bubble.png")}
            style={[styles.speech, { width: SPEECH_WIDTH, height: SPEECH_HEIGHT }]}
            resizeMode="contain"
          />
        }
      >
        <View style={styles.textContainer}>
          <Text style={styles.text}>{displayedText}</Text>
        </View>
      </MaskedView>
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
      {currentMessageIndex === messages.length - 1 && !isTyping && (
        <Animated.View
          style={[
            styles.wcPointer,
            {
              opacity: wcPointerAnim,
              transform: [
                {
                  translateY: wcPointerAnim.interpolate({
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
      <TouchableOpacity onPress={handleMessagePress} style={styles.mrMinglesTouchable} />
    </View>
  );
}

function BarProfileComplete() {
  const [isTapState, setIsTapState] = useState(true);
  const { profile, saveProfile } = useContext(ProfileContext);
  const { setShowWcButton } = useContext(NavbarContext);

  const bubbleText = isTapState
    ? "What would you like to drink?"
    : "Go talk to some humans!";

  const drinkMapping = {
    wine: require("../assets/images/icons/wine.png"),
    beer: require("../assets/images/icons/beer.png"),
    whiskey: require("../assets/images/icons/whiskey.png"),
    martini: require("../assets/images/icons/martini.png"),
    vodka: require("../assets/images/icons/vodka.png"),
    tequila: require("../assets/images/icons/tequila.png"),
    absinthe: require("../assets/images/icons/absinthe.png"),
    water: require("../assets/images/icons/water.png"),
  };

  useEffect(() => {
    setShowWcButton(true);
  }, [setShowWcButton]);

  useEffect(() => {
    if (!profile.drink) {
      saveProfile({ drink: "water" });
    }
  }, [profile, saveProfile]);

  const [showDrinkMenu, setShowDrinkMenu] = useState(false);

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
  };

  const toggleBubbleText = () => {
    setIsTapState((prev) => !prev);
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
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Image
          source={require("../assets/images/speech-bubble.png")}
          style={[styles.speech, { width: SPEECH_WIDTH, height: SPEECH_HEIGHT }]}
          resizeMode="contain"
        />
        <MaskedView
          style={[styles.maskedContainer, { width: SPEECH_WIDTH, height: MASKED_HEIGHT }]}
          maskElement={
            <Image
              source={require("../assets/images/speech-bubble.png")}
              style={[styles.speech, { width: SPEECH_WIDTH, height: SPEECH_HEIGHT }]}
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
        {profile.drink && (
          <Image
            source={drinkMapping[profile.drink.toLowerCase()]}
            style={styles.drinkIcon}
            resizeMode="contain"
          />
        )}
      </View>
      <TouchableOpacity onPress={toggleBubbleText} style={styles.mrMinglesTouchable} />
      <Modal animationType="slide" transparent={true} visible={showDrinkMenu}>
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
  const router = useRouter();
  const user = auth.currentUser;
  const { profile, profileComplete } = useContext(ProfileContext);

  useEffect(() => {
    console.log("Is user logged in?", !!user);
    if (!user) {
      router.push("/welcome");
    }
  }, [user, router]);

  if (!user || profile === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  speech: {
    width: SPEECH_WIDTH,
    height: SPEECH_HEIGHT,
    position: "absolute",
    top: -50,
  },
  maskedContainer: {
    position: "relative",
    width: SPEECH_WIDTH,
    height: MASKED_HEIGHT,
    top: Platform.select({ android: -298, ios: -290 }),
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
    zIndex: 1000,
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
  speechPointer: {
    position: "absolute",
    bottom: 470,
    left: 240,
    zIndex: 9999,
  },
  wcPointer: {
    position: "absolute",
    top: 2,
    right: 370,
    zIndex: 9999,
  },
  mrMinglesTouchable: {
    position: "absolute",
    bottom: 380,
    left: 200,
    width: 150,
    height: 200,
    zIndex: 10000,
  },
  drinkIcon: {
    width: 120,
    height: 120,
    position: "absolute",
    top: "48%",
    right: 220,
    alignSelf: "center",
  },
});

// Use the scaleFactor in the drink modal styles so the positions are adjusted relative to the screen width.
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
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  closeHotspot: {
    position: "absolute",
    top: 50,
    right: 0,
    width: 80,
    height: 80,
  },
  menuBackground: {
    width: "100%",
    height: "100%",
  },
  labelContainer: {
    position: "absolute",
  },
  wine: { top: 275 * scaleFactor, left: 100 * scaleFactor },
  beer: { top: 350 * scaleFactor, left: 100 * scaleFactor },
  whiskey: { top: 430 * scaleFactor, left: 100 * scaleFactor },
  martini: { top: 510 * scaleFactor, left: 100 * scaleFactor },
  vodka: { top: 275 * scaleFactor, left: 250 * scaleFactor },
  tequila: { top: 350 * scaleFactor, left: 250 * scaleFactor },
  absinthe: { top: 430 * scaleFactor, left: 250 * scaleFactor },
  water: { top: 510 * scaleFactor, left: 250 * scaleFactor },
  labelImage: {
    width: 65,
    height: 65,
  },
});

export { BarScreen };
