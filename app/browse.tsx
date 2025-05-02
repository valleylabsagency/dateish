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
  ActivityIndicator,
} from "react-native";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
// Import from react-native-size-matters
import {
  ScaledSheet,
  scale,
  moderateScale,
  verticalScale,
  moderateVerticalScale,
} from "react-native-size-matters";
// Import Realtime Database functions
import { getDatabase, ref, onValue } from "firebase/database";

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

  // This state maps each profile's UID to its realtime online status
  const [onlineStatus, setOnlineStatus] = useState({});

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontSerratSemiBold]: require("../assets/fonts/Montserrat-SemiBold.ttf"),
  });

  // 1. Fetch profiles from Firestore (do not filter by Firestore online field)
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const profilesCollection = collection(firestore, "users");
        const querySnapshot = await getDocs(profilesCollection);
        const loadedProfiles = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only add profiles that are not the current user and have required fields.
          if (
            auth.currentUser &&
            doc.id !== auth.currentUser.uid &&
            data.name &&
            data.age &&
            data.photoUri
          ) {
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

  // 2. For each profile, subscribe to the realtime database node "status/{uid}"
  useEffect(() => {
    const db = getDatabase();
    const unsubscribes = [];
    profiles.forEach((profile) => {
      const statusRef = ref(db, `status/${profile.id}`);
      const unsub = onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        setOnlineStatus((prev) => ({
          ...prev,
          [profile.id]: data?.online ?? false,
        }));
      });
      unsubscribes.push(unsub);
    });
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [profiles]);

  // 3. Derive an array of online profiles from the realtime onlineStatus
  const onlineProfiles = profiles.filter((profile) => onlineStatus[profile.id]);

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (onlineProfiles.length === 0) return 0;
      return prev === 0 ? onlineProfiles.length - 1 : prev - 1;
    });
    setShowDrinkSpeech(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (onlineProfiles.length === 0) return 0;
      return prev === onlineProfiles.length - 1 ? 0 : prev + 1;
    });
    setShowDrinkSpeech(false);
  };

  const truncateDescription = (text: string, limit: number = 35) => {
    if (text && text.length > limit) {
      return text.slice(0, limit) + "...";
    }
    return text;
  };

  const handleChat = () => {
    if (!onlineProfiles[currentIndex]) return;
    router.push(`/chat?partner=${onlineProfiles[currentIndex].id}`);
  };

  if (!fontsLoaded || loading) {
    return (
      <ImageBackground
        source={require("../assets/images/chat-background.png")}
        style={styles.loadingContainer}
        blurRadius={5}
      >
        <ActivityIndicator size="large" color="#fff" />
      </ImageBackground>
    );
  }

  // If there are no online profiles to show.
  if (onlineProfiles.length === 0) {
    return (
      <ImageBackground
        source={require("../assets/images/chat-background.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.noProfilesContainer}>
          <Text style={styles.noProfilesText}>
            No one is here, check back later
          </Text>
        </View>
        <View style={styles.bottomNavbarContainer}>
          <BottomNavbar selectedTab="Browse" />
        </View>
      </ImageBackground>
    );
  }

  // Safely get the current profile from onlineProfiles
  const currentProfile = onlineProfiles[currentIndex] || {};
  const profileDrink =
    typeof currentProfile.drink === "string"
      ? currentProfile.drink.toLowerCase()
      : "water";
  const drinkIcon = drinkMapping[profileDrink] || drinkMapping["water"];
  const isWater = profileDrink === "water";
  const drinkWidth = isWater ? scale(35) : scale(50);
  const drinkHeight = isWater ? scale(75) : scale(70);
  const drinkPosition = isWater ? "60%" : "58%";

  // Drink text mapping
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
  const drinkText = drinkTextMapping[profileDrink] || drinkTextMapping["water"];

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.profileCardContainer}>
        <View style={styles.profileCard}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: currentProfile.photoUri }}
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={[
                styles.drinkIcon,
                {
                  width: drinkWidth,
                  height: drinkHeight,
                  left: drinkPosition,
                },
              ]}
              onPress={() => setShowDrinkSpeech(!showDrinkSpeech)}
            >
              <Image
                source={drinkIcon}
                style={{ width: "100%", height: "100%", position: "relative" }}
              />
              {showDrinkSpeech && (
                <View style={styles.drinkSpeechBubble}>
                  <Text style={styles.drinkSpeechBubbleText}>{drinkText}</Text>
                </View>
              )}
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
              {truncateDescription(currentProfile.about) || "No description provided."}
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={handlePrev} hitSlop={{ top: 10, bottom: 10, left: 35, right: 35 }}>
          <View style={styles.triangleLeftContainer}>
            <View style={styles.triangleLeftOuter} />
            <View style={styles.triangleLeftInner} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Text style={styles.chatButtonText}>CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} hitSlop={{ top: 10, bottom: 10, left: 35, right: 35 }}>
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

