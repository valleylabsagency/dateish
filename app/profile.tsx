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
  // Dimensions (removed in favor of size-matters)
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ProfileContext } from "../contexts/ProfileContext";
import ProfileNavbar from "@/components/ProfileNavbar";
import { logout } from "../services/authservice";
import { MusicContext } from "../contexts/MusicContext";

import AsyncStorage from "@react-native-async-storage/async-storage";
// NEW IMPORTS FOR FIREBASE STORAGE
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../firebase";

// 1) Import react-native-size-matters
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

// 2) Define some base font sizes that roughly mirror your old ones.
//    For example, if you want them to feel about the same as your
//    prior "width * 0.045", etc., pick some typical baseline values:
const baseFont = scale(16);    // ~ an old 4-5% of screen width for a typical device
const mediumFont = scale(22);  // ~ an old 6% 
const largeFont = scale(35);   // ~ an old 10% 

export default function ProfileScreen() {
  const { profile, saveProfile, setProfileComplete, profileComplete } = useContext(ProfileContext);
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const from = searchParams.from;

  // Form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const { isPlaying, toggleMusic } = useContext(MusicContext);

  // State to control modal for editing the "about" field
  const [editingAbout, setEditingAbout] = useState(false);
  const [modalTypedText, setModalTypedText] = useState("");
  const fullModalText =
    "Finish your profile you lazy shit!\n\nThen you will be able to see others and use the app...";

  const [modalVisible, setModalVisible] = useState(false);

  // Animated value for Mr. Mingles image
  const rollAnim = useRef(new Animated.Value(500)).current;

  // Pre-populate fields from context
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

  // Animate modal appearance for the Mr. Mingles message
  useEffect(() => {
    Animated.timing(rollAnim, {
      toValue: modalVisible ? 0 : 500,
      duration: modalVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [modalVisible]);

  // Type out the modal text
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
      }, 30);
    }
    return () => {
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [modalVisible]);

  // Launch camera
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
      base64: true, // enable base64 conversion
    });
    if (!result.canceled && result.assets[0].base64) {
      // Create a base64 data URL
      const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoUri(dataUrl);
    }
  };

  // Back button handler: if any field is missing, show the modal
  const handleSubmit = async () => {
    // If any required field is missing, show the modal.
    if (!name || !age || !location || !about || !photoUri) {
      setModalVisible(true);
      setModalTypedText("");
      return; // Prevent navigation if the profile is incomplete.
    }
  
    // Compare the current fields with the original profile.
    const originalProfile = profile || {};
    if (
      name === originalProfile.name &&
      age === originalProfile.age &&
      location === originalProfile.location &&
      about === originalProfile.about &&
      photoUri === originalProfile.photoUri
    ) {
      // No changes made – simply go back.
      router.back();
      return;
    }
  
    // Otherwise, update Firebase with the new profile information.
    setIsSaving(true);
    try {
      await saveProfile({ name, age, location, about, photoUri });
      setProfileComplete(true);
      console.log("Profile saved successfully");
      router.back();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };
  

  // Get location
  const handleRequestLocation = async () => {
    setLocationLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access location was denied.");
      setLocationLoading(false);
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
    } finally {
      setLocationLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    if (isPlaying) {
      toggleMusic();
    }
    try {
      await logout();
      await AsyncStorage.removeItem("userProfile");
      setTimeout(() => {
        router.push("/welcome");
      }, 100)
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Modal overlay for editing "about"
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
            onChangeText={(text) => {
              setAbout(text);
              if (text.length > 50) {
                setDescriptionError("Character limit exceeded!");
              } else {
                setDescriptionError("");
              }
            }}
            placeholder="Short and sweet... 50 characters max"
            placeholderTextColor="#999"
            multiline
            autoFocus
          />
          {descriptionError ? (
            <Text style={editorStyles.errorText}>{descriptionError}</Text>
          ) : null}

          <TouchableOpacity
            style={editorStyles.doneButton}
            onPress={() => {
              if (descriptionError === "") {
                setEditingAbout(false)
              }
             
            }}
          >
            <Text style={editorStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/bathroom-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
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
            {locationLoading ? (
              <ActivityIndicator size="small" color="#000"/>
            ) : (
              <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="#999"
              value={location}
              onChangeText={setLocation}
            />
            )}
            
            <TouchableOpacity style={styles.editButton} onPress={handleRequestLocation}>
              <Text style={styles.editButtonText}>Get Location</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.column, styles.placeholderContainer]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <MaterialIcons name="person" style={styles.personIcon} size={scale(125)} color="grey" />
            )}
            <TouchableOpacity
              style={[styles.editButton, styles.editButtonPhoto]}
              onPress={handleTakePhoto}
            >
              <Text style={styles.editButtonText}>Take a pic</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.column}>
            <TouchableOpacity
                onPress={() => setEditingAbout(true)}
              >
                <Text style={styles.aboutText}>
                  {about ? about : "Write something about yourself..."}
                </Text>
              </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, styles.bottomEdit]}
              onPress={() => setEditingAbout(true)}
            >
              <Text style={styles.editButtonText}>EDIT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mr. Mingles Modal */}
        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <View style={modalStyles.modalOverlay}>
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => setModalVisible(false)}
            >
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

        {isSaving && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size={"large"} color="#fff" />
          </View>
        )}
      </>
    </ImageBackground>
  );
}

