// Bar.tsx
import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Image,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { NavbarContext } from "./_layout";
import { useContext as useReactContext } from "react";
import { ProfileContext } from "../contexts/ProfileContext";
import BottomNavbar from "../components/BottomNavbar";

function BarMessages() {
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

  // Show the top navbar when the last message finishes typing.
  useEffect(() => {
    if (currentMessageIndex === messages.length - 1 && !isTyping) {
      setShowNavbar(true);
    }
  }, [currentMessageIndex, isTyping, setShowNavbar]);

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
      </View>
    </TouchableWithoutFeedback>
  );
}

function BarProfileComplete() {
  const [bubbleText, setBubbleText] = useState("What would you like to drink?");
  const handleBackgroundPress = () => {
    setBubbleText("Go talk to some humans!");
  };
  const handleTapPress = () => {
    console.log("TAP pressed!");
  };

  return (
    <TouchableWithoutFeedback onPress={handleBackgroundPress}>
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
            <Text style={styles.text}>{bubbleText}</Text>
            <TouchableOpacity onPress={handleTapPress} style={styles.tapButton}>
              <Text style={styles.tapText}>TAP</Text>
            </TouchableOpacity>
          </View>
        </MaskedView>
      </View>
    </TouchableWithoutFeedback>
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
    top: -30,
  },
  maskedContainer: {
    position: "absolute",
    width: 400,
    height: 300,
    top: 0,
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
  tapButton: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 5,
  },
  tapText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});
