// app/settings.tsx
import React, { useState } from "react";
import {
  View,
  ImageBackground,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import PopUp from "../components/PopUp";

const { width, height } = Dimensions.get("window");

const ICONS = [
  {
    key: "contact-us",
    source: require("../assets/images/icons/contact-us.png"),
    position: { top: "24%", left: "50%" },
    wrapperSize: { width: 70, height: 70 },
    iconSize: { width: 150, height: 150 },
  },
  {
    key: "FAQ",
    source: require("../assets/images/icons/FAQ.png"),
    position: { top: "33%", right: "40%" },
    wrapperSize: { width: 60, height: 60 },
    iconSize: { width: 80, height: 80 },
  },
  {
    key: "my-account",
    source: require("../assets/images/icons/my-account.png"),
    position: { top: height * 0.15, left: "30%" },
    wrapperSize: { width: 80, height: 80 },
    iconSize: { width: 150, height: 150 },
  },
  {
    key: "privacy-policy",
    source: require("../assets/images/icons/privacy-policy.png"),
    position: { top: height * 0.35, right: "15%" },
    wrapperSize: { width: 65, height: 65 },
    iconSize: { width: 85, height: 85 },
  },
  {
    key: "terms-conditions",
    source: require("../assets/images/icons/terms-conditions.png"),
    position: { bottom: "50%", left: width * 0.2 },
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

  return (
    <>
      <View style={styles.container}>
        <ImageBackground
          source={require("../assets/images/settings-background.png")}
          style={styles.background}
          resizeMode="cover"
        >
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
});
