// app/bathroom.tsx
import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
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
import { useRouter, useLocalSearchParams } from "expo-router";
import BottomNavbar from "../components/BottomNavbar";
import ProfileNavbar from "../components/ProfileNavbar";
import { ProfileContext } from "../contexts/ProfileContext";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, storage, firestore } from "../firebase";
import { FontNames } from "../constants/fonts";
import ChitChats, { ChatType, SavedChat } from "./ChitChats";
import closeIcon from '../assets/images/x.png'
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';


// resolve the asset to get its intrinsic size
const bathroomImg = require("../assets/images/bathroom.png");
const { width: imgW, height: imgH } = Image.resolveAssetSource(bathroomImg);
const BG_ASPECT_RATIO = imgW / imgH;

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
  ),
}

export default function BathroomScreen() {
  const router = useRouter();
  const { profile, saveProfile, setProfileComplete, profileComplete } = useContext(ProfileContext);

  // form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [showChitChats, setShowChitChats] = useState(false);
  const [popupFlag, setPopupFlag] = useState<string | null>(null);
  const [mustAnswer, setMustAnswer] = useState(false)

  // editing-about modal
  const [editingAbout, setEditingAbout] = useState(false);
  const [modalTypedText, setModalTypedText] = useState("");
  const fullModalText =
    "Finish your profile you lazy shit!\n\nThen you will be able to see others and use the app...";

  // Mr. Mingles warning modal
  const [modalVisible, setModalVisible] = useState(false);
  const rollAnim = useRef(new Animated.Value(500)).current;
  const [chats, setChats] = useState<SavedChat[]>([])


  const userDocRef = auth.currentUser
  ? doc(firestore, 'users', auth.currentUser.uid)
  : null

  useEffect(() => {
    if (!userDocRef) return
  
    // subscribe to changes in the user document
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (!docSnap.exists()) return
  
      const data = docSnap.data()
      // hydrate your chats array
      if (Array.isArray(data.chitchats)) {
        setChats(data.chitchats as SavedChat[])
      }
      // hydrate the toggle
      if (typeof data.chitchatsRequired === 'boolean') {
        setMustAnswer(data.chitchatsRequired)
      }
    })
  
    // clean up listener on unmount
    return () => unsubscribe()
  }, [userDocRef])


  async function handleSave(type: ChatType, content: string) {
    const newChats = [...chats, { type, content }]
    setChats(newChats)
  
    if (userDocRef) {
      try {
        await updateDoc(userDocRef, { chitchats: newChats })
      } catch (e) {
        console.error('Failed to save chitchats:', e)
      }
    }
  
    setShowChitChats(false)
  }
  
  async function handleDelete(idx: number) {
    const newChats = chats.filter((_, i) => i !== idx)
    setChats(newChats)
  
    if (userDocRef) {
      try {
        await updateDoc(userDocRef, { chitchats: newChats })
      } catch (e) {
        console.error('Failed to delete chitchat:', e)
      }
    }
  }

  async function toggleRequired(val: boolean) {
    setMustAnswer(val)
    if (!userDocRef) return
    try {
      await updateDoc(userDocRef, { chitchatsRequired: val })
    } catch (e) {
      console.error('Failed to update chitchatsRequired:', e)
    }
  }
  
  


  // pre-fill from context
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

  // animate Mr. Mingles warning
  useEffect(() => {
    Animated.timing(rollAnim, {
      toValue: modalVisible ? 0 : 500,
      duration: modalVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [modalVisible]);

  // typewriter for warning
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (modalVisible) {
      let idx = 0;
      intervalId = setInterval(() => {
        idx++;
        setModalTypedText(fullModalText.substring(0, idx));
        if (idx === fullModalText.length) clearInterval(intervalId);
      }, 30);
    } else {
      setModalTypedText("");
    }
    return () => clearInterval(intervalId!);
  }, [modalVisible]);

  // take photo
  const handleTakePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Camera permissions are required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhotoUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // request location
  const handleRequestLocation = async () => {
    setLocationLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access location was denied.");
      setLocationLoading(false);
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync(pos.coords);
      if (geo.length) {
        const { city, country } = geo[0];
        setLocation(`${city}, ${country === "United States" ? "USA" : country}`);
      }
    } catch {
      alert("Unable to retrieve location.");
    } finally {
      setLocationLoading(false);
    }
  };

  // submit/back handler
  const handleSubmit = async () => {
    if (!name || !age || !location || !about || !photoUri) {
      setModalVisible(true);
      return;
    }
    const orig = profile || {};
    if (
      name === orig.name &&
      age === orig.age &&
      location === orig.location &&
      about === orig.about &&
      photoUri === orig.photoUri
    ) {
      router.back();
      return;
    }
    setIsSaving(true);
    try {
      await saveProfile({ name, age, location, about, photoUri });
      setProfileComplete(true);
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

 
  const renderAboutEditor = () => (
    <Modal animationType="fade" transparent visible={editingAbout}>
      <KeyboardAvoidingView
        style={editorStyles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={editorStyles.editorBox}>
          <Text style={editorStyles.editorTitle}>
            Write something about yourself
          </Text>
          <TextInput
            style={editorStyles.editorInput}
            value={about}
            onChangeText={t => {
              setAbout(t);
              setDescriptionError(t.length > 50 ? "Character limit exceeded!" : "");
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
            onPress={() => !descriptionError && setEditingAbout(false)}
          >
            <Text style={editorStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (!fontsLoaded) return null;

  return (
    <>
    <ImageBackground
      source={bathroomImg}
      style={styles.background}
      resizeMode="stretch"
      imageStyle={{ marginTop: moderateScale(30) }}
    >
       <ProfileNavbar onBack={handleSubmit} />
      <View style={styles.formContainer}>
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
            <LottieView
                    source={withoutBg}
                    autoPlay
                    loop
                    style={{ width: 600, height: 600, backgroundColor: "transparent" }}
                   />
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="#999"
              value={location}
              onChangeText={setLocation}
            />
          )}
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleRequestLocation}
          >
            <Text style={styles.editButtonText}>Get Location</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photoContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <MaterialIcons name="person" size={scale(125)} color="grey" />
          )}
          <TouchableOpacity
            style={[styles.editButton, styles.editButtonPhoto]}
            onPress={handleTakePhoto}
          >
            <Text style={styles.editButtonText}>Take a pic</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.aboutContainer}>
          <TouchableOpacity onPress={() => setEditingAbout(true)}>
            <Text style={styles.aboutText}>
              {about || "Write something about yourself..."}
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

      {/* Warning Modal */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <View style={modalStyles.modalOverlay}>
          <TouchableOpacity
            style={modalStyles.closeButton}
            onPress={() => setModalVisible(false)}
          >
             <Image source={closeIcon} style={styles.closeIcon} />
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

      <TouchableOpacity
        style={styles.hitbox}
        onPress={() => router.push('/settings')}
      />
      <TouchableOpacity
        style={styles.hitboxChats}
        onPress={() => setShowChitChats(true)}
      />

      <ChitChats
        visible={showChitChats}
        onClose={() => setShowChitChats(false)}
        existingChats={chats}
        onSave={handleSave}
        onDelete={handleDelete}
        required={mustAnswer}
        onRequiredChange={toggleRequired}
      />

      {renderAboutEditor()}

      {isSaving && (
        <View style={styles.loadingOverlay}>
          <LottieView
                  source={withoutBg}
                  autoPlay
                  loop
                  style={{ width: 600, height: 600, backgroundColor: "transparent" }}
                 />
        </View>
      )}

    </ImageBackground>
    
  </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    // height removed so aspectRatio determines height
    alignItems: "center",
  },
  formContainer: {
    position: "absolute",
    top: verticalScale(158),
    alignSelf: "center",
    width: "90%",
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: '#F5E1C4',
  },
  input: {
    width: "100%",
    fontSize: scale(18),
    textAlign: "center",
    textAlignVertical: "center",
    color: "#908db3",
    fontFamily: FontNames.MontserratBold,
    paddingVertical: verticalScale(2)
  },
  locationContainer: {
    alignItems: "center",
    paddingBottom: verticalScale(4)
  },
  editButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 20,
    
    borderWidth: 1,
    borderColor: "black",
  },
  editButtonText: {
    fontSize: scale(9),
    fontFamily: FontNames.MontserratBold,
  },
  photoContainer: {
    alignItems: "center",
    marginVertical: verticalScale(2),
  },
  photo: {
    width: scale(140),
    height: scale(140),
    borderRadius: scale(100),
  },
  editButtonPhoto: {
    marginTop: verticalScale(10),
  },
  aboutContainer: {
    alignItems: "center",
    marginVertical: verticalScale(5),
  },
  aboutText: {
    fontSize: scale(12),
    color: "gray",
    textAlign: "center",
    fontFamily: FontNames.MontSerratSemiBold,
  },
  bottomEdit: {
    marginTop: verticalScale(5),
  },
  hitbox: {
    position: 'absolute',
    top: "70%",
    left: "10%",
    width: 120,
    height: 120,
  },
  hitboxChats: {
    position: 'absolute',
    top: "70%",
    right: "10%",
    width: 120,
    height: 80,
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});

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
    fontSize: scale(22),
    fontFamily: FontNames.MontserratBold,
    marginBottom: verticalScale(20),
  },
  editorInput: {
    width: "100%",
    height: verticalScale(100),
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: scale(10),
    fontSize: scale(16),
    fontFamily: FontNames.MontserratRegular,
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
    fontSize: scale(16),
    fontFamily: FontNames.MontserratBold,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: verticalScale(40),
    right: scale(20),
    zIndex: 100,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: moderateScale(35),
    fontFamily: FontNames.MontserratExtraLight,
  },
  
  modalContainer: {
    width: "90%",
    height: verticalScale(400),
    backgroundColor: "#020621",
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 20,
    padding: verticalScale(20),
    alignItems: "center",
  },
  modalText: {
    color: "#eceded",
    fontSize: scale(22),
    textAlign: "center",
    marginBottom: verticalScale(20),
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
  mrMingles: {
    width: scale(350),
    height: scale(420),
    position: "absolute",
    bottom: scale(-340),
    right: scale(-100),
  },
});