// ----- STYLES -----
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  mirrorContainer: {
    // Replacing "top: height * 0.16" with an approximate verticalScale
    position: "absolute",
    top: verticalScale(120), // ~16% of a typical ~750 px tall screen
    // Replacing "height: height * 0.4" with ~300 px
    height: verticalScale(300),
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "center",
    width: "100%",
    textAlign: "center",
  },
  header: {
    fontSize: largeFont,
    fontWeight: "500",
    letterSpacing: 1,
    color: "#908db3",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    fontFamily: FontNames.MontserratRegular,
    paddingBottom: 0,
    marginBottom: 0,
  },
  input: {
    width: "100%",
    // Base text size
    fontSize: scale(18),
    textAlign: "center",
    color: "#908db3",
    fontFamily: FontNames.MontserratBold,
    // Replacing "height * 0.03" with ~ verticalScale(20)
    height: verticalScale(20),
    zIndex: 100000,
    position: "relative",
    lineHeight: scale(18),
    paddingVertical: 0,
    marginVertical: 0,
    includeFontPadding: false,
  },
  locationContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "80%",
    // was marginBottom: height * 0.02. Now let's do ~ verticalScale(20)
    marginBottom: verticalScale(20),
    includeFontPadding: false,
  },
  editButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 20,
    marginTop: verticalScale(5),
    borderWidth: 1,
    borderColor: "black",
    includeFontPadding: false,
  },
  editButtonText: {
    fontSize: scale(9),
    fontWeight: "500",
    color: "black",
    fontFamily: FontNames.MontserratBold,
    includeFontPadding: false,
  },
  column: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  placeholderContainer: {
    width: scale(130),
    height: scale(130),
    borderWidth: scale(2),
    borderColor: "grey",
    borderRadius: scale(80),
    alignItems: "center",
    justifyContent: "center",
    paddingTop: verticalScale(10),
    // marginBottom: height * 0.02 => verticalScale(20)
    marginBottom: verticalScale(20),
  },
  personIcon: {
    // Size is handled in the <MaterialIcons> usage: size={scale(160)}
  },
  photo: {
    position: "relative",
    top: verticalScale(10),
    // Replacing width * 0.45 => just pick scale(200)
    width: scale(140),
    height: scale(140),
    borderRadius: scale(100),
  },
  aboutText: {
    // was baseFont * 0.65 => pick ~ scale(12 or 13)
    fontSize: scale(12),
    color: "gray",
    fontWeight: "400",
    marginTop: verticalScale(25), // ~15% of typical screen
    fontFamily: FontNames.MontSerratSemiBold,
    includeFontPadding: false,
  },
  editButtonPhoto: {
    textAlign: "center",
    position: "relative",
    // was top: 20, or top: 196 in the original code
    top: verticalScale(20),
    padding: 0
  },
  bottomEdit: {
    position: "relative",
    // was left: width * 0.30 => ~ scale(120)
    left: scale(108),
    bottom: scale(0),
    padding: 0
  },
  logoutContainer: {
    position: "absolute",
    // was bottom: 40 => verticalScale(40)
    bottom: verticalScale(40),
    width: "100%",
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#D9534F",
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(50),
    borderRadius: 30,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: scale(16), 
    fontFamily: FontNames.MontserratBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // semi-transparent black overlay
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000, // ensure it sits on top of other elements
  },
});

// ----- EDITOR STYLES -----
const editorStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  editorBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 10,
    padding: scale(20),
    alignItems: "center",
  },
  editorTitle: {
    fontSize: mediumFont,
    fontFamily: FontNames.MontserratBold,
    marginBottom: verticalScale(20),
    color: "#333",
    textAlign: "center",
  },
  editorInput: {
    width: "100%",
    height: verticalScale(100),
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: scale(10),
    fontSize: baseFont,
    fontFamily: FontNames.MontserratRegular,
    color: "#333",
    backgroundColor: "#f9f9f9",
    textAlignVertical: "top",
  },
  errorText: {
    color: "red",
    marginTop: verticalScale(5),
    fontSize: scale(10),
    fontFamily: FontNames.MontserratRegular,
  },
  doneButton: {
    marginTop: verticalScale(20),
    backgroundColor: "#4a0a0f",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: 8,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: baseFont,
    fontFamily: FontNames.MontserratBold,
  },
});

// ----- MODAL STYLES -----
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
    height: verticalScale(400),
    backgroundColor: "#020621",
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 20,
    paddingVertical: verticalScale(20),
    paddingHorizontal: scale(8),
    alignItems: "center",
    position: "relative",
    bottom: verticalScale(140),
  },
  modalText: {
    color: "#eceded",
    fontSize: mediumFont,
    textAlign: "center",
    marginBottom: verticalScale(20),
    fontWeight: "400",
    fontFamily: FontNames.MontserratExtraLight,
  },
  triangleContainer: {
    position: "absolute",
    bottom: verticalScale(-24),
    right: scale(24),
    width: 0,
    height: 0,
  },
  outerTriangle: {
    width: scale(5),
    height: scale(5),
    borderLeftWidth: scale(26),
    borderRightWidth: scale(26),
    borderTopWidth: scale(24),
    position: "absolute",
    left: scale(-44),
    top: scale(-24),
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
  innerTriangle: {
    position: "absolute",
    top: scale(-25),
    left: scale(-40),
    width: 0,
    height: 0,
    borderLeftWidth: scale(22),
    borderRightWidth: scale(22),
    borderTopWidth: scale(22),
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#020621",
  },
  closeButton: {
    position: "absolute",
    top: verticalScale(40),
    right: scale(20),
    zIndex: 100,
    width: "8%",
    height: "5%",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: largeFont,
    fontFamily: FontNames.MontserratExtraLight,
  },
  mrMingles: {
    width: scale(350),
    height: scale(420),
    position: "absolute",
    bottom: scale(-340),
    right: scale(-100),
  },
});
