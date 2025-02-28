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
import { auth } from "../firebase";
import { MaterialIcons } from "@expo/vector-icons";

/* -------------------------------------------------------------------------- */
/*                         Intro / "No Profile" Screen                         */
/* -------------------------------------------------------------------------- */
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

  // Animations for pointers:
  // - speechPointerAnim for the first message bubble pointer
  // - wcPointerAnim for the final message pointer
  const speechPointerAnim = useRef(new Animated.Value(0)).current;
  const wcPointerAnim = useRef(new Animated.Value(0)).current;

  // We’ll need setShowWcButton to toggle the WC button in the top navbar
  const { setShowWcButton } = useContext(NavbarContext);

  // Type out the current message gradually
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

  // Animate the speech bubble pointer after the first message completes
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

  // When we finish the last message, show the WC button & animate the pointer
  useEffect(() => {
    if (currentMessageIndex === messages.length - 1 && !isTyping) {
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
  }, [currentMessageIndex, isTyping, setShowWcButton, wcPointerAnim]);

  // Move to the next message on tap, if typing is done
  const handleMessagePress = () => {
    if (!isTyping && currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleMessagePress}>
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

        {/* Speech pointer - only for the first message */}
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

        {/* WC pointer - only for the last message */}
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
      </View>
    </TouchableWithoutFeedback>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Main Screen for Completed Profile                     */
/* -------------------------------------------------------------------------- */
function BarProfileComplete() {
  const [bubbleText, setBubbleText] = useState("What would you like to drink?");
  const [showDrinkMenu, setShowDrinkMenu] = useState(false);
  const { profile, saveProfile } = useContext(ProfileContext);
  const { setShowWcButton } = useContext(NavbarContext);

  // Turn on the WC button in the nav only if user’s profile is complete
  useEffect(() => {
    setShowWcButton(true);
  }, [setShowWcButton]);

  // Default to water if user never selects a drink
  useEffect(() => {
    if (!showDrinkMenu && !profile.drink) {
      saveProfile({ drink: "water" });
    }
  }, [showDrinkMenu, profile, saveProfile]);

  const handleTapPress = () => setShowDrinkMenu(true);

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
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fff" />
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

      {/* Drink menu modal */}
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

/* -------------------------------------------------------------------------- */
/*                             Bar Screen Export                               */
/* -------------------------------------------------------------------------- */
export default function BarScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { profile, profileComplete } = useContext(ProfileContext);

  // If no user is logged in, route to the welcome page
  useEffect(() => {
    console.log("Is user logged in?", !!user);
    if (!user) {
      router.push("/welcome");
    }
  }, [user, router]);

  // Show a spinner while checking user or loading the Firestore doc
  if (!user || profile === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // If profileComplete, show BarProfileComplete; else show BarMessages
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

/* -------------------------------------------------------------------------- */
/*                               Stylesheets                                  */
/* -------------------------------------------------------------------------- */
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
  // Pointer for the first message's speech bubble
  speechPointer: {
    position: "absolute",
    bottom: 470,
    left: 240,
    zIndex: 9999,
  },
  // Pointer for the last message's WC indicator
  wcPointer: {
    position: "absolute",
    top: 2,
    right: 370,
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
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  closeHotspot: {
    position: "absolute",
    top: 50,    // Adjust these to match the background image's X location
    right: 0,
    width: 80, // approximate bounding box size around the X
    height: 80,
    // No background or "transparent" if you don't want to cover up the image
     //backgroundColor: "rgba(255,0,0,0.2)", // debug: semitransparent red
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
});
