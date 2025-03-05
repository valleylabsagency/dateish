import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const { width } = Dimensions.get("window");

// Mapping drink names to icons.
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

export default function BrowseScreen() {
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDrinkSpeech, setShowDrinkSpeech] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const profilesCollection = collection(firestore, "users");
        const querySnapshot = await getDocs(profilesCollection);

        const loadedProfiles = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only add profiles that are not the current user and that are online
          if (auth.currentUser && doc.id !== auth.currentUser.uid && data.online) {
            loadedProfiles.push({ id: doc.id, ...data });
          }
        });

        setProfiles(loadedProfiles);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profiles:", error);
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (profiles.length === 0) return 0; // Just a safety check
      return prev === 0 ? profiles.length - 1 : prev - 1;
    });
    setShowDrinkSpeech(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (profiles.length === 0) return 0;
      return prev === profiles.length - 1 ? 0 : prev + 1;
    });
    setShowDrinkSpeech(false);
  };

  const handleChat = () => {
    // If somehow profiles is empty or currentIndex is invalid, just return
    if (!profiles[currentIndex]) return;
    router.push(`/chat?partner=${profiles[currentIndex].id}`);
  };

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontSerratSemiBold]: require("../assets/fonts/Montserrat-SemiBold.ttf"),
  });

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // If there are no profiles to show, display a fallback message and hide nav controls
  if (profiles.length === 0) {
    return (
      <ImageBackground
        source={require("../assets/images/chat-background.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.noProfilesContainer}>
          <Text style={styles.noProfilesText}>No one is here, check back later</Text>
        </View>
        <View style={styles.bottomNavbarContainer}>
          <BottomNavbar selectedTab="Browse" />
        </View>
      </ImageBackground>
    );
  }

  // Safely get the current profile (should not be undefined if profiles.length > 0)
  const currentProfile = profiles[currentIndex] || {};
  // Safely handle the drink, defaulting to "water"
  const profileDrink =
    typeof currentProfile.drink === "string"
      ? currentProfile.drink.toLowerCase()
      : "water";
  const drinkIcon = drinkMapping[profileDrink] || drinkMapping["water"];

  // Map each drink to its corresponding speech bubble text.
  const drinkTextMapping = {
    wine: "Where's the romance at?",
    beer: "Chill night... Sup?",
    whiskey: "I'm an adult.",
    martini: "I'm smart and beautiful!",
    vodka: "Get the party started!",
    tequila: "Gonna get fucked tonight",
    absinthe: "Who are you?",
    water: "I don't need alcohol to have fun",
  };
  const drinkText =
    drinkTextMapping[profileDrink] || drinkTextMapping["water"];

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.profileCardContainer}>
        <View style={styles.profileCard}>
          <View style={styles.imageContainer}>
          <Image source={{ uri: currentProfile.photoUri }} style={styles.profileImage} />
            <TouchableOpacity
              onPress={() => setShowDrinkSpeech(!showDrinkSpeech)}
            >
              <View style={styles.drinkIconContainer}>
                <Image source={drinkIcon} style={styles.drinkIcon} />
                {showDrinkSpeech && (
                  <View style={styles.drinkSpeechBubble}>
                    <Text style={styles.drinkSpeechBubbleText}>
                      {drinkText}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.nameText}>
              {currentProfile.name || "?"}, {currentProfile.age || "??"}
            </Text>
            <Text style={styles.locationText}>
              {currentProfile.location || "No location set"}
            </Text>
            <Text style={styles.descriptionText}>
              {currentProfile.about || "No description provided."}
            </Text>
          </View>
        </View>
      </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noProfilesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noProfilesText: {
    color: "#fff",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 28,
    textAlign: "center",
    marginHorizontal: 40,
  },
  profileCardContainer: {
    width: width * 0.9,
    alignSelf: "center",
    marginTop: 30,
    height: "60%",
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
    borderRadius: 110,
  },
  drinkIconContainer: {
    position: "absolute",
    bottom: -40,
    right: -30,
    padding: 2,
  },
  drinkIcon: {
    width: 67,
    height: 80,
  },
  drinkSpeechBubble: {
    position: "absolute",
    bottom: 70,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 5,
    borderRadius: 10,
  },
  drinkSpeechBubbleText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FontNames.MontserratRegular,
  },
  infoContainer: {
    alignItems: "flex-start",
  },
  nameText: {
    color: "red",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
    fontFamily: FontNames.MontserratRegular,
  },
  locationText: {
    color: "orange",
    fontSize: 22,
    marginBottom: 10,
    fontFamily: FontNames.MontserratRegular,
  },
  descriptionText: {
    color: "beige",
    fontSize: 23,
    textAlign: "left",
    width: 300,
    fontFamily: FontNames.MontserratRegular,
  },
  navigationContainer: {
    position: "absolute",
    bottom: 90,
    backgroundColor: "#4a0a0f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 12,
    paddingBottom: 5,
  },
  triangleLeftContainer: {
    width: 0,
    height: 0,
    position: "absolute",
    left: -30,
    top: -45,
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
  triangleRightContainer: {
    width: 0,
    height: 0,
    marginLeft: 10,
    marginRight: 20,
    position: "absolute",
    top: -45,
    right: 20,
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
