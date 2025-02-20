// Navbar.tsx
import React from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";

export default function Navbar({ onSubmitForm }: { onSubmitForm?: () => Promise<void> | void }) {

  const router = useRouter();
  const pathName = usePathname();

  const isProfile = pathName === '/profile'

  const handleNavigate = () => {
    router.push("/profile"); // Ensure your route matches the file name (e.g., "bar.tsx")
  };

  const handleBackPress = async () => {
    // Optionally submit the form if provided (for the profile screen).
    if (isProfile && onSubmitForm) {
      await onSubmitForm();
    }
    // Navigate to the bar screen.
    router.push('/bar');
  };

  return (
    <View style={styles.navbar}>
      {isProfile ? (
        <TouchableOpacity onPress={handleBackPress}>
          <Image
            source={require('../assets/images/icons/back-arrow.png')}
            style={styles.navIcon}
            resizeMode="contain"
          />
      </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={handleNavigate}>
        <Image
          source={require("../assets/images/icons/WC.png")}
          style={styles.navIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
      )}
      
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
