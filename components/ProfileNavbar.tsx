import React, { useContext } from "react";
import { View, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { MusicContext } from "../contexts/MusicContext";

interface ProfileNavbarProps {
  onBack: () => void;
}

export default function ProfileNavbar({ onBack }: ProfileNavbarProps) {
  const { toggleMusic, soundLoading } = useContext(MusicContext);

  return (
    <View style={profileNavbarStyles.navbar}>
      <TouchableOpacity onPress={onBack}>
        <Image
          source={require("../assets/images/icons/back-arrow.png")}
          style={profileNavbarStyles.navIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={profileNavbarStyles.navSpacer} />

      <TouchableOpacity onPress={toggleMusic}>
        {soundLoading ? (
          <ActivityIndicator color="#fff" style={{ width: 50, height: 50 }} />
        ) : (
          <Image
            source={require("../assets/images/icons/speaker-icon.png")}
            style={profileNavbarStyles.navIcon}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const profileNavbarStyles = StyleSheet.create({
  navbar: {
    width: "100%",
    height: 120,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 30,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
  navSpacer: {
    flex: 1,
  },
});