const styles = ScaledSheet.create({
  /* ==============================
   * Basic layout
   * ============================== */
  background: {
    flex: 1,
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
    color: "yellow",
    fontFamily: FontNames.MontserratRegular,
    fontSize: "28@ms",
    textAlign: "center",
    marginHorizontal: "40@ms",
  },

  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  /* ==============================
   * Profile Card
   * ============================== */
  profileCardContainer: {
    width: "90%",
    alignSelf: "center",
    marginTop: "30@ms",
    height: "65%",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    backgroundColor: "rgba(69,26,31,0.8)",
    borderColor: "#371015",
    borderWidth: "8@ms",
    borderRadius: "20@ms",
    padding: "20@ms",
    width: "100%",
    alignItems: "center",
    height: "100%",
  },
  imageContainer: {
    position: "relative",
    marginBottom: "20@ms",
  },
  profileImage: {
    width: "220@ms",
    height: "220@ms",
    borderRadius: "110@ms",
  },

  /* ==============================
   * Drink Icon + speech bubble
   * ============================== */
  drinkIcon: {
    position: "absolute",
    top: "75%",
  },
  drinkSpeechBubble: {
    position: "absolute",
    bottom: "110%",
    left: "-20%",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: "5@ms",
    borderRadius: "10@ms",
    width: scale(100),
  },
  drinkSpeechBubbleText: {
    color: "#fff",
    fontSize: "14@ms",
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
  },

  /* ==============================
   * Profile info
   * ============================== */
  infoContainer: {
    width: scale(250),
    alignItems: "flex-start",
  },
  nameText: {
    color: "red",
    fontSize: "32@ms",
    fontWeight: "bold",
    marginBottom: "5@ms",
    fontFamily: FontNames.MontserratRegular,
  },
  locationText: {
    color: "orange",
    fontSize: "22@ms",
    marginBottom: "10@ms",
    fontFamily: FontNames.MontserratRegular,
  },
  descriptionText: {
    color: "beige",
    fontSize: "23@ms",
    textAlign: "left",
    width: "298@ms",
    fontFamily: FontNames.MontserratRegular,
  },

  /* ==============================
   * Navigation Container
   * ============================== */
  navigationContainer: {
    position: "absolute",
    bottom: moderateVerticalScale(81), // approx to replicate "90" from certain screen heights
    backgroundColor: "#4a0a0f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: "13@ms",
    paddingBottom: "8@ms",
    width: "100%",
  },

  /* ==============================
   * Triangles
   * ============================== */
  triangleLeftContainer: {
    width: scale(43),
    height: scale(40),
    position: "absolute",
    // left: -30, top: -45 => percentages
    left: "-100%",
    top: "-56%",
  },
  triangleLeftOuter: {
    width: 0,
    height: 0,
    position: "absolute",
    left: "-60%",
    borderTopWidth: "48@s", // scale(48) since it's a size
    borderBottomWidth: "35@s", // scale(35)
    borderRightWidth: "69@s", // scale(69)
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#933103",
  },
  triangleLeftInner: {
    position: "absolute",
    left: "-38%", // scale(9)
    top: "12@s", // scale(12)
    width: 0,
    height: 0,
    borderTopWidth: "36@s", // scale(36)
    borderBottomWidth: "26@s", // scale(26)
    borderRightWidth: "55@s", // scale(55)
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#ffe3d0",
  },

  triangleRightContainer: {
    width: scale(43),
    height: scale(40),
    // marginLeft:10, marginRight:20 => we can just remove or scale
    position: "absolute",
    top: "-56%",
    right: "15%", 
  },
  triangleRightOuter: {
    width: 0,
    height: 0,
    borderTopWidth: "48@s",
    borderBottomWidth: "35@s",
    borderLeftWidth: "69@s",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#933103",
  },
  triangleRightInner: {
    position: "absolute",
    left: "10%",
    top: "11@s",
    width: 0,
    height: 0,
    borderTopWidth: "36@s",
    borderBottomWidth: "26@s",
    borderLeftWidth: "55@s",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#ffe3d0",
  },

  /* ==============================
   * Chat Button
   * ============================== */
  chatButton: {
    backgroundColor: "#4a0a0f",
    borderColor: "#933103",
    borderWidth: "8@ms",
    borderRadius: "30@ms",
    paddingHorizontal: "30@ms",
    paddingVertical: 0,
    position: "relative",
    bottom: "5%",
  },
  chatButtonText: {
    color: "#ffe3d0",
    fontSize: "50@ms",
    fontWeight: "bold",
    fontFamily: FontNames.MontserratRegular,
  },
});

export { BrowseScreen };
