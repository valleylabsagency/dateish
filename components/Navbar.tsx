// Navbar.tsx
import React, { useContext } from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { NavbarContext } from "../app/_layout";

export default function Navbar() {
  const router = useRouter();
  const { showWcButton } = useContext(NavbarContext);

  return (
    <View style={styles.navbar}>
      {/* Conditionally render the WC button */}
      {showWcButton ? (
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Image
            source={require("../assets/images/icons/WC.png")}
            style={styles.navIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : (
        // If not ready, you can render nothing (or a placeholder if desired)
        <View style={styles.navPlaceholder} />
      )}
      {/* Other navbar items */}
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
  navPlaceholder: {
    width: 50,
    height: 50,
  },
});
