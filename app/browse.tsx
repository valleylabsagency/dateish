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
import {
  ScaledSheet,
  scale,
  moderateScale,
  verticalScale,
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // This will map each profile's UID to its online status from Realtime Database
  const [onlineStatus, setOnlineStatus] = useState<{ [uid: string]: boolean }>({});
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontSerratSemiBold]: require("../assets/fonts/Montserrat-SemiBold.ttf"),
  });

  // 1. Fetch profiles from Firestore
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const profilesCollection = collection(firestore, "users");
        const querySnapshot = await getDocs(profilesCollection);
        const loadedProfiles = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only add profiles that are not the current user and that have required fields
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

  // 2. Subscribe to each profile's presence status from Realtime Database
  useEffect(() => {
    const db = getDatabase();
    const unsubscribes: (() => void)[] = [];

    // For each profile, subscribe to the realtime database node "status/{uid}"
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

  // 3. Derive an array of online profiles
  const onlineProfiles = profiles.filter(
    (profile) => onlineStatus[profile.id]
  );

  // If fonts aren't loaded or still loading data, show a loading indicator.
  if (!fontsLoaded || loading) {
    return (
      <ImageBackground
        source={require("../assets/images/background-bricks.png")}
        style={styles.loadingContainer}
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

  // For navigation, use the first online profile or allow browsing through them
  // (You could add your own navigation logic here.)
  const currentProfile = onlineProfiles[0];
  const profileDrink =
    typeof currentProfile.drink === "string"
      ? currentProfile.drink.toLowerCase()
      : "water";
  const drinkIcon = drinkMapping[profileDrink] || drinkMapping["water"];
  const isWater = profileDrink === "water";
  const drinkWidth = isWater ? scale(35) : scale(50);
  const drinkHeight = isWater ? scale(75) : scale(70);
  const drinkPosition = isWater ? "60%" : "58%";

  // Drink text mapping remains unchanged.
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

  const handleChat = () => {
    router.push(`/chat?partner=${currentProfile.id}`);
  };

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
              onPress={() => {}}
            >
              <Image
                source={drinkIcon}
                style={{ width: "100%", height: "100%", position: "relative" }}
              />
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

      <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
        <Text style={styles.chatButtonText}>CHAT</Text>
      </TouchableOpacity>

      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Browse" />
      </View>
    </ImageBackground>
  );
}

const styles = ScaledSheet.create({
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
    color: "#fff",
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
  drinkIcon: {
    position: "absolute",
    top: "75%",
  },
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
  chatButton: {
    backgroundColor: "#4a0a0f",
    borderColor: "#933103",
    borderWidth: "8@ms",
    borderRadius: "30@ms",
    paddingHorizontal: "30@ms",
    paddingVertical: 0,
    position: "absolute",
    bottom: "12%",
  },
  chatButtonText: {
    color: "#ffe3d0",
    fontSize: "50@ms",
    fontWeight: "bold",
    fontFamily: FontNames.MontserratRegular,
  },
});

export { BrowseScreen };
