// EventsScreen.tsx
import React from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";

// require the background once at module scope
const bgImage = require("../assets/images/events-full.png");
// get its intrinsic dimensions and compute aspect ratio
const { width: imgW, height: imgH } = Image.resolveAssetSource(bgImage);
const ASPECT_RATIO = imgW / imgH;

export default function EventsScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
  });

  const onShare = async () => {
    try {
      const message =
        "Dateish is new—come join me! 🎉\n\nDownload and hop into the bar:";
      const url = "https://dateish.app"; // TODO: replace with your real app store / website link

      // iOS prefers url separately; Android is fine with message containing url
      const content =
        Platform.OS === "ios"
          ? { message, url }
          : { message: `${message}\n${url}` };

      const result = await Share.share(content, {
        dialogTitle: "Share Dateish", // Android only
      });

      // Optional: handle user action
      if (result.action === Share.dismissedAction) {
        // user dismissed
      }
    } catch (e: any) {
      Alert.alert("Share failed", e?.message ?? "Something went wrong.");
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={bgImage}
        style={styles.background}
        resizeMode="contain"
      >
        {/* Centered overlay content */}
        <View style={styles.contentContainer}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Dateish</Text> is new so there aren’t many
            people here yet……
          </Text>
          <Text style={styles.callToAction}>Help us find more people!</Text>

          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Text style={styles.shareButtonText}>Sharing Options</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* Bottom tab bar */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Events" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#000",
  },

  background: {
    width: "100%",
    aspectRatio: ASPECT_RATIO,
  },

  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 90,
  },

  description: {
    fontFamily: FontNames.MontserratRegular,
    fontSize: 24,
    lineHeight: 30,
    color: "white",
    textAlign: "center",
  },
  bold: {
    fontFamily: FontNames.MontserratBold,
    fontWeight: "700",
  },

  callToAction: {
    marginTop: 30,
    marginBottom: 30,
    fontFamily: FontNames.MontserratBold,
    fontSize: 28,
    lineHeight: 36,
    color: "#fde3b6",
    textAlign: "center",
  },

  shareButton: {
    marginTop: 32,
    backgroundColor: "#592540",
    borderColor: "#460b2a",
    borderWidth: 2,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: 300,
  },
  shareButtonText: {
    fontFamily: FontNames.MontserratBold,
    fontSize: 18,
    color: "white",
    textAlign: "center",
  },

  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});
