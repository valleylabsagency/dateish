import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { NavbarContext } from "./_layout";
import { ProfileContext } from "../contexts/ProfileContext";
import BottomNavbar from "../components/BottomNavbar";
import { auth } from "../firebase";
import { FontNames } from "../constants/fonts";
import {
  ScaledSheet,
  moderateScale,
  scale,
  verticalScale,
} from "react-native-size-matters";

const { width, height } = Dimensions.get("window");
// Keep the dynamic width approach, but wrap in a scale() call
const BUBBLE_WIDTH = scale(320);

/* -------------------------------------------------------------------------- */
/*                                BarMessages                                 */
/* -------------------------------------------------------------------------- */
function BarMessages() {
  const messages = [
    "Beep Boop Beep Mothafuckas!",
    "Hello! I’m Mr. Mingles, how you doin?",
    "Welcome to Dateish!",
    "Yes. It’s another dating app.",
    "Kinda…",
    "We're not like other dating apps.",
    'We don\'t have a fancy algorithm to match you with your "perfect match".',
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
  const [showMessages, setShowMessages] = useState(false);

  const { setShowWcButton } = useContext(NavbarContext);

  // Hide WC button on mount
  useEffect(() => {
    setShowWcButton(false);
  }, [setShowWcButton]);

  // Delay showing messages a bit
  useEffect(() => {
    const timer = setTimeout(() => setShowMessages(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Animated pointer values
  const speechPointerAnim = useRef(new Animated.Value(0)).current;
  const wcPointerAnim = useRef(new Animated.Value(0)).current;

  // Typewriter effect
  useEffect(() => {
    if (!showMessages) return;
    const current = messages[currentMessageIndex];
    setDisplayedText("");
    setIsTyping(true);

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx > current.length) {
        clearInterval(interval);
        setIsTyping(false);
      } else {
        setDisplayedText(current.substring(0, idx));
      }
    }, 30);

    return () => clearInterval(interval);
  }, [currentMessageIndex, showMessages]);

  // Animate pointer after first message
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
  }, [speechPointerAnim, currentMessageIndex, isTyping, showMessages]);

  // Show WC pointer after the last message
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
  }, [
    showMessages,
    currentMessageIndex,
    isTyping,
    wcPointerAnim,
    setShowWcButton,
    messages.length,
  ]);

  // Press handler for continuing messages
  const handlePress = () => {
    if (!isTyping && currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    }
  };

  if (!showMessages) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.bubbleOuterContainer}>
      {/* The bubble (NOT tappable) */}
      <View style={styles.bubbleContainer}>
        <ImageBackground
          source={require("../assets/images/speech-bubble.png")}
          style={styles.speechBubbleBackground}
          resizeMode="contain"
        >
          <View style={styles.textInsideBubble}>
            <Text style={styles.dialogText}>{displayedText}</Text>
          </View>
        </ImageBackground>
      </View>

      {/* 
        Square area for "Mr. Mingles" bounding box 
        Tapping it continues the messages 
      */}
      <TouchableOpacity style={styles.mrMinglesTouchable} onPress={handlePress}>
        {/* 
          If you later add an actual Mr. Mingles image, 
          put <Image .../> here 
        */}
      </TouchableOpacity>

      {/* Speech pointer for first message */}
      {currentMessageIndex === 0 && !isTyping && (
        <Animated.View
          style={[
            styles.speechPointer,
            {
              opacity: speechPointerAnim,
              transform: [
                {
                  translateX: speechPointerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, moderateScale(-10)],
                  }),
                },
                { rotate: "90deg" },
              ],
            },
          ]}
        >
          <MaterialIcons name="pan-tool-alt" size={moderateScale(50)} color="#fff" />
        </Animated.View>
      )}

      {/* WC pointer for last message */}
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
                    outputRange: [0, moderateScale(-10)],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialIcons name="pan-tool-alt" size={moderateScale(50)} color="#fff" />
        </Animated.View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                          BarProfileComplete                                */
