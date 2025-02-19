// Navbar.tsx
import React from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Navbar() {

  const router = useRouter();

  const handleNavigate = () => {
    router.push("/profile"); // Ensure your route matches the file name (e.g., "bar.tsx")
  };
  return (
    <View style={styles.navbar}>
      <TouchableOpacity onPress={handleNavigate}>
        <Image
          source={require("../assets/images/icons/WC.png")}
          style={styles.navIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
      
      <View style={styles.navSpacer} />
      <Image
        source={require("../assets/images/icons/speaker-icon.png")}
        style={styles.navIcon}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    width: "100%",
    height: 120,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 30,
    zIndex: 2,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
  navSpacer: {
    flex: 1,
  },
});
