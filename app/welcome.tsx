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
import typography from "@/assets/styles/typography";
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
        const user = await login(username, password);
        console.log("Signed in successfully:", username);
        router.push("/bar");
      } else {
        // Create new account.
        const newUser = await signUp(username, password);
        console.log("Account created for:", username);
        router.push("/bar");
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
    [FontNames.MVBoli]: require("../assets/fonts/mvboli.ttf")
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
              <Text style={[styles.title, { marginTop: 20 }]}>Sign Up Sheet</Text>
              <Text style={[styles.date, { marginTop: 10 }]}>{today}</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username:</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  multiline={false} // Disable multiline to prevent auto-expansion
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

              {showError && (
                <Text style={styles.errorText}>
                  Never heard of you...
                </Text>
              )}

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

/* -------------------------------------------------------------------------- */
/*                                  Styles                                    */
/* -------------------------------------------------------------------------- */

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
    backgroundColor: "transparent",
  },
  logo: {
    width: 400,
    height: 400,
    position: "absolute",
    top: 30,
  },
  enterText: {
    fontSize: 48,
    fontFamily: "Montserrat-Regular",
    fontWeight: "700",
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
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#000",
    position: "relative",
    top: 10,
  },
  date: {
    fontSize: 18,
    fontFamily: "Montserrat-ExtraLightItalic",
    fontWeight: "600",
    color: "#000",
    marginBottom: 20,
    position: "relative",
    top: 3,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: "Montserrat-Black",
    fontWeight: "600",
    color: "#000",
    width: 100,
  },
  input: {
    width: "60%",       // Fixed width relative to container
    height: 40,          // Fixed height
    borderBottomWidth: 1,
    borderColor: "#000",
    fontSize: 18,
    fontFamily: FontNames.MVBoli,
    padding: 5,
    marginVertical: 5,
    color: "#000",
    position: "relative",
    bottom: 10,
    overflow: "hidden",  // Hide any overflowing text
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    marginTop: 20,
    position: "relative",
    top: 10,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 3,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    position: "relative",
  },
  checkmark: {
    position: "absolute",
    top: -10,
    right: -10,
    fontSize: 28,
    width: 25,
    color: "black",
    fontFamily: "Montserrat-Black",
    zIndex: 17,
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
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
    fontFamily: "Montserrat-ExtraLight",
    color: "white",
  },
  errorText: {
    marginTop: 10,
    position: "absolute",
    top: 300,
    fontSize: 16,
    color: "red",
    fontFamily: "Montserrat-Regular",
  },
});