/* -------------------------------------------------------------------------- */
function BarProfileComplete() {
  const [isTapState, setIsTapState] = useState(true);
  const { profile, saveProfile } = useContext(ProfileContext);
  const { setShowWcButton } = useContext(NavbarContext);

  // Decide which text to show
  const bubbleText = isTapState
    ? "What would you like to drink?"
    : "Go talk to some humans!";

  useEffect(() => {
    setShowWcButton(true);
  }, [setShowWcButton]);

  // Default to water if no drink
  useEffect(() => {
    if (!profile.drink) {
      saveProfile({ drink: "water" });
    }
  }, [profile, saveProfile]);

  // When user taps "TAP," show the drink menu
  const [showDrinkMenu, setShowDrinkMenu] = useState(false);
  const handleTapPress = () => setShowDrinkMenu(true);

  // Drink selections
  const handleDrinkSelect = async (drinkName: string) => {
    try {
      await saveProfile({ drink: drinkName });
    } catch (error) {
      console.error("Failed to update drink in profile:", error);
    }
    setShowDrinkMenu(false);
    setIsTapState(false);
  };

  // Toggling bubble text on bubble press
  const toggleBubbleText = () => {
    setIsTapState((prev) => !prev);
  };

  const drinkMapping: { [key: string]: any } = {
    wine: require("../assets/images/icons/wine.png"),
    beer: require("../assets/images/icons/beer.png"),
    whiskey: require("../assets/images/icons/whiskey.png"),
    martini: require("../assets/images/icons/martini.png"),
    vodka: require("../assets/images/icons/vodka.png"),
    tequila: require("../assets/images/icons/tequila.png"),
    absinthe: require("../assets/images/icons/absinthe.png"),
    water: require("../assets/images/icons/water.png"),
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      {/* MAIN BUBBLE */}
      <View style={styles.bubbleOuterContainer}>
        {/* Tap anywhere on the bubble to toggle text */}
        {bubbleText === "What would you like to drink?" ? (
                <TouchableOpacity
                style={styles.bubbleContainer}
                onPress={handleTapPress}
                activeOpacity={1}
              >
                <ImageBackground
                  source={require("../assets/images/speech-bubble.png")}
                  style={styles.speechBubbleBackground}
                  resizeMode="contain"
                >
                  <View style={styles.textInsideBubble}>
                    <Text style={[styles.dialogText, styles.drinkText]}>
                      {bubbleText}
                    </Text>
                   
                      <View style={styles.buttonRow}>
                        <TouchableOpacity onPress={handleTapPress}>
                          <Text style={styles.tapText}>TAP</Text>
                        </TouchableOpacity>
                      </View>
                   
                  </View>
                </ImageBackground>
              </TouchableOpacity>
              ) : (
                <TouchableOpacity
                style={styles.bubbleContainer}
                onPress={toggleBubbleText}
                activeOpacity={1}
              >
                <ImageBackground
                  source={require("../assets/images/speech-bubble.png")}
                  style={styles.speechBubbleBackground}
                  resizeMode="contain"
                >
                  <View style={styles.textInsideBubble}>
                    <Text style={[styles.dialogText, styles.drinkText]}>
                      {bubbleText}
                    </Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
              )}
              {/* Mr. Mingles bounding box for toggling text */}
<TouchableOpacity style={styles.mrMinglesTouchable} onPress={toggleBubbleText}>
  {/* Could add a Mr. Mingles image here if desired */}
</TouchableOpacity>
        {/* If user has a drink, show the icon below the bubble */}
        {profile.drink && (
          <View style={{ marginTop: moderateScale(25) }}>
            <Image
              source={drinkMapping[profile.drink.toLowerCase()]}
              style={styles.drinkIcon}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      {/* DRINK MENU MODAL */}
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
/*                                 BarScreen                                  */
/* -------------------------------------------------------------------------- */
export default function BarScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { profile, profileComplete } = useContext(ProfileContext);

  /*useEffect(() => {
    if (!user) {
      router.push("/welcome");
    }
  }, [user, router]);
*/
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

/* -------------------------------------------------------------------------- */
/*                                 STYLES                                     */
/* -------------------------------------------------------------------------- */
const styles = ScaledSheet.create({
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
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  /* -------------------- Bubble-based layout -------------------- */
  bubbleOuterContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  bubbleContainer: {
    width: BUBBLE_WIDTH,
    aspectRatio: 1,
    marginTop: moderateScale(20),
  },
  speechBubbleBackground: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    position: "relative",
    bottom: moderateScale(49),
  },
  textInsideBubble: {
    backgroundColor: "transparent",
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    alignItems: "center",
    position: "relative",
    bottom: moderateScale(15),
  },
  dialogText: {
    color: "#fff",
    fontSize: moderateScale(26),
    lineHeight: moderateScale(26),
    textAlign: "center",
    fontFamily: FontNames.MontserratRegular,
  },
  drinkText: {
    fontSize: moderateScale(26),
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: moderateScale(15),
  },
  tapText: {
    color: "#fff",
    fontSize: moderateScale(20),
    fontFamily: FontNames.MontserratExtraLight,
  },
  drinkIcon: {
    width: moderateScale(100),
    height: moderateScale(100),
    position: "relative",
    right: "15%",
    bottom: "36%"
  },

  /* 
    Mr. Mingles bounding box for continuing messages 
    (instead of tapping the entire bubble)
  */
  mrMinglesTouchable: {
    position: "absolute",
    top: "30%",
    left: "45%",
    width: "35%",
    height: "25%",
    zIndex: 999,
  },

  // Pointers
  speechPointer: {
    position: "absolute",
    top: "40%",
    right: "55%",
  },
  wcPointer: {
    position: "absolute",
    top: "1%",
    left: "1%",
  },
});

/* ---------------- Drink Modal Styles ---------------- */
const drinkModalStyles = ScaledSheet.create({
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
    top: moderateScale(50),
    right: 0,
    width: moderateScale(80),
    height: moderateScale(80),
  },
  menuBackground: {
    width: "100%",
    height: "100%",
  },
  labelContainer: {
    position: "absolute",
  },
  wine: { top: "41%", left: "28%" },
  beer: { top: "53.5%", left: "28%" },
  whiskey: { top: "66%", left: "28%" },
  martini: { top: "80%", left: "28%" },
  vodka: { top: "41%", left: "75%" },
  tequila: { top: "53.5%", left: "75%" },
  absinthe: { top: "66%", left: "75%" },
  water: { top: "80%", left: "75%" },
  labelImage: {
    width: moderateScale(65),
    height: moderateScale(65),
  },
});
