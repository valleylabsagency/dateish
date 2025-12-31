// app/bathroom.tsx
import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFonts } from "expo-font";
import { useRouter, useLocalSearchParams } from "expo-router";
import ProfileNavbar from "../components/ProfileNavbar";
import { ProfileContext } from "../contexts/ProfileContext";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "../firebase";
import { FontNames } from "../constants/fonts";
import ChitChats, { ChatType, SavedChat } from "./ChitChats";
import closeIcon from "../assets/images/x.png";
import LottieView from "lottie-react-native";
import animationData from "../assets/videos/mm-dancing.json";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// resolve the asset to get its intrinsic size
const bathroomImg = require("../assets/images/bathroom.png");
const { width: imgW, height: imgH } = Image.resolveAssetSource(bathroomImg);

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    (layer) => layer.ty !== 1 || layer.nm !== "Dark Blue Solid 1"
  ),
};

export default function BathroomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ onboard?: string }>();
  const { profile, saveProfile, setProfileComplete, profileComplete } =
    useContext(ProfileContext);

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
  const [mustAnswer, setMustAnswer] = useState(false);

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  const dispW = stageSize.w;
  const dispH = stageSize.h;
  const imgLeft = 0;
  const imgTop = 0;

  // Mirror placement (TWEAK these 3 numbers to nudge as needed)
  const mirrorX = 0.06; // left edge of mirror, in image % (0..1)
  const mirrorY = 0.19; // top edge of mirror, in image % (0..1)
  const mirrorW = 0.9; // width of mirror, in image % (0..1)

  // Scale fonts based on mirror width (360 is a comfy baseline)
  const mirrorScale =
    dispW > 0 ? Math.min(1.25, Math.max(0.8, (dispW * mirrorW) / 360)) : 1;

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const remap = (
    v: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ) =>
    outMin +
    ((clamp(v, inMin, inMax) - inMin) * (outMax - outMin)) / (inMax - inMin);

  // ---- Avatar size (responsive) ----
  const mirrorBoxW = dispW * mirrorW;
  const shortSidePx = Math.min(dispW || 0, dispH || 0);
  const baseAvatar = mirrorBoxW * 0.4;

  let mult = remap(shortSidePx, 340, 430, 0.9, 1.18);
  if (shortSidePx < 360) {
    mult = remap(shortSidePx, 250, 230, 0.68, 0.8);
  }
  const photoSize = Math.round(clamp(baseAvatar * mult, 82, 168));

  // editing-about modal
  const [editingAbout, setEditingAbout] = useState(false);
  const [modalTypedText, setModalTypedText] = useState("");
  const fullModalText =
    "Finish your profile you lazy shit!\n\nThen you will be able to see others and use the app...";

  // Mr. Mingles warning modal (existing)
  const [modalVisible, setModalVisible] = useState(false);
  const rollAnim = useRef(new Animated.Value(500)).current;
  const [chats, setChats] = useState<SavedChat[]>([]);

  // NEW: Onboarding flow
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

  // ===== NEW: name + dob validation states =====
  const NAME_MAX = 20;
  const [nameTooLong, setNameTooLong] = useState(false);
  const [dobInvalid, setDobInvalid] = useState(false);

  const insets = useSafeAreaInsets();
  const [navH, setNavH] = useState(0);
  const TOP_PADDING = navH > 0 ? navH : insets.top;

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Firestore user ref for chit-chats
  const userDocRef = auth.currentUser
    ? doc(firestore, "users", auth.currentUser.uid)
    : null;

  // ===== Helpers for DOB validity =====
  const parseIntSafe = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : NaN;
  };

  const isValidDD = (dd: string) => {
    if (!dd) return true; // don't show error while empty
    const n = parseIntSafe(dd);
    return Number.isFinite(n) && n >= 1 && n <= 31;
  };

  const isValidMM = (mm: string) => {
    if (!mm) return true;
    const n = parseIntSafe(mm);
    return Number.isFinite(n) && n >= 1 && n <= 12;
  };

  const recomputeDobInvalid = (dd: string, mm: string) => {
    const shouldCheck = dd.length > 0 || mm.length > 0;
    if (!shouldCheck) return false;
    return !isValidDD(dd) || !isValidMM(mm);
  };

  function isMinYearOk(yyyy: string) {
    const y = parseInt(yyyy, 10);
    return !isNaN(y) && y >= 1945;
  }

  useEffect(() => {
    if (!userDocRef) return;
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (Array.isArray(data.chitchats))
        setChats(data.chitchats as SavedChat[]);
      if (typeof data.chitchatsRequired === "boolean")
        setMustAnswer(data.chitchatsRequired);
    });
    return () => unsubscribe();
  }, [userDocRef]);

  async function handleSave(type: ChatType, content: string, index?: number) {
    const next = [...chats];
    if (index != null) next[index] = { type, content };
    else next.push({ type, content });

    setChats(next);

    if (userDocRef) {
      try {
        await updateDoc(userDocRef, { chitchats: next });
      } catch (e) {
        console.error("Failed to save chitchats:", e);
      }
    }
  }

  async function handleDelete(idx: number) {
    const newChats = chats.filter((_, i) => i !== idx);
    setChats(newChats);
    if (userDocRef) {
      try {
        await updateDoc(userDocRef, { chitchats: newChats });
      } catch (e) {
        console.error("Failed to delete chitchat:", e);
      }
    }
  }

  async function toggleRequired(val: boolean) {
    setMustAnswer(val);
    if (!userDocRef) return;
    try {
      await updateDoc(userDocRef, { chitchatsRequired: val });
    } catch (e) {
      console.error("Failed to update chitchatsRequired:", e);
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

      // keep validation flags consistent on load
      setNameTooLong((profile.name || "").length > NAME_MAX);
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
      toValue: modalVisible || showAnimatedMM ? 0 : 500,
      duration: modalVisible || showAnimatedMM ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [modalVisible, showAnimatedMM]);

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

  function isProfileCompleteLocal(p?: any) {
    return Boolean(p?.name && p?.age && p?.location && p?.about && p?.photoUri);
  }

  // OPEN ONBOARDING when routed from bar welcome (onboard=true) AND profile is incomplete
  useEffect(() => {
    const effectiveComplete =
      (typeof profileComplete === "boolean" ? profileComplete : undefined) ??
      isProfileCompleteLocal(profile);

    if (effectiveComplete === undefined) return;

    const shouldOnboard =
      (params.onboard === "true" || !effectiveComplete) &&
      effectiveComplete === false;

    if (shouldOnboard) {
      setOnboardingStep(0);
      setOnboardingVisible(true);
    } else {
      setOnboardingVisible(false);
    }
  }, [params.onboard, profileComplete, profile]);

  // TEMPORARY camera for expo
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera permission needed",
        "Please allow camera access to take a profile photo."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    setPhotoUri(asset.uri);
  };

  // request location
  const handleRequestLocation = async () => {
    if (!isMounted.current) return;
    setLocationLoading(true);
    try {
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

      const { status, canAskAgain } =
        await Location.requestForegroundPermissionsAsync();
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

      const pos = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 12000)
        ),
      ]);

      const geo = await Location.reverseGeocodeAsync(pos.coords);
      if (geo && geo.length > 0) {
        const { city, region, country } = geo[0];
        const cityStr = city?.trim() || region?.trim() || "";
        const countryStr =
          country === "United States" ? "USA" : (country || "").trim();
        const pretty = [cityStr, countryStr].filter(Boolean).join(", ");
        if (isMounted.current) setLocation(pretty || "");
      } else {
        Alert.alert(
          "Hmm…",
          "Couldn’t figure out your city. You can type it manually."
        );
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

    const wasProfileComplete = !!profileComplete;

    setIsSaving(true);
    try {
      await saveProfile({ name, age, location, about, photoUri });
      setProfileComplete(true);
      setHasSavedInSession(true);

      Alert.alert(
        "Pro tip",
        "Tired of ‘Hey’ and ‘Sup’? Check out the Chit Chats for prompts worth replying to!"
      );

      // if (!wasProfileComplete) {
      //   router.replace("/bar-2?fromBathroomFirst=1");
      // } else {
      //   router.replace("/bar-2");
      // }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileIfChanged = async () => {
    if (!profile) return true;

    const orig = profile || {};
    const current = { name, age, location, about, photoUri };

    const changed =
      current.name !== orig.name ||
      current.age !== orig.age ||
      current.location !== orig.location ||
      current.about !== orig.about ||
      current.photoUri !== orig.photoUri;

    if (!changed) return true;

    try {
      setIsSaving(true);
      await saveProfile(current);
      setProfileComplete(true);
      return true;
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save your changes. Please try again.");
      return false;
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

  // ===== NEW: Name change handler (sets too-long flag) =====
  const onChangeName = (t: string) => {
    setName(t);
    setNameTooLong(t.length > NAME_MAX);
  };

  // auto-advance between DOB fields + recompute invalid dd/mm
  const pad2 = (s: string) => {
    const v = s.replace(/\D/g, "");
    if (v.length === 1) return `0${v}`;
    return v.slice(0, 2);
  };

  const inRange = (n: number, lo: number, hi: number) => n >= lo && n <= hi;

  const isValidDDStrict = (dd: string) => {
    const v = dd.replace(/\D/g, "");
    if (v.length === 0) return false;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && inRange(n, 1, 31);
  };

  const isValidMMStrict = (mm: string) => {
    const v = mm.replace(/\D/g, "");
    if (v.length === 0) return false;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && inRange(n, 1, 12);
  };

  const finalizeDD = (raw = dobDD) => {
    const v = raw.replace(/\D/g, "").slice(0, 2);
    if (!v) return { ok: false, val: "" };
    const n = parseInt(v, 10);
    const ok = Number.isFinite(n) && inRange(n, 1, 31);
    const val = ok ? (v.length === 1 ? `0${v}` : v) : v; // only pad if ok
    return { ok, val };
  };

  const finalizeMM = (raw = dobMM) => {
    const v = raw.replace(/\D/g, "").slice(0, 2);
    if (!v) return { ok: false, val: "" };
    const n = parseInt(v, 10);
    const ok = Number.isFinite(n) && inRange(n, 1, 12);
    const val = ok ? (v.length === 1 ? `0${v}` : v) : v;
    return { ok, val };
  };

  const onChangeDD = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setDobDD(v);

    // show invalid DOB only when they started typing
    setDobInvalid(recomputeDobInvalid(v, dobMM));

    // if they typed 2 digits, only advance if VALID
    if (v.length === 2) {
      if (isValidDDStrict(v)) {
        mmRef.current?.focus();
      } else {
        // keep focus, don't advance
        ddRef.current?.focus();
      }
    }
  };

  const onChangeMM = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setDobMM(v);
    setDobInvalid(recomputeDobInvalid(dobDD, v));

    if (v.length === 2) {
      if (isValidMMStrict(v)) {
        yyyyRef.current?.focus();
      } else {
        mmRef.current?.focus();
      }
    }
  };

  const onChangeYYYY = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 4);
    setDobYYYY(v);
  };

  // Call these onBlur so "2" becomes "02" AFTER you leave the field.
  // Also: if invalid, we keep focus here and do not pad.
  const onBlurDD = () => {
    const { ok, val } = finalizeDD();
    if (!dobDD) return; // nothing typed
    setDobDD(val);
    setDobInvalid(recomputeDobInvalid(val, dobMM));
    if (!ok) {
      // bounce focus back if invalid
      ddRef.current?.focus();
    }
  };

  const onBlurMM = () => {
    const { ok, val } = finalizeMM();
    if (!dobMM) return;
    setDobMM(val);
    setDobInvalid(recomputeDobInvalid(dobDD, val));
    if (!ok) {
      mmRef.current?.focus();
    }
  };

  // determine if Next should be enabled on each step
  // ===== UPDATED: includes nameTooLong + dobInvalid blocking =====
  const nextEnabled =
    onboardingStep === 0
      ? name.trim().length > 0 && !nameTooLong
      : onboardingStep === 1
      ? dobDD.length === 2 &&
        dobMM.length === 2 &&
        dobYYYY.length === 4 &&
        !dobInvalid &&
        isValidAdult(dobDD, dobMM, dobYYYY) &&
        isMinYearOk(dobYYYY)
      : onboardingStep === 2
      ? location.trim().length > 0
      : true;

  const showAnimatedMM =
    onboardingVisible &&
    (onboardingStep === 0 ||
      onboardingStep === 1 ||
      onboardingStep === 2 ||
      onboardingStep === 3);

  // Onboarding step handlers
  const handleNext = async () => {
    if (!nextEnabled) return;

    if (onboardingStep === 0) {
      setOnboardingStep(1);
    } else if (onboardingStep === 1) {
      const ageNum = computeAgeFromDob(dobDD, dobMM, dobYYYY);
      if (ageNum < 0) return;
      if (ageNum < 21) {
        Alert.alert(
          "Sorry!",
          "Dateish is age 21 and up. Hopefully see you again when you’re older. 🙂",
          [{ text: "Back", onPress: () => router.replace("/") }]
        );
        return;
      }
      setAge(String(ageNum));
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      setOnboardingStep(3);
    } else if (onboardingStep === 3) {
      setOnboardingVisible(false);
    }
  };

  const handleLocationPrompt = async () => {
    await handleRequestLocation();
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
            {onboardingStep === 3 &&
              "Complete the rest of the stuff on your own."}
          </Text>

          {/* Inputs per step */}
          {onboardingStep === 0 && (
            <>
              <TextInput
                style={onboardStyles.input}
                placeholder="Your name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={onChangeName}
                autoCapitalize="words"
              />
              <Text style={onboardStyles.comment}>
                You won’t be able to change it after.
              </Text>

              {nameTooLong && (
                <Text style={onboardStyles.errorText}>
                  Your name is too long, choose a nickname or something...
                </Text>
              )}
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
                  onBlur={onBlurDD}
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
                  onBlur={onBlurMM}
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

              {/* NEW: DD/MM invalid message */}
              {dobInvalid && (
                <Text style={onboardStyles.errorText}>
                  Invalid date of birth
                </Text>
              )}

              {/* existing age too young */}
              {dobDD &&
                dobMM &&
                dobYYYY &&
                computeAgeFromDob(dobDD, dobMM, dobYYYY) < 21 && (
                  <Text style={onboardStyles.errorText}>
                    Dateish is age 21 and up. Sorry! Hopefully see you again
                    when you’re older. :)
                  </Text>
                )}

              {/* existing too old */}
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
                style={[
                  onboardStyles.primaryButton,
                  locationLoading && { opacity: 0.6 },
                ]}
                onPress={handleLocationPrompt}
                disabled={locationLoading}
                accessibilityLabel="Allow and fill location"
                testID="btnFillLocation"
              >
                <Text style={onboardStyles.primaryButtonText}>
                  {locationLoading
                    ? "Getting Location…"
                    : "Allow & Fill Location"}
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
              <Text
                style={[onboardStyles.comment, { marginTop: verticalScale(8) }]}
              >
                I’m going out for a smoke. Come back to the bar when you finish.
              </Text>
            </>
          )}
        </View>

        {/* Mr. Mingles image */}
        {showAnimatedMM && (
          <Animated.View
            pointerEvents="none"
            style={[
              modalStyles.mrMingles,
              { transform: [{ translateX: rollAnim }] },
            ]}
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
          style={[
            onboardStyles.nextButton,
            !nextEnabled && onboardStyles.nextButtonDisabled,
          ]}
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
            onChangeText={(t) => {
              setAbout(t);
              setDescriptionError(
                t.length > 50 ? "Character limit exceeded!" : ""
              );
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
      {/* NAVBAR (measured) */}
      <View onLayout={(e) => setNavH(e.nativeEvent.layout.height)}>
        <ProfileNavbar
          showBack={hasSavedInSession}
          onBack={async () => {
            if (!hasSavedInSession) {
              router.replace("/bar-2");
              return;
            }
            const ok = await saveProfileIfChanged();
            if (ok) router.replace("/bar-2");
          }}
        />
      </View>

      {/* STAGE (starts below navbar) */}
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
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      >
        <View style={{ flex: 1 }}>
          <Image
            source={bathroomImg}
            fadeDuration={0}
            style={{
              position: "absolute",
              left: imgLeft,
              top: imgTop,
              width: dispW,
              height: dispH,
            }}
            resizeMode="stretch"
          />

          <View
            style={[
              styles.formContainer,
              dispW > 0 && {
                left: imgLeft + dispW * mirrorX,
                top: imgTop + dispH * mirrorY,
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
                  style={[
                    styles.input,
                    locationLoading && styles.inputLoadingText,
                  ]}
                  placeholder="Location"
                  placeholderTextColor="#999"
                  value={location}
                  onChangeText={setLocation}
                  editable={false}
                />
                {locationLoading && (
                  <ActivityIndicator
                    size="small"
                    color="#999"
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
                <MaterialIcons
                  name="person"
                  size={photoSize * 0.96}
                  color="grey"
                />
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

        {/* Floating hitboxes */}
        <View style={styles.floatingHitboxes} pointerEvents="box-none">
          {hasSavedInSession && (
            <TouchableOpacity
              style={styles.hitbox}
              onPress={() => router.push("/settings")}
              pointerEvents="auto"
            />
          )}

          <TouchableOpacity
            style={styles.hitboxChats}
            onPress={() => setShowChitChats(true)}
            pointerEvents="auto"
          />
        </View>

        {/* ChitChats modal */}
        <ChitChats
          visible={showChitChats}
          onClose={() => setShowChitChats(false)}
          existingChats={chats}
          onSave={handleSave}
          onDelete={handleDelete}
          required={mustAnswer}
          onRequiredChange={toggleRequired}
        />

        {/* About editor modal */}
        {renderAboutEditor()}

        {/* Saving overlay */}
        {isSaving && (
          <View style={styles.loadingOverlay}>
            <LottieView
              source={withoutBg}
              autoPlay
              loop
              style={{
                width: 600,
                height: 600,
                backgroundColor: "transparent",
              }}
            />
          </View>
        )}

        {/* Save button only before first save */}
        {!hasSavedInSession && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Incomplete profile warning modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <View style={modalStyles.modalOverlay}>
          <TouchableOpacity
            style={modalStyles.closeButton}
            onPress={() => setModalVisible(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
              style={[
                modalStyles.mrMingles,
                { transform: [{ translateX: rollAnim }] },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>

      {/* Onboarding modal */}
      <Modal
        transparent
        visible={onboardingVisible}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <View style={modalStyles.modalOverlay}>
          {renderOnboardingContent()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: "100%", alignItems: "center" },
  formContainer: {
    position: "absolute",
    width: "90%",
    overflow: "hidden",
    paddingHorizontal: scale(6),
  },
  closeIcon: { width: 24, height: 24, tintColor: "#F5E1C4" },
  input: {
    width: "100%",
    fontSize: scale(16),
    lineHeight: scale(18),
    textAlign: "center",
    textAlignVertical: "center",
    color: "#908db3",
    fontFamily: FontNames.MontserratBold,
    paddingVertical: verticalScale(3),
    includeFontPadding: false,
  },
  locationContainer: { alignItems: "center", paddingBottom: verticalScale(1) },
  locationInputWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  inputLoadingText: { color: "transparent" },
  locationInlineLoader: {
    position: "absolute",
    height: scale(100),
    width: scale(100),
    backgroundColor: "transparent",
  },
  editButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "black",
    marginTop: verticalScale(1),
    alignSelf: "center",
  },
  editButtonText: { fontSize: scale(9), fontFamily: FontNames.MontserratBold },
  photoContainer: { alignItems: "center", marginVertical: verticalScale(2) },
  photo: { width: scale(130), height: scale(130), borderRadius: scale(100) },
  editButtonPhoto: { marginTop: verticalScale(10) },
  aboutContainer: { alignItems: "center", marginVertical: verticalScale(5) },
  aboutText: {
    fontSize: scale(11),
    color: "gray",
    textAlign: "center",
    fontFamily: FontNames.MontSerratSemiBold,
    maxWidth: "100%",
    flexShrink: 1,
    paddingHorizontal: 8,
  },
  bottomEdit: { marginTop: verticalScale(5) },
  hitbox: {
    position: "absolute",
    top: "70%",
    left: "10%",
    width: 120,
    height: 120,
  },
  hitboxChats: {
    position: "absolute",
    top: "71%",
    right: "10%",
    width: 120,
    height: 80,
  },
  bottomNavbarContainer: { position: "absolute", bottom: 0, width: "100%" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  inputLocked: { color: "#6f6d8a", opacity: 0.8 },
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
  floatingHitboxes: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 300,
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
    width: scale(40),
    height: scale(40),
    justifyContent: "center",
    alignItems: "center",
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
    overflow: "visible",
    marginBottom: "55%",
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

// Onboarding-specific styles
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
    fontSize: scale(16),
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
  nextButtonDisabled: { opacity: 0.4 },
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
  dobCell: { width: scale(60) },
  dobYear: { width: scale(90) },
  slash: { color: "#fff", marginHorizontal: scale(6), fontSize: scale(22) },
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
