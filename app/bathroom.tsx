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
  Alert,
  Linking,
  Dimensions
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFonts } from "expo-font";
import { useRouter, useLocalSearchParams } from "expo-router";
import ProfileNavbar from "../components/ProfileNavbar";
import { ProfileContext } from "../contexts/ProfileContext";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from "../firebase";
import { FontNames } from "../constants/fonts";
import ChitChats, { ChatType, SavedChat } from "./ChitChats";
import closeIcon from '../assets/images/x.png'
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';
import { Camera, useCameraDevice } from "react-native-vision-camera";
import FaceDetector from "@react-native-ml-kit/face-detection";

import { useSafeAreaInsets } from "react-native-safe-area-context";


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

// ===== Stage sizing helpers (fit whole image on screen) =====


// Place children by normalized art coords (0..1)



export default function BathroomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ onboard?: string }>();
  const { profile, saveProfile, setProfileComplete, profileComplete } = useContext(ProfileContext);

  // form state
  const [name, setName] = useState("");
  const [age, setAge] = useState(""); // stored for now; derived from dob step
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [showChitChats, setShowChitChats] = useState(false);
  const [popupFlag, setPopupFlag] = useState<string | null>(null);
  const [mustAnswer, setMustAnswer] = useState(false)

  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("front");
  const [noFaceVisible, setNoFaceVisible] = useState(false);
  const [validating, setValidating] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  
  const scaleCover = Math.max(stageSize.w / imgW || 0, stageSize.h / imgH || 0);
  const dispW = stageSize.w;
  const dispH = stageSize.h;
  const imgLeft = 0;
  const imgTop  = 0;
  
  // Mirror placement (TWEAK these 3 numbers to nudge as needed)
  const mirrorX = 0.06;  // left edge of mirror, in image % (0..1)
  const mirrorY = 0.19;  // top edge of mirror, in image % (0..1)
  const mirrorW = .9;  // width of mirror, in image % (0..1)

  // Scale fonts based on mirror width (360 is a comfy baseline)
  const mirrorScale = dispW > 0 ? Math.min(1.25, Math.max(0.8, (dispW * mirrorW) / 360)) : 1;

// Reusable scaled sizes (clamped)
  const fs = (base: number) => Math.round(Math.min(24, Math.max(10, base * mirrorScale)));
  // Mirror box actual width in pixels
  const mirrorBoxW = dispW * mirrorW;

    // Photo size: ~42% of mirror width, clamped between 80–160 px
  // helpers (put near other small utils)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const remap = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((clamp(v, inMin, inMax) - inMin) * (outMax - outMin)) / (inMax - inMin);

// ---- Avatar size (responsive) ----
const shortSidePx = Math.min(dispW || 0, dispH || 0);

// Base size relative to mirror width (tweak 0.38..0.44 if needed)
const baseAvatar = mirrorBoxW * 0.40;

// Smaller screens (shortSide~340) get ~-10%, tall phones (shortSide~430) get ~+18%
let mult = remap(shortSidePx, 340, 430, 0.90, 1.18);

// Extra haircut for *very* small screens
if (shortSidePx < 380) {
  // 300→0.78x … 330→0.86x (keeps really tiny devices in check)
  mult = remap(shortSidePx, 250, 230, 0.68, 0.80);
}

