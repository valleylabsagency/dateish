// Browse.tsx
import React, { useState } from "react";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import BottomNavbar from "../components/BottomNavbar";

const { width } = Dimensions.get("window");

// Dummy profile data
const profiles = [
  {
    id: 1,
    name: "Alice",
    age: "28",
    location: "New York, USA",
    description: "Loves art, coffee, and long walks in Central Park.",
    image: require("../assets/images/person1.jpg"),
    drink: require("../assets/images/icons/Beer.png"),
  },
  {
    id: 2,
    name: "Bob",
    age: "32",
    location: "San Francisco, USA",
    description:
      "Tech enthusiast, surfer, and foodie who enjoys exploring new places.",
    image: require("../assets/images/person2.jpg"),
    drink: require("../assets/images/icons/Beer.png"),
  },
  {
    id: 3,
    name: "Carmen",
    age: "25",
    location: "Austin, USA",
    description:
      "Musician and creative spirit, always looking for a new adventure.",
    image: require("../assets/images/person3.jpg"),
    drink: require("../assets/images/icons/Beer.png"),
  },
];

export default function BrowseScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentProfile = profiles[currentIndex];
  const router = useRouter();


  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontSerratSemiBold]: require("../assets/fonts/Montserrat-SemiBold.ttf"),
  });

  // Cycle to previous profile; wrap around if needed.
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? profiles.length - 1 : prev - 1));
  };

  // Cycle to next profile; wrap around if needed.
  const handleNext = () => {
    setCurrentIndex((prev) => (prev === profiles.length - 1 ? 0 : prev + 1));
  };

  // Placeholder handler for the CHAT button.
  const handleChat = () => {
    router.push(`/chat?partner=${currentIndex}`);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={styles.background}
    >
      {/* Profile Card Container: positioned near the top and taller */}
      <View style={styles.profileCardContainer}>
        <View style={styles.profileCard}>
          <View style={styles.imageContainer}>
            <Image source={currentProfile.image} style={styles.profileImage} />
            {/* Drink icon overlay */}
            <View style={styles.drinkIconContainer}>
              <Image source={currentProfile.drink} style={styles.drink} />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.nameText}>
              {currentProfile.name}, {currentProfile.age}
            </Text>
            <Text style={styles.locationText}>{currentProfile.location}</Text>
            <Text style={styles.descriptionText}>
              {currentProfile.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom navigation controls for cycling through profiles and CHAT */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={handlePrev}>
          <View style={styles.triangleLeftContainer}>
            <View style={styles.triangleLeftOuter} />
            <View style={styles.triangleLeftInner} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Text style={styles.chatButtonText}>CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext}>
          <View style={styles.triangleRightContainer}>
            <View style={styles.triangleRightOuter} />
            <View style={styles.triangleRightInner} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Navbar */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Browse" />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  profileCardContainer: {
    width: width * 0.9,
    alignSelf: "center",
    marginTop: 30, // starts toward the top of the page
    height: "60%", // profile card is now taller
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    backgroundColor: "rgba(69,26,31,0.8)",
    borderColor: "#371015",
    borderWidth: 8,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    alignItems: "center",
    height: "100%",
  },
  imageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  profileImage: {
    width: 220,
    height: 220,
    borderRadius: "50%",
  },
  drinkIconContainer: {
    position: "absolute",
    bottom: -15,
    right: 0,
    padding: 5,
  },
  drink: {
    width: 40,
    height: 40,
  },
  infoContainer: {
    alignItems: "flex-start",
  },
  nameText: {
    color: "red",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
    fontFamily: FontNames.MontserratRegular
  },
  locationText: {
    color: "orange",
    fontSize: 22,
    marginBottom: 10,
    fontFamily: FontNames.MontserratRegular
  },
  descriptionText: {
    color: "beige",
    fontSize: 23,
    textAlign: "left",
    width: 300,
    fontFamily: FontNames.MontserratRegular
  },
  navigationContainer: {
    position: "absolute",
    bottom: 90, // above the bottom navbar
    backgroundColor: "#4a0a0f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 12,
    paddingBottom: 5,
  },
  // Updated Left arrow triangle (scaled up)
  triangleLeftContainer: {
    width: 0,
    height: 0,
    position: "absolute",
    left: -30,
    top: -45
  },
  triangleLeftOuter: {
    width: 0,
    height: 0,
    borderTopWidth: 48,
    borderBottomWidth: 35,
    borderRightWidth: 69,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#933103",
  },
  triangleLeftInner: {
    position: "absolute",
    left: 9,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 36,
    borderBottomWidth: 26,
    borderRightWidth: 55,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#ffe3d0",
  },
  // Updated Right arrow triangle (scaled up)
  triangleRightContainer: {
    width: 0,
    height: 0,
    marginLeft: 10,
    marginRight: 20,
    position: "absolute",
    top: -45,
    right: 20
  },
  triangleRightOuter: {
    width: 0,
    height: 0,
    borderTopWidth: 48,
    borderBottomWidth: 35,
    borderLeftWidth: 69,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#933103",
  },
  triangleRightInner: {
    position: "absolute",
    right: -60,
    top: 11,
    width: 0,
    height: 0,
    borderTopWidth: 36,
    borderBottomWidth: 26,
    borderLeftWidth: 55,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#ffe3d0",
  },
  chatButton: {
    backgroundColor: "#4a0a0f",
    borderColor: "#933103",
    borderWidth: 8,
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 0,
  },
  chatButtonText: {
    color: "#ffe3d0",
    fontSize: 50,
    fontWeight: "bold",
    fontFamily: FontNames.MontserratRegular,
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});
