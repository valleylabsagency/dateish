import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { NavbarContext } from "./_layout"; // Adjust path as needed

export default function BarScreen() {
  const messages = [
    "Tap me. If you dare…",
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
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const { setShowNavbar } = useContext(NavbarContext);

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

  // When the last message is finished typing, update context to show the navbar
  useEffect(() => {
    if (currentMessageIndex === messages.length - 1 && !isTyping) {
      setShowNavbar(true);
    }
  }, [currentMessageIndex, isTyping]);

  const handleTap = () => {
    if (!isTyping) {
      if (currentMessageIndex < messages.length - 1) {
        setCurrentMessageIndex(currentMessageIndex + 1);
      }
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/bar-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.container}>
          {/* Render the speech bubble image */}
          <Image
            source={require("../assets/images/speech-bubble.png")}
            style={styles.speech}
            resizeMode="contain"
          />
          {/* Masked text that appears only within the bubble */}
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
        </View>
      </TouchableWithoutFeedback>
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
  // Adjusted the top offset slightly for better alignment
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
    top: -20,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 20,
    // Extra vertical padding to keep the text away from the bubble’s edges
    paddingTop: 40,
    paddingBottom: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
  },
});