// Final size with sane clamps
const photoSize = Math.round(clamp(baseAvatar * mult, 82, 168));





  // editing-about modal
  const [editingAbout, setEditingAbout] = useState(false);
  const [modalTypedText, setModalTypedText] = useState("");
  const fullModalText =
    "Finish your profile you lazy shit!\n\nThen you will be able to see others and use the app...";

  // Mr. Mingles warning modal (existing)
  const [modalVisible, setModalVisible] = useState(false);
  const rollAnim = useRef(new Animated.Value(500)).current;
  const [chats, setChats] = useState<SavedChat[]>([])

  // NEW: Onboarding flow (uses the SAME “Mr. Mingles” modal container)
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2 | 3>(0);

  const [hasSavedInSession, setHasSavedInSession] = useState(!!profileComplete);


  // DOB step fields + refs for auto-advance
  const [dobDD, setDobDD] = useState("");
  const [dobMM, setDobMM] = useState("");
  const [dobYYYY, setDobYYYY] = useState("");
  const ddRef = useRef<TextInput>(null);
  const mmRef = useRef<TextInput>(null);
  const yyyyRef = useRef<TextInput>(null);


  const insets = useSafeAreaInsets();

  const [navH, setNavH] = useState(0);

  // If the navbar already includes its own safe-area padding (most do),
  // use its measured height only. Before we’ve measured, fall back to insets.top.
  const TOP_PADDING = navH > 0 ? navH : insets.top;
  



  

  // how much to bias vertical placement: 0 = top, .5 = center, 1 = bottom
  const Y_ANCHOR = 0;                          // <- pin toward the top



  const isMounted = useRef(true);
    useEffect(() => {
      return () => { isMounted.current = false; };
    }, []);

  // determine if Next should be enabled on each step
  // replace your nextEnabled with this:
const nextEnabled =
  onboardingStep === 0 ? name.trim().length > 0
  : onboardingStep === 1
    ? dobDD.length === 2 &&
      dobMM.length === 2 &&
      dobYYYY.length === 4 &&
      isValidAdult(dobDD, dobMM, dobYYYY) &&
      isMinYearOk(dobYYYY)                 // <- block pre-1945
    : onboardingStep === 2
      ? location.trim().length > 0
      : true;


  // show animation only on first and last step
  const showAnimatedMM = onboardingVisible && (onboardingStep === 0 || onboardingStep === 1 || onboardingStep === 2 || onboardingStep === 3);

  // Firestore user ref for chit-chats
  const userDocRef = auth.currentUser
    ? doc(firestore, 'users', auth.currentUser.uid)
    : null

  function isMinYearOk(yyyy: string) {
    const y = parseInt(yyyy, 10);
    return !isNaN(y) && y >= 1945;
  }

