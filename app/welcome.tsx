import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "../types"; // Import the navigation types
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import typography from "@/assets/styles/typography";
import { FirstTimeContext } from "../contexts/FirstTimeContext";

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>(); // Use typed navigation
  const [showSignup, setShowSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showError, setShowError] = useState(false);

  const today = new Date().toLocaleDateString();

  const router = useRouter();

  const handleNavigate = () => {
    // If username is "unknown" (ignoring case) and the checkbox isn't checked, show error.
    if (username.trim().toLowerCase() === "unknown" && !firstTime) {
      setShowError(true);
    } else {
      setShowError(false);
      router.push("/bar"); // Navigate if conditions are met
    }
  };

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  // Use the FirstTimeContext to access and update the global boolean.
  const { firstTime, setFirstTime } = useContext(FirstTimeContext);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/background-curtain.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Image
          source={require("../assets/images/Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {showSignup ? (
          <ImageBackground
            source={require("../assets/images/clipboard.png")}
            style={styles.clipboard}
            resizeMode="contain"
          >
            <View style={styles.signupContainer}>
              {/* Added marginTop to move title and date down */}
              <Text style={[styles.title, { marginTop: 20 }]}>Sign Up Sheet</Text>
              <Text style={[styles.date, { marginTop: 10 }]}>{today}</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username:</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#000"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password:</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#000"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleNavigate}>
                <Text style={styles.buttonText}>GO IN!</Text>
              </TouchableOpacity>

              {/* Error message: only show if conditions are met */}
              {showError && (
                <Text style={styles.errorText}>Never heard of you...</Text>
              )}

              {/* Checkbox and label container */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  onPress={() => setFirstTime(!firstTime)}
                  style={styles.checkbox}
                >
                  {firstTime && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>It's my first time here</Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <TouchableOpacity onPress={() => setShowSignup(true)}>
            <Text style={styles.enterText}>ENTER</Text>
          </TouchableOpacity>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", // Ensures the background image shows through
  },
  logo: {
    width: 400,
    height: 400,
    position: "absolute",
    top: 30, // Adjusts the position of the logo
  },
  enterText: {
    fontSize: 48,
    fontFamily: FontNames.MontserratRegular,
    fontWeight: "700", // Bold
    letterSpacing: 3,
    color: "#8b003e",
    marginTop: 300,
  },
  clipboard: {
    marginTop: 90,
    width: Dimensions.get("window").width * 0.8,
    height: Dimensions.get("window").height * 0.6,
    justifyContent: "center",
    alignItems: "center",
  },
  signupContainer: {
    width: "80%",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: FontNames.MontserratBold,
    fontWeight: "700",
    color: "#000",
    position: "relative",
    top: 10
  },
  date: {
    fontSize: 18,
    fontFamily: FontNames.MontserratExtraLightItalic,
    fontWeight: "600",
    color: "#000",
    marginBottom: 20,
    position: "relative",
    top: 3
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: FontNames.MontserratBlack,
    fontWeight: "600",
    color: "#000",
    width: 100,
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    fontSize: 18,
    padding: 5,
    position: "relative",
    bottom: 10,
    left: 2,
    color: "#000",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    marginTop: 20,
    position: "relative",
    top: 30,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 3,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible", // Allow children to show outside
    position: "relative",
  },
  checkmark: {
    position: "absolute",
    top: -10,    // Shift upward; adjust as needed
    right: -10,  // Shift to the right; adjust as needed
    fontSize: 28,
    width: 25,
    color: "black",
    fontFamily: FontNames.MontserratBlack,
    zIndex: 17,
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: FontNames.MontserratBold,
    fontWeight: "600",
    color: "#000",
    marginLeft: 8,
  },
  button: {
    backgroundColor: "#610e14",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#4a0a0f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 32,
    fontFamily: FontNames.MontserratExtraLight,
    color: "white",
  },
  errorText: {
    marginTop: 10,
    position: "absolute",
    top: 300,
    fontSize: 16,
    color: "red",
    fontFamily: FontNames.MontserratRegular,
  },
});
