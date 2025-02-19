import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "../types"; // Import the navigation types
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>(); // Use typed navigation
  const [showSignup, setShowSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const today = new Date().toLocaleDateString();

  const router = useRouter();

  const handleNavigate = () => {
    router.push("/bar"); // Ensure your route matches the file name (e.g., "bar.tsx")
  };

  return (
    <ImageBackground
      source={require("../assets/images/background-curtain.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Image source={require("../assets/images/Logo.png")} style={styles.logo} resizeMode="contain" />

        {showSignup ? (
          <ImageBackground
            source={require("../assets/images/clipboard.png")}
            style={styles.clipboard}
            resizeMode="contain"
          >
            <View style={styles.signupContainer}>
              <Text style={styles.title}>Sign Up Sheet</Text>
              <Text style={styles.date}>{today}</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type here..."
                  placeholderTextColor="#000"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type here..."
                  placeholderTextColor="#000"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={styles.checkboxContainer}>
                <Text style={styles.checkboxLabel}>It's my first time here</Text>
              </View>

              {/* Fixed navigation issue here */}
              <TouchableOpacity style={styles.button} onPress={handleNavigate}>
                <Text style={styles.buttonText}>GO IN!</Text>
              </TouchableOpacity>
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

// Styles remain the same...

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
    fontWeight: 300,
    letterSpacing: 5,
    color: "#8b003e",
    marginTop: 300
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
    fontWeight: "bold",
    color: "#000",
  },
  date: {
    fontSize: 18,
    color: "#000",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 18,
    color: "#000",
    fontWeight: "bold",
    width: 100,
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    fontSize: 18,
    padding: 5,
    color: "#000",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#000",
    marginLeft: 8,
  },
  button: {
    backgroundColor: "#610e14",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    shadowColor: "#4a0a0f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
  },
  buttonText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ff33d0",
  },
});