// Always pass a proper URI with scheme (file://) to ML Kit on BOTH platforms
async function validateFace(fileUri: string) {
  const uri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

  try {
    const options: any = {
      performanceMode: 'fast',
      classificationMode: 'none',
      contourMode: 'none',
      minFaceSize: 0.05,
      isTrackingEnabled: false,
    };

    const mod: any = FaceDetector as any;

    // Prefer detectFromFile; fall back to other method names some versions expose
    const faces =
      (typeof mod.detectFromFile === 'function' && await mod.detectFromFile(uri, options)) ||
      (typeof mod.detectFromUri  === 'function' && await mod.detectFromUri(uri, options)) ||
      (typeof mod.detect         === 'function' && await mod.detect(uri, options)) ||
      [];

    console.log('MLKit faces count =', Array.isArray(faces) ? faces.length : faces);
    return Array.isArray(faces) && faces.length > 0;
  } catch (e) {
    console.warn('Face detection failed:', e, { fileUri: uri });
    return false;
  }
}


  

  useEffect(() => {
    if (!userDocRef) return
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (!docSnap.exists()) return
      const data = docSnap.data()
      if (Array.isArray(data.chitchats)) setChats(data.chitchats as SavedChat[])
      if (typeof data.chitchatsRequired === 'boolean') setMustAnswer(data.chitchatsRequired)
    })
    return () => unsubscribe()
  }, [userDocRef])

  async function handleSave(type: ChatType, content: string, index?: number) {
    const next = [...chats];
    if (index != null) {
      // edit existing
      next[index] = { type, content };
    } else {
      // add new
      next.push({ type, content });
    }
  
    setChats(next);
  
    if (userDocRef) {
      try {
        await updateDoc(userDocRef, { chitchats: next });
      } catch (e) {
        console.error('Failed to save chitchats:', e);
      }
    }
  }

  async function handleDelete(idx: number) {
    const newChats = chats.filter((_, i) => i !== idx)
    setChats(newChats)
    if (userDocRef) {
      try { await updateDoc(userDocRef, { chitchats: newChats }) } catch (e) { console.error('Failed to delete chitchat:', e) }
    }
  }

  async function toggleRequired(val: boolean) {
    setMustAnswer(val)
    if (!userDocRef) return
    try { await updateDoc(userDocRef, { chitchatsRequired: val }) } catch (e) { console.error('Failed to update chitchatsRequired:', e) }
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

  // animate Mr. Mingles warning (existing)
  useEffect(() => {
    Animated.timing(rollAnim, {
      toValue: (modalVisible || showAnimatedMM) ? 0 : 500,
      duration: (modalVisible || showAnimatedMM) ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [modalVisible, showAnimatedMM]);

  // typewriter for warning (existing)
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

  function isProfileCompleteLocal(p?: any) {
    // Adjust the fields to match your "complete" definition
    return Boolean(p?.name && p?.age && p?.location && p?.about && p?.photoUri);
  }
  

  // OPEN ONBOARDING when routed from bar welcome (onboard=true) AND we *know* profile is incomplete
useEffect(() => {
  // Prefer the context flag if it’s reliable; otherwise fall back to local computed completeness
  const effectiveComplete =
    (typeof profileComplete === "boolean" ? profileComplete : undefined) ??
    isProfileCompleteLocal(profile);

  // Do nothing until we can actually tell (avoid false “incomplete” before load)
  if (effectiveComplete === undefined) return;

  const shouldOnboard = params.onboard === "true" && effectiveComplete === false;

  if (shouldOnboard) {
    setOnboardingStep(0);
    setOnboardingVisible(true);
  } else {
    setOnboardingVisible(false);
  }
}, [params.onboard, profileComplete, profile]);


  // take photo
  
  const handleTakePhoto = async () => {
    const status = await Camera.requestCameraPermission();
    if (status !== "granted") {
      Alert.alert("Camera permission needed", "Please allow camera access to take a profile photo.");
      return;
    }
    setCameraVisible(true);
  }; 

  const captureAndValidate = async () => {
    if (!cameraRef.current) return;
    try {
      setValidating(true);
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
        ...(Platform.OS === 'ios' ? { photoCodec: 'jpeg' } : {}),
      });
      
  
      // Normalize to file://... for both platforms
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;

      const ok = await validateFace(uri);
  
      if (ok) {
        // IMPORTANT: Save the *same* uri you validated
        setPhotoUri(uri);
      } else {
        setNoFaceVisible(true);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Couldn’t capture", "Please try again.");
    } finally {
      setValidating(false);
      setCameraVisible(false);
    }
  };
  
  

  // request location
  const handleRequestLocation = async () => {
    if (!isMounted.current) return;
    setLocationLoading(true);
    try {
      // 1) Services ON?
      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        Alert.alert(
          "Location is off",
          "Please enable Location Services in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
  
      // 2) Permission?
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          canAskAgain
            ? "We need location permission to auto-fill your city."
            : "Location permission is denied. Enable it in Settings > Dateish.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
  
      // 3) Get position (with timeout)
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
      ]);
  
      // 4) Reverse geocode
      const geo = await Location.reverseGeocodeAsync(pos.coords);
      if (geo && geo.length > 0) {
        const { city, region, country } = geo[0];
        const cityStr = city?.trim() || region?.trim() || "";
        const countryStr = country === "United States" ? "USA" : (country || "").trim();
        const pretty = [cityStr, countryStr].filter(Boolean).join(", ");
        if (isMounted.current) setLocation(pretty || "");
      } else {
        Alert.alert("Hmm…", "Couldn’t figure out your city. You can type it manually.");
      }
    } catch (e: any) {
      if (e?.message === "timeout") {
        Alert.alert("Slow GPS", "Couldn’t get a fix. Try again near a window.");
      } else {
        console.error("Location error:", e);
        Alert.alert("Unable to retrieve location.");
      }
    } finally {
      if (isMounted.current) setLocationLoading(false);
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
      router.replace("/bar-2");
      return;
    }
    setIsSaving(true);
    try {
      await saveProfile({ name, age, location, about, photoUri });
      setProfileComplete(true);
      setHasSavedInSession(true);
      // Post-save nudge about Chit Chats
      Alert.alert(
        "Pro tip",
        "Tired of ‘Hey’ and ‘Sup’? Check out the Chit Chats for prompts worth replying to!"
      );
      router.replace("/bar-2");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers
  function computeAgeFromDob(dd: string, mm: string, yyyy: string) {
    const d = parseInt(dd, 10);
    const m = parseInt(mm, 10) - 1;
    const y = parseInt(yyyy, 10);
    const birth = new Date(y, m, d);
    if (isNaN(birth.getTime())) return -1;
    const today = new Date();
    let a = today.getFullYear() - y;
    const beforeBirthday =
      today.getMonth() < m || (today.getMonth() === m && today.getDate() < d);
    if (beforeBirthday) a--;
    return a;
  }

  function isValidAdult(dd: string, mm: string, yyyy: string) {
    if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return false;
    const ageNum = computeAgeFromDob(dd, mm, yyyy);
    return ageNum >= 21;
  }

  // Onboarding step handlers
  const handleNext = async () => {
    if (!nextEnabled) return;

    if (onboardingStep === 0) {
      // lock-in name (note: "can’t change later" – you could persist immediately if desired)
      setOnboardingStep(1);
    } else if (onboardingStep === 1) {
      const ageNum = computeAgeFromDob(dobDD, dobMM, dobYYYY);
      if (ageNum < 0) return;
      if (ageNum < 21) {
        Alert.alert(
          "Sorry!",
          "Dateish is age 21 and up. Hopefully see you again when you’re older. 🙂",
          [
            { text: "Back", onPress: () => router.replace("/") }
          ]
        );
        return;
      }
      setAge(String(ageNum));
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      setOnboardingStep(3);
    } else if (onboardingStep === 3) {
      setOnboardingVisible(false);
      // user can complete remaining fields now
    }
  };

  const handleLocationPrompt = async () => {
    await handleRequestLocation();
  };

  // auto-advance between DOB fields
  const onChangeDD = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setDobDD(v);
    if (v.length === 2) mmRef.current?.focus();
  };
  const onChangeMM = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setDobMM(v);
    if (v.length === 2) yyyyRef.current?.focus();
  };
  const onChangeYYYY = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 4);
    setDobYYYY(v);
  };

  const renderOnboardingContent = () => {
    return (
      <View style={modalStyles.modalContainer}>
        {/* Speech bubble area */}
        <View style={onboardStyles.speechWrap}>
          {/* Title/question */}
          <Text style={onboardStyles.questionText}>
            {onboardingStep === 0 && "What’s your name?"}
            {onboardingStep === 1 && "What’s your Date of Birth?"}
            {onboardingStep === 2 && "Where are you from?"}
            {onboardingStep === 3 && "Complete the rest of the stuff on your own."}
          </Text>

          {/* Inputs per step */}
          {onboardingStep === 0 && (
            <>
              <TextInput
                style={onboardStyles.input}
                placeholder="Your name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Text style={onboardStyles.comment}>
                You won’t be able to change it after.
              </Text>
            </>
          )}

          {onboardingStep === 1 && (
            <>
              <View style={onboardStyles.dobRow}>
                <TextInput
                  ref={ddRef}
                  style={[onboardStyles.input, onboardStyles.dobCell]}
                  placeholder="DD"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={dobDD}
                  onChangeText={onChangeDD}
                  maxLength={2}
                />
                <Text style={onboardStyles.slash}>/</Text>
                <TextInput
                  ref={mmRef}
                  style={[onboardStyles.input, onboardStyles.dobCell]}
                  placeholder="MM"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={dobMM}
                  onChangeText={onChangeMM}
                  maxLength={2}
                />
                <Text style={onboardStyles.slash}>/</Text>
                <TextInput
                  ref={yyyyRef}
                  style={[onboardStyles.input, onboardStyles.dobYear]}
                  placeholder="YYYY"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={dobYYYY}
                  onChangeText={onChangeYYYY}
                  maxLength={4}
                />
              </View>
              <Text style={onboardStyles.comment}>
                You won’t be able to change it after.
              </Text>

              {dobDD && dobMM && dobYYYY && computeAgeFromDob(dobDD, dobMM, dobYYYY) < 21 && (
                <Text style={onboardStyles.errorText}>
                  Dateish is age 21 and up. Sorry! Hopefully see you again when you’re older. :)
                </Text>
              )}

              {dobYYYY.length === 4 && parseInt(dobYYYY, 10) < 1945 && (
                <Text style={onboardStyles.errorText}>
                  Are you lost? Do you need me to call your nurse?
                </Text>
              )}
         
            </>
          )}

          {onboardingStep === 2 && (
            <>
            <TouchableOpacity
              style={[onboardStyles.primaryButton, locationLoading && { opacity: 0.6 }]}
              onPress={handleLocationPrompt}
              disabled={locationLoading}
              accessibilityLabel="Allow and fill location"
              testID="btnFillLocation"
            >
              <Text style={onboardStyles.primaryButtonText}>
                {locationLoading ? "Getting Location…" : "Allow & Fill Location"}
              </Text>
            </TouchableOpacity>
        
            {!!location && (
              <View style={onboardStyles.locationPill}>
                <Text style={onboardStyles.locationPillText}>{location}</Text>
              </View>
            )}
        
            <Text style={onboardStyles.comment}>
              You can always change this if you move around :)
            </Text>
          </>
          )}

          {onboardingStep === 3 && (
            <>
              <Text style={[onboardStyles.comment, { marginTop: verticalScale(8) }]}>
                I’m going out for a smoke. Come back to the bar when you finish.
              </Text>
              <Text style={[onboardStyles.comment, { marginTop: verticalScale(8), fontStyle: "italic" }]}>
                Tip: Tired of “Hey” and “Sup”? Check out the Chit Chats to get something worth replying to!
              </Text>
            </>
          )}
        </View>

        {/* Mr. Mingles image (animated only first/last) */}
        {showAnimatedMM && (
          <Animated.View
          pointerEvents="none"
          style={[modalStyles.mrMingles, { transform: [{ translateX: rollAnim }] }]}
          // optional: accessibility clean-up so screen readers ignore the overlay:
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Image
            source={require("../assets/images/mr-mingles.png")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </Animated.View>
        )}

        {/* Next / OK controls */}
        <TouchableOpacity
          style={[onboardStyles.nextButton, !nextEnabled && onboardStyles.nextButtonDisabled]}
          disabled={!nextEnabled}
          onPress={handleNext}
        >
          <Text style={onboardStyles.nextText}>
            {onboardingStep === 3 ? "OK" : "Next"}
          </Text>
        </TouchableOpacity>

        {/* Bubble pointer */}
        <View style={modalStyles.triangleContainer}>
          <View style={modalStyles.outerTriangle} />
          <View style={modalStyles.innerTriangle} />
        </View>
      </View>
    );
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
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View onLayout={e => setNavH(e.nativeEvent.layout.height)}>
        <ProfileNavbar
          onBack={() => router.replace("/bar-2")}
          showBack={hasSavedInSession}
        />
      </View>
      <View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setStageSize({ w: width, h: height });
        }}
        style={{
          position: "absolute",
          top: TOP_PADDING,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",         // keeps the blur neatly clipped to the stage
          backgroundColor: "transparent",
        }}
      >
        <View style={{ flex: 1 }}>
          
        <Image
          source={bathroomImg}
          fadeDuration={0}
          style={{
            position: "absolute",
            left:  imgLeft,   // 0
            top:   imgTop,    // 0
            width: dispW,     // stage width
            height:dispH,     // stage height
          }}
          resizeMode="stretch"
        />
          <View
            style={[
              styles.formContainer,
              dispW > 0 && {
                left:  imgLeft + dispW * mirrorX,
                top:   imgTop  + dispH * mirrorY,
                width: dispW * mirrorW,
              },
            ]}
          >
            <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#999"
                value={name}
                editable={false}           
                onChangeText={setName}
              />

              <TextInput
                style={styles.input}
                placeholder="Age"
                placeholderTextColor="#999"
                value={age}
                editable={false}           
                onChangeText={setAge}
                keyboardType="numeric"
              />

              <View style={styles.locationContainer}>
                  <View style={styles.locationInputWrap}>
                    <TextInput
                      style={[styles.input, locationLoading && styles.inputLoadingText]}
                      placeholder="Location"
                      placeholderTextColor="#999"
                      value={location}
                      onChangeText={setLocation}    
                      editable={false}
                    />
                    {locationLoading && (
                      <LottieView
                        source={withoutBg}
                        autoPlay
                        loop
                        style={styles.locationInlineLoader}
                      />
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleRequestLocation}
                    disabled={locationLoading}
                  >
                    <Text style={styles.editButtonText}>
                      {locationLoading ? "Getting…" : "Get Location"}
                    </Text>
                  </TouchableOpacity>
                </View>

              <View style={styles.photoContainer}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: photoSize,
                    height: photoSize,
                    borderRadius: photoSize / 2,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="person" size={photoSize * 0.96} color="grey" />
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

        </View>
       
          
            
            {/* Existing Incomplete Profile Warning Modal */}
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

            {/* NEW: Onboarding Modal (uses same visual motif) */}
            <Modal transparent visible={onboardingVisible} animationType="fade">
              <View style={modalStyles.modalOverlay}>
                <TouchableOpacity
                  style={modalStyles.closeButton}
                  onPress={() => setOnboardingVisible(false)}
                >
                  <Image source={closeIcon} style={styles.closeIcon} />
                </TouchableOpacity>
                {renderOnboardingContent()}
              </View>
            </Modal>
       

          <Modal visible={cameraVisible} animationType="slide" transparent={false}>
              <View style={{ flex: 1, backgroundColor: "black" }}>
                {device ? (
                  <Camera
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    device={device}
                    isActive={cameraVisible}
                    photo={true}
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff" }}>Loading camera…</Text>
                  </View>
                )}

              
                <View style={{ position: "absolute", bottom: 30, left: 0, right: 0, alignItems: "center" }}>
                  <Text style={{ color: "#fff", marginBottom: 8 }}>
                    Center your pretty face in the frame
                  </Text>
                  <TouchableOpacity
                    onPress={captureAndValidate}
                    style={{
                      backgroundColor: "#6e1944",
                      borderWidth: 4,
                      borderColor: "#460b2a",
                      paddingVertical: 10,
                      paddingHorizontal: 24,
                      borderRadius: 28,
                    }}
                  >
                    <Text style={{ color: "#ffe3d0", fontWeight: "700" }}>
                      {validating ? "Checking…" : "Capture"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setCameraVisible(false)}
                    style={{ marginTop: 10, padding: 8 }}
                  >
                    <Text style={{ color: "#ddd" }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal> 

            {/* No-face “Mr. Mingles” popup */}
            <Modal transparent visible={noFaceVisible} animationType="fade">
              <View style={modalStyles.modalOverlay}>
                <TouchableOpacity
                  style={modalStyles.closeButton}
                  onPress={() => setNoFaceVisible(false)}
                >
                  <Image source={closeIcon} style={styles.closeIcon} />
                </TouchableOpacity>
                <View style={modalStyles.modalContainer}>
                  <Text style={modalStyles.modalText}>
                    You need to take a picture that includes your pretty face.
                  </Text>
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


            {hasSavedInSession && (
              <TouchableOpacity
                style={styles.hitbox}
                onPress={() => router.push('/settings')}
              />
            )}
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
            {!hasSavedInSession && (
              <TouchableOpacity style={styles.saveBtn} onPress={() => handleSubmit()}>
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </TouchableOpacity>
            )}
        
  
      </View>
        
      </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  formContainer: {
    position: "absolute",
    width: "90%",
    overflow: "hidden",              
    paddingHorizontal: scale(6),
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: '#F5E1C4',
  },
  input: {
    width: "100%",
    fontSize: scale(16),
    textAlign: "center",
    textAlignVertical: "center",
    color: "#908db3",
    fontFamily: FontNames.MontserratBold,
    paddingVertical: verticalScale(0)
  },
  locationContainer: {
    alignItems: "center",
    paddingBottom: verticalScale(1)
  },
  locationInputWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  inputLoadingText: {
    color: "transparent", // hide text while loader shows "in its place"
  },
  locationInlineLoader: {
    position: "absolute",
    height: scale(100),
    width: scale(100),
    backgroundColor: "transparent",
  },
  editButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "black",
    marginTop: verticalScale(1),
    alignSelf: "center",
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
    width: scale(130),
    height: scale(130),
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
    maxWidth: "100%",
    flexShrink: 1,
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
    top: "78%",
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
  inputLocked: {
    color: "#6f6d8a",        // dimmed look
    opacity: 0.8,
  },
  saveBtn: {
    position: "absolute",
    bottom: verticalScale(30),
    alignSelf: "center",
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(28),
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
  },
  saveBtnText: {
    color: "#ffe3d0",
    fontSize: scale(18),
    fontFamily: FontNames.MontserratBold,
    textTransform: "uppercase",
    textAlign: "center",
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
    height: verticalScale(300),
    backgroundColor: "#020621",
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 20,
    padding: verticalScale(20),
    alignItems: "center",
    position: "relative",
    overflow: "visible",      // <- allow MM to hang out of the box
    marginBottom: "55%"
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
    width: scale(380),        
    height: scale(460),
    position: "absolute",
    bottom: -verticalScale(350),
    right: -scale(120),
    zIndex: 100,
    pointerEvents: "none",
  },
});

