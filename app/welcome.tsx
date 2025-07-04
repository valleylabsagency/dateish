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
import { NavigationProp } from "../types";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { FirstTimeContext } from "../contexts/FirstTimeContext";
import { signUp, login } from "../services/authservice";

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showSignup, setShowSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString();
  const router = useRouter();

  // Use the FirstTimeContext to access and update the global boolean.
  const { firstTime, setFirstTime } = useContext(FirstTimeContext);

  const handleSignUpOrIn = async () => {
    setLoading(true);
    setShowError(false);

    try {
      if (!firstTime) {
        // Sign in to existing account.
        await login(username, password);
        router.push("/bar-2");
      } else {
        // Create new account.
        await signUp(username, password);
        router.push("/bar-2");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MVBoli]: require("../assets/fonts/mvboli.ttf"),
  });

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
              {/* Title + date */}
              <View style={styles.topSection}>
                <Text style={styles.title}>Sign Up Sheet</Text>
                <Text style={styles.date}>{today}</Text>
              </View>

              {/* Inputs */}
              <View style={styles.inputSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Username:</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    multiline={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password:</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    multiline={false}
                  />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSignUpOrIn}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>GO IN!</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Error between button and checkbox, 
                  but in its own container so it won't push the checkbox. */}
              <View style={styles.errorContainer}>
                {showError && <Text style={styles.errorText}>Never heard of you...</Text>}
              </View>

              {/* Checkbox at bottom */}
              <View style={styles.bottomSection}>
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

/* -------------------------------------------------------------------------- */
/*                                  Styles                                    */
/* -------------------------------------------------------------------------- */
const { width, height } = Dimensions.get("window");

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
  },
  logo: {
    width: width * 2,
    height: width * 0.9,
    position: "absolute",
    top: height * 0.02,
  },
  enterText: {
    fontSize: width * 0.1,
    fontFamily: "Montserrat-Regular",
    fontWeight: "700",
    letterSpacing: 3,
    color: "#8b003e",
    marginTop: height * 0.4,
  },
  // 90% width, 75% height
  clipboard: {
    marginTop: height * 0.1 + 15,
    width: width * 0.9,
    height: height * 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  // Overall container with exact top/bottom padding
  signupContainer: {
    width: 320,
    height: 350,
    paddingTop: 40,   // about 20px from the top
    paddingBottom: 10, // about 10px from the bottom
    alignItems: "center",
  },

  /* ---------- Top Section (title & date) ---------- */
  topSection: {
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 27,
    fontFamily: FontNames.MontserratBold,
    color: "#000",
  },
  date: {
    fontSize: 18,
    fontFamily: FontNames.MontserratExtraLightItalic,
    color: "#000",
    marginTop: 2,
  },

  /* ---------- Middle (inputs) ---------- */
  inputSection: {
    alignItems: "center",
    marginBottom: 10,
    width: 220,

  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%", // fixed width so it doesn't vary between iOS / Android
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: FontNames.MontserratBlack,
    color: "#000",
    minWidth: 75,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    fontSize: 18,
    fontFamily: FontNames.MVBoli,
    padding: 5,
    height: 40,
    includeFontPadding: false,
    textAlignVertical: "bottom",
    color: "#000",
  },
  button: {
    width: 200,
    height: 60,
    backgroundColor: "#610e14",
    borderWidth: 5,
    borderColor: "#4a0a0f",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4a0a0f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 32,
    fontFamily: FontNames.MontserratExtraLight,
    color: "white",
  },

  /* ---------- Error between button and checkbox ---------- */
  errorContainer: {
    height: 25, // fixed height so the text won't push the checkbox
    marginBottom: 10,
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
  },

  /* ---------- Bottom (checkbox) ---------- */
  bottomSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 3,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkmark: {
    fontSize: 20,
    color: "black",
    fontFamily: FontNames.MontserratBlack,
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: FontNames.MontserratBold,
    color: "#000",
  },
});
