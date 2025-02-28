import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useRouter } from "expo-router";
import { ProfileContext } from "../contexts/ProfileContext";
import ProfileNavbar from "@/components/ProfileNavbar";
import { logout } from "../services/authservice";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen() {
  const { profile, saveProfile, setProfileComplete, profileComplete } = useContext(ProfileContext);
  const router = useRouter();

  // Form state.
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // State to control modal for editing the "about" field.
  const [editingAbout, setEditingAbout] = useState(false);
  const [modalTypedText, setModalTypedText] = useState("");
  const fullModalText =
    "Finish your profile you lazy shit!\n\nThen you will be able to see others and use the app...";

  // Animated value for Mr. Mingles image.
  const rollAnim = useRef(new Animated.Value(500)).current;

  // Pre-populate fields from context.
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age || "");
      setLocation(profile.location || "");
      setAbout(profile.about || "");
      setPhotoUri(profile.photoUri || null);
    }
  }, [profile]);

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratBlack]: require("../assets/fonts/Montserrat-Black.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"),
    [FontNames.MontSerratSemiBold]: require("../assets/fonts/Montserrat-SemiBold.ttf"),
  });

  // Animate modal appearance for the Mr. Mingles message.
  useEffect(() => {
    Animated.timing(rollAnim, {
      toValue: modalVisible ? 0 : 500,
      duration: modalVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [modalVisible]);

  // (Existing modal for Mr. Mingles introduction)
  const [modalVisible, setModalVisible] = useState(false);
  useEffect(() => {
    let intervalId: number | null = null;
    if (modalVisible) {
      let index = 0;
      intervalId = setInterval(() => {
        index++;
        setModalTypedText(fullModalText.substring(0, index));
        if (index === fullModalText.length) {
          clearInterval(intervalId!);
        }
      }, 50);
    }
    return () => {
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [modalVisible]);

  const handleTakePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Camera permissions are required to take a photo.");
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // Back button handler: if any field is missing, show the modal.
  const handleSubmit = async () => {
    if (!name || !age || !location || !about || !photoUri) {
      setModalVisible(true);
      setModalTypedText("");
      return; // Prevent navigation if the profile is incomplete.
    } else {
      try {
        await saveProfile({ name, age, location, about, photoUri });
        setProfileComplete(true);
        console.log("Profile saved successfully");
        router.push("/bar");
      } catch (error) {
        console.error("Error saving profile:", error);
      }
    }
  };

  const handleRequestLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access location was denied.");
      return;
    }
    try {
      let currentLocation = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync(currentLocation.coords);
      if (geocode.length > 0) {
        const { city, country } = geocode[0];
        const displayCountry = country === "United States" ? "USA" : country;
        setLocation(`${city}, ${displayCountry}`);
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      alert("Unable to retrieve location.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      await AsyncStorage.removeItem("userProfile");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // New modal overlay for editing "about"
  const renderAboutEditor = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={editingAbout}
      onRequestClose={() => setEditingAbout(false)}
    >
      <KeyboardAvoidingView
        style={editorStyles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={editorStyles.editorBox}>
          <Text style={editorStyles.editorTitle}>Write something about yourself</Text>
          <TextInput
            style={editorStyles.editorInput}
            value={about}
            onChangeText={setAbout}
            placeholder="Write something about yourself..."
            placeholderTextColor="#999"
            multiline
            autoFocus
          />
          <TouchableOpacity
            style={editorStyles.doneButton}
            onPress={() => setEditingAbout(false)}
          >
            <Text style={editorStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <ImageBackground
      source={require("../assets/images/bathroom-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      {!fontsLoaded ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <ProfileNavbar onBack={handleSubmit} />
          <View style={styles.mirrorContainer}>
            <Text style={styles.header}>PROFILE</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor="#999"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />
            <View style={styles.locationContainer}>
              <TextInput
                style={[styles.input]}
                placeholder="Location"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
              />
              <TouchableOpacity style={styles.editButton} onPress={handleRequestLocation}>
                <Text style={styles.editButtonText}>Get Location</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.column}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <MaterialIcons name="person" style={styles.personIcon} size={180} color="grey" />
              )}
              <TouchableOpacity
                style={[styles.editButton, styles.editButtonPhoto]}
                onPress={handleTakePhoto}
              >
                <Text style={styles.editButtonText}>Take a pic</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.column}>
              {/* Instead of inline editing, show the about text and a button to edit */}
              <Text style={[styles.aboutText, { flex: 1 }]}>
                {about ? about : "Write something about yourself..."}
              </Text>
              <TouchableOpacity
                style={[styles.editButton, styles.bottomEdit]}
                onPress={() => setEditingAbout(true)}
              >
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Modal animationType="slide" transparent={true} visible={modalVisible}>
            <View style={modalStyles.modalOverlay}>
              <TouchableOpacity style={modalStyles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={modalStyles.closeButtonText}>X</Text>
              </TouchableOpacity>
              <View style={modalStyles.modalContainer}>
                <Text style={modalStyles.modalText}>{modalTypedText}</Text>
                <View style={modalStyles.triangleContainer}>
                  <View style={modalStyles.outerTriangle} />
                  <View style={modalStyles.innerTriangle} />
                </View>
                <Animated.Image
                  source={require("../assets/images/mr-mingles.png")}
                  style={[modalStyles.mrMingles, { transform: [{ translateX: rollAnim }] }]}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Modal>
          {renderAboutEditor()}
          {profileComplete && (
            <View style={styles.logoutContainer}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>LOG OUT</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      {/* End of main content */}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  mirrorContainer: {
    position: "absolute",
    top: 140,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "center",
    width: "80%",
    textAlign: "center",
  },
  header: {
    fontSize: 32,
    fontWeight: "500",
    letterSpacing: 1,
    color: "#908db3",
    marginBottom: 20,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    fontFamily: FontNames.MontSerratSemiBold,
  },
  input: {
    width: "100%",
    fontSize: 21,
    textAlign: "center",
    color: "#908db3",
    fontFamily: FontNames.MontserratBold,
  },
  inputAbout: {
    fontSize: 14,
    color: "gray",
    fontFamily: FontNames.MontSerratSemiBold,
    marginTop: 20,
  },
  locationContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "80%",
    marginBottom: 15,
  },
  editButton: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "black",
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "black",
    fontFamily: FontNames.MontserratBold,
  },
  column: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  personIcon: {
    borderWidth: 2,
    borderColor: "grey",
    borderRadius: 100,
    width: 200,
    height: 200,
    paddingTop: 25,
    textAlign: "center",
  },
  aboutText: {
    fontSize: 14,
    color: "gray",
    fontWeight: "400",
    marginTop: 20,
    fontFamily: FontNames.MontSerratSemiBold,
  },
  editButtonPhoto: {
    position: "absolute",
    left: 200,
    top: 196,
  },
  bottomEdit: {
    position: "relative",
    left: 140,
  },
  logoutContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#D9534F",
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: FontNames.MontserratBold,
  },
});

const editorStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  editorBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  editorTitle: {
    fontSize: 24,
    fontFamily: FontNames.MontserratBold,
    marginBottom: 20,
    color: "#333",
    textAlign: "center"
  },
  editorInput: {
    width: "100%",
    height: 100,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    fontFamily: FontNames.MontserratRegular,
    color: "#333",
    backgroundColor: "#f9f9f9",
    textAlignVertical: "top",
  },
  doneButton: {
    marginTop: 20,
    backgroundColor: "#4a0a0f",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: FontNames.MontserratBold,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalContainer: {
    width: "90%",
    height: 400,
    backgroundColor: "#020621",
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: "center",
    position: "relative",
    bottom: 140,
  },
  modalText: {
    color: "#eceded",
    fontSize: 32,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "400",
    fontFamily: FontNames.MontserratExtraLight,
  },
  triangleContainer: {
    position: "absolute",
    bottom: -24,
    right: 24,
    width: 0,
    height: 0,
  },
  outerTriangle: {
    width: 5,
    height: 5,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderTopWidth: 24,
    position: "absolute",
    left: -44,
    top: -24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
  innerTriangle: {
    position: "absolute",
    top: -25,
    left: -40,
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderTopWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#020621",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 100,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 48,
    fontFamily: FontNames.MontserratExtraLight,
  },
  mrMingles: {
    width: 350,
    height: 420,
    position: "absolute",
    bottom: -440,
    right: -100,
  },
});