// Onboarding-specific styles (inside the “lazy shit” modal container)
const onboardStyles = StyleSheet.create({
  speechWrap: {
    width: "100%",
    backgroundColor: "transparent",
    alignItems: "center",
  },
  questionText: {
    color: "#eceded",
    fontSize: scale(22),
    textAlign: "center",
    fontFamily: FontNames.MontserratExtraLight,
    marginBottom: verticalScale(10),
  },
  input: {
    width: "90%",
    borderColor: "#fff",
    borderWidth: 1,
    borderRadius: 8,
    padding: scale(10),
    color: "#fff",
    fontSize: scale(16),
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
  },
  comment: {
    color: "#cfd2ff",
    fontSize: scale(12),
    marginTop: verticalScale(8),
    textAlign: "center",
    fontFamily: FontNames.MontserratExtraLightItalic,
  },
  errorText: {
    color: "#ffb3b3",
    fontSize: scale(12),
    marginTop: verticalScale(8),
    textAlign: "center",
  },
  nextButton: {
    position: "absolute",
    bottom: verticalScale(20),
    alignSelf: "center",
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(24),
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextText: {
    fontSize: scale(18),
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratBold,
    textTransform: "uppercase",
    textAlign: "center",
  },
  dobRow: {
    marginTop: verticalScale(6),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dobCell: {
    width: scale(60),
  },
  dobYear: {
    width: scale(90),
  },
  slash: {
    color: "#fff",
    marginHorizontal: scale(6),
    fontSize: scale(22),
  },
  primaryButton: {
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(24),
    borderRadius: 20,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
    marginTop: verticalScale(6),
  },
  primaryButtonText: {
    fontSize: scale(16),
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratBold,
    textTransform: "uppercase",
    textAlign: "center",
  },
  locationPill: {
    marginTop: verticalScale(10),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "center",
  },
  locationPillText: {
    color: "#fff",
    fontSize: scale(14),
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
  },
});
