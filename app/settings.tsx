// app/settings.tsx
import React, { useState, useContext } from "react";
import {
  View,
  ImageBackground,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Text
} from "react-native";
import PopUp from "../components/PopUp";
import ProfileNavbar from "../components/ProfileNavbar";
import { useRouter } from "expo-router";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { MusicContext } from "../contexts/MusicContext";
import { logout } from "../services/authservice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontNames } from "../constants/fonts";

const { width, height } = Dimensions.get("window");

const ICONS = [
  {
    key: "contact-us",
    source: require("../assets/images/icons/contact-us.png"),
    position: { top: "26%", left: "50%" },
    wrapperSize: { width: 70, height: 70 },
    iconSize: { width: 150, height: 150 },
  },
  {
    key: "FAQ",
    source: require("../assets/images/icons/FAQ.png"),
    position: { top: "35%", right: "40%" },
    wrapperSize: { width: 60, height: 60 },
    iconSize: { width: 80, height: 80 },
  },
  {
    key: "my-account",
    source: require("../assets/images/icons/my-account.png"),
    position: { top: height * 0.19, left: "30%" },
    wrapperSize: { width: 80, height: 80 },
    iconSize: { width: 150, height: 150 },
  },
  {
    key: "privacy-policy",
    source: require("../assets/images/icons/privacy-policy.png"),
    position: { top: height * 0.4, right: "15%" },
    wrapperSize: { width: 65, height: 65 },
    iconSize: { width: 85, height: 85 },
  },
  {
    key: "terms-conditions",
    source: require("../assets/images/icons/terms-conditions.png"),
    position: { bottom: "48%", left: width * 0.2 },
    wrapperSize: { width: 75, height: 75 },
    iconSize: { width: 80, height: 80 },
  },
];

// Map flags to human-readable titles
const TITLE_MAP: Record<string, string> = {
  "contact-us": "Contact Us",
  "FAQ": "FAQ",
  "my-account": "My Account",
  "privacy-policy": "Privacy Policy",
  "terms-conditions": "Terms & Conditions",
};

export default function SettingsScreen() {
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupFlag, setPopupFlag] = useState<string | null>(null);
  const { isPlaying, toggleMusic } = useContext(MusicContext);
  const router = useRouter();

   const handleLogout = async () => {
      if (isPlaying) {
        toggleMusic();
      }
      try {
        await logout();
        await AsyncStorage.removeItem("userProfile");
        await AsyncStorage.removeItem("bar2Started");
        setTimeout(() => {
          router.push("/entrance");
        }, 100)
      } catch (error) {
        console.error("Logout error:", error);
      }
    };
  

  return (
    <>
      <View style={styles.container}>
        <ImageBackground
          source={require("../assets/images/settings-background.png")}
          style={styles.background}
          resizeMode="stretch"
          imageStyle={{ transform: [{ translateY: height * 0.03 }] }}
        >
                <ProfileNavbar onBack={() => router.back()} />
          {ICONS.map(({ key, source, position, wrapperSize, iconSize }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.iconWrapper,
                position,
                { width: wrapperSize.width, height: wrapperSize.height },
              ]}
              onPress={() => {
                setPopupFlag(key);
                setPopupVisible(true);
              }}
            >
              <Image
                source={source}
                style={{ width: iconSize.width, height: iconSize.height }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </ImageBackground>
      </View>

      <PopUp
        visible={popupVisible}
        flag={popupFlag || undefined}
        title={popupFlag ? TITLE_MAP[popupFlag] : undefined}
        onClose={() => setPopupVisible(false)}
      />
      <View style={styles.logoutContainer}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutButtonText}>LOG OUT</Text>
                </TouchableOpacity>
              </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  iconWrapper: {
    position: "absolute",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutContainer: {
      position: "absolute",
      // was bottom: 40 => verticalScale(40)
      bottom: verticalScale(60),
      width: "100%",
      alignItems: "center",
    },
    logoutButton: {
      backgroundColor: "#D9534F",
      paddingVertical: verticalScale(15),
      paddingHorizontal: scale(50),
      borderRadius: 30,
      elevation: 5,
    },
    logoutButtonText: {
      color: "#fff",
      fontSize: scale(16), 
      fontFamily: FontNames.MontserratBold,
    },
});
