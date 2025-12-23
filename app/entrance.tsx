// app/entrance.tsx
import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  ImageBackground,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Modal,
  Alert,
  Linking
} from "react-native";
import { Video } from "expo-av";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { FirstTimeContext } from "../contexts/FirstTimeContext";
import { signUp, login } from "../services/authservice";
import { FontNames } from "../constants/fonts";
import closeIcon from '../assets/images/x.png';
import PopUp from "../components/PopUp";
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, setDoc, updateDoc, doc, onSnapshot, serverTimestamp, setLogLevel } from "firebase/firestore";
import { auth, firestore } from "../firebase";
import ConfettiCannon from 'react-native-confetti-cannon';
import { AntDesign } from "@expo/vector-icons";     // Google
import { FontAwesome } from "@expo/vector-icons";   // Meta (Facebook)
import { Ionicons } from "@expo/vector-icons";   
import { SafeAreaView } from "react-native-safe-area-context";


const { width, height } = Dimensions.get("window");
const MESSAGE = "Happy Hour daily! ";

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
  ),
}

const CLIPBOARD_IMG = require("../assets/images/clipboard.png");
const { width: cbW, height: cbH } = Image.resolveAssetSource(CLIPBOARD_IMG);
const CLIPBOARD_AR = cbW / cbH; // keeps art from stretching

function mapFirebaseAuthError(err: any): { title: string; message: string; code?: string } {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return { title: "Invalid Email", message: "That email looks invalid.", code };
    case "auth/missing-password":
      return { title: "Missing Password", message: "Please enter your password.", code };
    case "auth/missing-email":
      return { title: "Missing Email", message: "Please enter your email.", code };
    case "auth/user-not-found":
      return { title: "Account Not Found", message: "No account found. Try signing up or check your email.", code };
    case "auth/wrong-password":
      return { title: "Wrong Password", message: "That password didn’t match. Try again.", code };
    case "auth/email-already-in-use":
      return { title: "Email Already Registered", message: "This email is already registered. Try signing in.", code };
    case "auth/too-many-requests":
      return { title: "Too Many Attempts", message: "Please wait a bit and try again.", code };
    case "auth/network-request-failed":
      return { title: "Network Error", message: "Check your internet connection and try again.", code };
    case "auth/operation-not-allowed":
      return { title: "Sign-in Disabled", message: "This sign-in method is not enabled.", code };
    case "auth/no-user-uid":
      return { title: "Unexpected Error", message: "We couldn’t complete sign-in. Please try again.", code };
    default:
      return { title: "Authentication Failed", message: "Please try again.", code };
  }
}


// Open 5pm (17) to 5am (05), local device time
const OPEN_HOUR = 17; // 5pm
const CLOSE_HOUR = 5; // 5am

function isBarOpenNow(d = new Date()) {
  const h = d.getHours();
  // 17..23 or 0..4 => OPEN, exactly 05:00:00 and after => CLOSED
  return (h >= OPEN_HOUR) || (h < CLOSE_HOUR);
}


export default function EntranceScreen() {
  const router = useRouter();
  const { firstTime, setFirstTime } = useContext(FirstTimeContext);

  const [showAuth, setShowAuth] = useState(false);
  const [playAnimation, setPlayAnimation] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [authFlow, setAuthFlow] = useState<'normal' | 'vipGate'>('normal');
  const [authErrorMsg, setAuthErrorMsg] = useState<string>("");

  const [textWidth, setTextWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(width)).current;
  const videoRef = useRef<Video>(null);
  const hasStartedRef = useRef(false);
  const [isBarOpen, setIsBarOpen] = useState<boolean>(isBarOpenNow());
  const [showPopupRules, setShowPopupRules] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [showNotVipPopup, setShowNotVipPopup] = useState(false);
  const [showVipCongrats, setShowVipCongrats] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [notVipVisible, setNotVipVisible] = useState(false);
  const [vipTypedText, setVipTypedText] = useState("");
  const vipRollAnim = useRef(new Animated.Value(500)).current; // slide-in from right


  // Email code flow (dev/test OTP)
  const [email, setEmail] = useState("");
  const [codePhase, setCodePhase] = useState<"idle" | "sent">("idle");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // ── Clipboard wizard state ───────────────────────────────────────────────
  type AuthStep = 1 | 2 | 3 | 4;
  type AuthMethod = "google" | "meta" | "apple" | "email" | "username" | null;

  const [authStep, setAuthStep] = useState<AuthStep>(1);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [newAccount, setNewAccount] = useState<boolean>(firstTime);

  // inputs per path
  const [emailAddr, setEmailAddr] = useState("");
  const [userHandle, setUserHandle] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");

  // legal (step 4)
  const [agreeLegal, setAgreeLegal] = useState(false);
  const [agree21, setAgree21] = useState(false);
  const [legalError, setLegalError] = useState(false);

  // small helpers
  const IDENT = authMethod === "email" ? emailAddr.trim() : userHandle.trim(); // what we sign in/up with
  const termsUrl = "https://dateishoffice.wixsite.com/dateish";

  function resetClipboard() {
    setAuthStep(1);
    setAuthMethod(null);
    setNewAccount(firstTime);
    setEmailAddr("");
    setUserHandle("");
    setPwd1("");
    setPwd2("");
    setAgreeLegal(false);
    setAgree21(false);
    setLegalError(false);
    setAuthError(false);
    setAuthErrorMsg("");
  }

  function openClipboard() {
    resetClipboard();
    setShowAuth(true);
}


  const signSrc = isBarOpen
  ? require("../assets/images/open-sign.png")
  : require("../assets/images/closed-sign.png");

  const VIP_SPEECH =
  "You're not a VIP yet, just a regular old P.\nWanna become one?";


  

  const [fontsLoaded] = useFonts({
    [FontNames.ArcadePixelRegular]: require("../assets/fonts/ArcadePixel-Regular.otf"),
    [FontNames.MontserratBold]:     require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratRegular]:  require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"), 
  });

  
  const USERS_COLLECTION = "users";

  function ensureLegalOrWarn(action: () => void) {
    if (!agreedLegal || !confirmed21) {
      setLegalError(true);
      return;
    }
    setLegalError(false);
    action();
  }
  
  const openLegalLink = () =>
    Linking.openURL("https://dateishoffice.wixsite.com/dateish");
  
  // Dev/test OTP sender (no email backend yet)
  async function sendEmailCode() {
    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }
    // super bare email sanity check
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
  
    setSendingCode(true);
    try {
      const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
      setSentCode(code);
      setCodePhase("sent");
      setEnteredCode("");
      // In real prod, you'd send this via email provider / Firebase extension.
      Alert.alert("Dev code sent", `For now, enter this test code: ${code}`);
    } finally {
      setSendingCode(false);
    }
  }
  
  async function verifyEmailCode() {
    if (!sentCode) return;
    setVerifyingCode(true);
    try {
      if (enteredCode.trim() === sentCode) {
        // Approved → Entrance Animation
        setShowAuth(false);  
        router.replace("/entranceAnimation");
      } else {
        Alert.alert(
          "Authentication couldn’t finish successfully.",
          "Please double-check your code and try again."
        );
      }
    } finally {
      setVerifyingCode(false);
    }
  }
  

  useEffect(() => {
    let unsubUserDoc: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // clean up previous doc listener
      if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = undefined; }

      if (!user) {
        setIsVip(false);
        return;
      }
      const ref = doc(firestore, USERS_COLLECTION, user.uid);
      unsubUserDoc = onSnapshot(ref,
        (snap) => setIsVip(Boolean(snap.data()?.isVip)),
        () => setIsVip(false)
      );
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  

  useEffect(() => {
    const update = () => setIsBarOpen(isVip || isBarOpenNow());
    update(); // set immediately
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [isVip]);
  

  // marquee loop
  useEffect(() => {
    if (!textWidth) return;
    scrollX.setValue(width);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollX, {
          toValue: -textWidth,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scrollX, {
          toValue: width,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [textWidth]);

  useEffect(() => {
    Animated.timing(vipRollAnim, {
      toValue: notVipVisible ? 0 : 500,
      duration: notVipVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [notVipVisible]);

  useEffect(() => {
    let id: NodeJS.Timeout | undefined;
    if (notVipVisible) {
      setVipTypedText("");
      let i = 0;
      id = setInterval(() => {
        i++;
        setVipTypedText(VIP_SPEECH.slice(0, i));
        if (i >= VIP_SPEECH.length) clearInterval(id);
      }, 25);
    } else {
      setVipTypedText("");
    }
    return () => id && clearInterval(id);
  }, [notVipVisible]);
  
  

  const startVipAuth = () => {
    setAuthFlow('vipGate');
    setShowPopupRules(false);     
    setTimeout(() => setShowAuth(true), 0);
  };
  

  const handleSignUpOrIn = async () => {
    setLoadingAuth(true);
    setAuthError(false);
    setAuthErrorMsg("");
    try {
      // Trim inputs to avoid accidental spaces
      const uname = username.trim();
      const pwd = password;
      if (!uname || !pwd) {
        setLoadingAuth(false);
        setAuthError(true);
        const title = !uname && !pwd ? "Missing Email & Password"
          : !uname ? "Missing Email/Username"
          : "Missing Password";
        const message = !uname && !pwd
          ? "Please enter your email/username and password."
          : !uname
          ? "Please enter your email/username."
          : "Please enter your password.";
        setAuthErrorMsg(message);
        Alert.alert(title, message);
        return;
      }
  
      const res = firstTime
        ? await signUp(uname, pwd)
        : await login(uname, pwd);
  
      // Support either UserCredential or User
      const firebaseUser =
        (res && (res as any).user) ? (res as any).user : (res as any);
  
      const uid: string | undefined = firebaseUser?.uid;
      if (!uid) {
        // If your service returns void/null on failure, make it an explicit error
        throw { code: "auth/no-user-uid" };
      }
  
      // Fetch VIP status
      const ref = doc(firestore, "users", uid);
      const snap = await getDoc(ref);
      const vipNow = Boolean(snap.data()?.isVip);
  
      setShowAuth(false);
  
      // Gate on bar open or VIP
      if (!isBarOpenNow() && !vipNow) {
        setNotVipVisible(true);
        return;
      }
  
      router.replace("/entranceAnimation");
    } catch (err: any) {
      console.error("Auth error:", err?.code, err?.message || err);
      const { title, message, code } = mapFirebaseAuthError(err);
      setAuthError(true);
      setAuthErrorMsg(message);

   // Helpful branching flows
   if (code === "auth/email-already-in-use" && firstTime) {
     Alert.alert(title, message, [
       { text: "Cancel", style: "cancel" },
       { text: "Switch to Sign In", onPress: () => setFirstTime(false) },
     ]);
   } else if (code === "auth/user-not-found" && !firstTime) {
     Alert.alert(title, "No account with that email. Want to sign up?", [
       { text: "Cancel", style: "cancel" },
       { text: "Sign Up", onPress: () => setFirstTime(true) },
    ]);
   } else {
     Alert.alert(title, message);
   }
    } finally {
      setLoadingAuth(false);
    }
};

  async function handleReturningGoIn() {
    setLoadingAuth(true);
    setAuthError(false);
      setAuthErrorMsg("");
      try {
        if (!IDENT || !pwd1) {
          setAuthError(true);
          setAuthErrorMsg("Please fill everything.");
          return;
      }
        const res = await login(IDENT, pwd1);
        const user = (res as any)?.user ?? res;
        if (!user?.uid) throw { code: "auth/no-user-uid" };
  
        setShowAuth(false);
        // keep your existing bar-open/VIP gating
        if (!isBarOpenNow() && !isVip) {
          setNotVipVisible(true);
          return;
        }
        router.replace("/entranceAnimation");
      } catch (err: any) {
        const { title, message } = mapFirebaseAuthError(err);
        setAuthError(true);
        setAuthErrorMsg(message);
        Alert.alert(title, message);
      } finally {
        setLoadingAuth(false);
      }
    }
  
    async function handleNewGoIn() {
      // step 4 gate
      if (!agreeLegal || !agree21) {
        setLegalError(true);
        return;
      }
      setLegalError(false);
  
    setLoadingAuth(true);
      setAuthError(false);
      setAuthErrorMsg("");
      try {
        if (!IDENT || !pwd1) {
          setAuthError(true);
          setAuthErrorMsg("Please fill everything.");
        return;
      }
        if (pwd1.length < 6) {
          setAuthError(true);
          setAuthErrorMsg("Password must be at least 6 characters.");
          return;
      }
        if (pwd1 !== pwd2) {
          setAuthError(true);
          setAuthErrorMsg("Passwords do not match.");
          return;
        }
        const res = await signUp(IDENT, pwd1);
        const user = (res as any)?.user ?? res;
        if (!user?.uid) throw { code: "auth/no-user-uid" };
  
        setShowAuth(false);
        // keep your existing gating/animation
        if (!isBarOpenNow() && !isVip) {
          setNotVipVisible(true);
          return;
        }
        router.replace("/entranceAnimation"); //entrance anim
      } catch (err: any) {
        const { title, message } = mapFirebaseAuthError(err);
        setAuthError(true);
        setAuthErrorMsg(message);
        Alert.alert(title, message);
      } finally {
        setLoadingAuth(false);
      }
    }

    function chooseMethod(m: AuthMethod) {
      setAuthMethod(m);
      // Skip step 2 for socials (you’ll plug real OAuth later)
      if (m === "google" || m === "meta" || m === "apple") {
        // For now: just show a toast and stay on step 1 so you can implement later
        Alert.alert("Coming soon", "Social sign-in is coming soon. Use Email or Username today.");
        return;
        // If you wire OAuth, you'd do: setAuthStep(newAccount ? 4 : 3);
      }
      setAuthStep(2);
    }
    

  async function becomeVipNow() {
    const u = auth.currentUser;
    if (!u) {
      // show login
      setShowAuth(true);
      return;
    }
    const ref = doc(firestore, "users", u.uid);
  
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        // preserve all other fields; only flip VIP
        await updateDoc(ref, {
          isVip: true,
          vipSince: serverTimestamp(),
        });
      } else {
        // create WITHOUT touching moneys; use merge to avoid future conflicts
        await setDoc(
          ref,
          { isVip: true, vipSince: serverTimestamp() },
          { merge: true }
        );
      }
  
      // instant UI feedback (your onSnapshot will also update shortly)
      setIsVip(true);
      setShowNotVipPopup(false);
      setShowVipCongrats(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } catch (e: any) {
      console.error("becomeVipNow failed:", e.code, e.message);
      // optionally show an error popup
    }
  }
  
  const closeCongratsAndEnter = () => {
    setShowVipCongrats(false);
    setShowConfetti(false);
    router.replace('/entranceAnimation');
  };
  
  

  const handleEntrancePress = () => {
    const user = auth.currentUser;
    if (isBarOpen) {
      if (user) {
        router.replace("/entranceAnimation"); //entrance anim
      } else {
        setShowAuth(true);
      }
    } else {
      setShowPopupRules(true);
    }
  };
  

  const onPlaybackStatusUpdate = (status: any) => {
    if (!hasStartedRef.current && status.positionMillis > 100) {
      hasStartedRef.current = true;
    }
    if (hasStartedRef.current && status.didJustFinish) {
      router.replace("/entranceAnimation");
    }
  };

  const BORDER_PX = 8;


  // WAIT FOR FONTS
  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <LottieView
                source={withoutBg}
                autoPlay
                loop
                style={{ width: 600, height: 600, backgroundColor: "transparent" }}
               />
      </View>
    );
  }

  //  MAIN + AUTH SHEET
  return (
   

   
    <View style={styles.container}>
      {/* — Main entrance screen — */}
      <ImageBackground
        source={require("../assets/images/entrance.png")}
        style={styles.background}
        resizeMode="stretch"
      >
        <Image
          source={require("../assets/images/entrance-sign.png")}
          style={styles.entranceSign}
          resizeMode="contain"
        />

        <View style={styles.bannerContainer}>
          <ImageBackground
            source={require("../assets/images/led-banner.png")}
            style={styles.bannerBackground}
            resizeMode="stretch"
          >
            <View style={[styles.bannerMask, {
              left: BORDER_PX,
              right: BORDER_PX,
            }]}>
             
                <Animated.Text
                  onLayout={e => setTextWidth(e.nativeEvent.layout.width)}
                  style={[styles.bannerText, { transform: [{ translateX: scrollX }] }]}
                  numberOfLines={1}
                >
                  {MESSAGE}
                </Animated.Text>
          
              
            </View>
          </ImageBackground>
        </View>

        <TouchableOpacity
          onPress={handleEntrancePress}
          style={styles.doorTouchable}
          activeOpacity={0.8}
        >
          <Image
            source={signSrc}
            style={styles.doorSign}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleEntrancePress}
          style={styles.pressable}
          activeOpacity={0.8}
        />

      </ImageBackground>

      {/* — Auth sheet on top, transparent so you can still see the entrance behind it — */}
      <Modal 
            visible={showAuth} 
            transparent 
            animationType="slide"
            onDismiss={() => setPlayAnimation(true)}
            onRequestClose={() => setPlayAnimation(true)}
      >
        <View style={authStyles.modalOverlay}>
        <ImageBackground
          source={CLIPBOARD_IMG}
          style={authStyles.clipboard}
          resizeMode="contain"
        >
            {/* White paper bounds */}
            <View style={authStyles.paperBox}>
              {/* Close (X) pinned to sheet corner */}
              <TouchableOpacity
                style={authStyles.closeButton}
                onPress={() => setShowAuth(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Image source={closeIcon} style={authStyles.closeIcon} />
              </TouchableOpacity>

              {/* Scrollable sheet content (never spills outside white area) */}
              <Animated.ScrollView
                contentContainerStyle={authStyles.sheetContent}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
              >
                {/* ==== your existing content from <Text style={authStyles.title}> ... to the end of step 4 ==== */}
                {/* Title switches by step */}
                <Text 
                  style={authStyles.title}
                  numberOfLines={1}
                  adjustsFontSizeToFit        // shrink to fit the width
                  minimumFontScale={0.85}     // don’t shrink smaller than 85%
                  allowFontScaling={false}    // ignore OS text scaling
                  maxFontSizeMultiplier={1}   // belt & suspenders
                  ellipsizeMode="clip"
                >
                  {authStep === 1 && (newAccount ? "Create your account" : "Welcome back")}
                  {authStep === 2 && (authMethod === "email" ? "Your Email" : "Your Username")}
                  {authStep === 3 && (newAccount ? "Create a password" : "Enter your password")}
                  {authStep === 4 && "One last thing…"}
                </Text>

                {/* STEP 1 — Choose path */}
                {authStep === 1 && (
                  <>
                    <Text style={authStyles.subtitle} maxFontSizeMultiplier={1.1}>Continue with socials</Text>
                    <View style={authStyles.socialRow}>
                      <TouchableOpacity style={authStyles.socialBtn} onPress={() => chooseMethod("google")}>
                        <AntDesign name="google" size={28} color="#DB4437" />
                      </TouchableOpacity>
                      <TouchableOpacity style={authStyles.socialBtn} onPress={() => chooseMethod("meta")}>
                        <FontAwesome name="facebook-square" size={28} color="#1877F2" />
                      </TouchableOpacity>
                      <TouchableOpacity style={authStyles.socialBtn} onPress={() => chooseMethod("apple")}>
                        <Ionicons name="logo-apple" size={30} color="#000" />
                      </TouchableOpacity>
                    </View>

                    <Text style={authStyles.orText} maxFontSizeMultiplier={1.1}>or</Text>

                    <View style={{ gap: 10, width: "100%", alignItems: "center" }}>
                      <TouchableOpacity style={authStyles.primaryBtn} onPress={() => chooseMethod("email")}>
                        <Text style={authStyles.primaryBtnText} maxFontSizeMultiplier={1.1}>Use Email</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={authStyles.secondaryBtn} onPress={() => chooseMethod("username")}>
                        <Text style={authStyles.secondaryBtnText} maxFontSizeMultiplier={1.1}>Use Username</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={authStyles.modeRow}>
                      <Text style={authStyles.modeText} maxFontSizeMultiplier={1.1}>
                        {newAccount ? "Already have an account?" : "New here?"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => { setNewAccount(!newAccount); setFirstTime(!newAccount); }}
                      >
                        <Text style={authStyles.modeLink} maxFontSizeMultiplier={1.1}>
                          {newAccount ? "Sign in" : "Create account"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* STEP 2 — Identifier */}
                {authStep === 2 && (
                  <>
                    {authMethod === "email" ? (
                      <TextInput
                        style={authStyles.input}
                        placeholder="Email address"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={emailAddr}
                        onChangeText={setEmailAddr}
                        editable={!loadingAuth}
                      />
                    ) : (
                      <TextInput
                        style={authStyles.input}
                        placeholder="Username"
                        placeholderTextColor="#999"
                        autoCapitalize="none"
                        value={userHandle}
                        onChangeText={setUserHandle}
                        editable={!loadingAuth}
                      />
                    )}

                    {authError ? <Text style={authStyles.error} maxFontSizeMultiplier={1.1}>{authErrorMsg}</Text> : null}

                    <View style={authStyles.navRow}>
                      <TouchableOpacity onPress={() => setAuthStep(1)}>
                        <Text style={authStyles.navLink} maxFontSizeMultiplier={1.1}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[authStyles.primaryBtn, { opacity: IDENT ? 1 : 0.6 }]}
                        disabled={!IDENT || loadingAuth}
                        onPress={() => setAuthStep(3)}
                      >
                        <Text style={authStyles.primaryBtnText} maxFontSizeMultiplier={1.1}>Continue</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* STEP 3 — Password (create or enter) */}
                {authStep === 3 && (
                  <>
                    {!!IDENT && (
                      <View style={authStyles.staticInput}>
                        <Text style={authStyles.staticInputText} maxFontSizeMultiplier={1.1}>{IDENT}</Text>
                      </View>
                    )}

                    {newAccount ? (
                      <>
                        <TextInput
                          style={authStyles.input}
                          placeholder="Create password"
                          placeholderTextColor="#999"
                          secureTextEntry
                          value={pwd1}
                          onChangeText={setPwd1}
                          editable={!loadingAuth}
                        />
                        <TextInput
                          style={authStyles.input}
                          placeholder="Confirm password"
                          placeholderTextColor="#999"
                          secureTextEntry
                          value={pwd2}
                          onChangeText={setPwd2}
                          editable={!loadingAuth}
                        />
                        {authError ? <Text style={authStyles.error} maxFontSizeMultiplier={1.1}>{authErrorMsg}</Text> : null}
                        <View style={authStyles.navRow}>
                          <TouchableOpacity onPress={() => setAuthStep(2)}>
                            <Text style={authStyles.navLink} maxFontSizeMultiplier={1.1}>Back</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[authStyles.primaryBtn, { opacity: pwd1 && pwd2 ? 1 : 0.6 }]}
                            disabled={!pwd1 || !pwd2 || loadingAuth}
                            onPress={() => setAuthStep(4)}
                          >
                            <Text style={authStyles.primaryBtnText} maxFontSizeMultiplier={1.1}>Continue</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <TextInput
                          style={authStyles.input}
                          placeholder="Password"
                          placeholderTextColor="#999"
                          secureTextEntry
                          value={pwd1}
                          onChangeText={setPwd1}
                          editable={!loadingAuth}
                        />
                        {authError ? <Text style={authStyles.error} maxFontSizeMultiplier={1.1}>{authErrorMsg}</Text> : null}
                        <View style={authStyles.navRow}>
                          <TouchableOpacity onPress={() => setAuthStep(2)}>
                            <Text style={authStyles.navLink} maxFontSizeMultiplier={1.1}>Back</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[authStyles.primaryBtn, { opacity: pwd1 ? 1 : 0.6 }]}
                            disabled={!pwd1 || loadingAuth}
                            onPress={handleReturningGoIn}
                          >
                            {loadingAuth ? (
                              <LottieView source={withoutBg} autoPlay loop style={{ width: 80, height: 80, backgroundColor: "transparent" }} />
                            ) : (
                              <Text style={authStyles.primaryBtnText} maxFontSizeMultiplier={1.1}>GO IN!</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                )}

                {/* STEP 4 — Legal */}
                {authStep === 4 && (
                  <>
                    <View style={authStyles.checkboxRow}>
                      <TouchableOpacity
                        style={[authStyles.checkbox, agreeLegal && authStyles.checkboxChecked]}
                        onPress={() => setAgreeLegal(v => !v)}
                      >
                        {agreeLegal ? <Text style={authStyles.checkmark}>✓</Text> : null}
                      </TouchableOpacity>
                      <Text style={authStyles.legalText} maxFontSizeMultiplier={1.1}>
                        I have read and agree to the{" "}
                        <Text style={authStyles.link} onPress={() => Linking.openURL(termsUrl)}>Terms & Conditions</Text>
                        {" "}and{" "}
                        <Text style={authStyles.link} onPress={() => Linking.openURL(termsUrl)}>Privacy Policy</Text>.
                      </Text>
                    </View>

                    <View style={authStyles.checkboxRow}>
                      <TouchableOpacity
                        style={[authStyles.checkbox, agree21 && authStyles.checkboxChecked]}
                        onPress={() => setAgree21(v => !v)}
                      >
                        {agree21 ? <Text style={authStyles.checkmark}>✓</Text> : null}
                      </TouchableOpacity>
                      <Text style={authStyles.legalText} maxFontSizeMultiplier={1.1}>I confirm that I am at least 21 years old.</Text>
                    </View>

                    {legalError && (
                      <Text style={authStyles.legalError} maxFontSizeMultiplier={1.1}>You have to agree to the legal stuff first.</Text>
                    )}
                    {authError ? <Text style={authStyles.error} maxFontSizeMultiplier={1.1}>{authErrorMsg}</Text> : null}

                    <View style={authStyles.navRow}>
                      <TouchableOpacity onPress={() => setAuthStep(3)}>
                        <Text style={authStyles.navLink} maxFontSizeMultiplier={1.1}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={authStyles.primaryBtn}
                        onPress={handleNewGoIn}
                        disabled={loadingAuth}
                      >
                        {loadingAuth ? (
                          <LottieView source={withoutBg} autoPlay loop style={{ width: 80, height: 80, backgroundColor: "transparent" }} />
                        ) : (
                          <Text style={authStyles.primaryBtnText} maxFontSizeMultiplier={1.1}>GO IN!</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                {/* ==== end content ==== */}
              </Animated.ScrollView>
            </View>
          </ImageBackground>

        </View>
      </Modal>
  {/* — Bar Rules popup when closed — */}
      <PopUp
          visible={showPopupRules}
          title="Bar Rules"
          onClose={() => setShowPopupRules(false)}
        >
        <View style={styles.rulesContainer}>
          <View style={styles.hoursContainer}>
            <Text style={styles.hoursText}>Opening Hours:{"\n"}</Text>
            <Text style={styles.hours}>17:00–05:00</Text>
          </View>
      
          <View style={styles.hoursContainer}>
            <Text style={styles.hoursText}>Happy Hour:{"\n"}</Text>
            <Text style={styles.hours}>17:00–21:00</Text>
          </View> 
      
          <View style={styles.hoursContainer}>
            <View style={styles.vipContainer}>
            <Text style={styles.vipText}>VIP</Text>
            <Text style={styles.hoursText}>Opening Hours:{"\n"}</Text>
            </View>
           
            <Text style={styles.hours}>All Day Erry Day</Text>
          </View>
      
          <Text style={styles.ruleText}>No Nude Pics</Text>
          <Text style={[styles.hoursText, {marginBottom: 20}]}>No Links Allowed</Text>
          <Text style={styles.ruleText}>Age 21 and Up</Text>
          <TouchableOpacity
            style={styles.vipCta}
            onPress={startVipAuth}   
          >
            <Text style={styles.vipCtaText}>I'm a VIP, let me in</Text>
          </TouchableOpacity>
        </View>
      </PopUp>
      {/* Not VIP popup (Mr Mingles) */}
      {/* Mr. Mingles VIP Upsell (bathroom-style) */}
      <Modal transparent visible={notVipVisible} animationType="fade">
        <View style={mmStyles.modalOverlay}>
        <TouchableOpacity
          style={mmStyles.closeButton}
          onPress={() => setNotVipVisible(false)}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require("../assets/images/x.png")}
            style={mmStyles.closeIcon}
          />
        </TouchableOpacity>


          <View style={mmStyles.modalContainer}>
            {/* Mingles speech (typewriter) */}
            <Text style={mmStyles.modalText}>{vipTypedText}</Text>

            {/* Triangle pointer */}
            <View style={mmStyles.triangleContainer}>
              <View style={mmStyles.outerTriangle} />
              <View style={mmStyles.innerTriangle} />
            </View>

            {/* Animated Mr. Mingles */}
            <Animated.Image
              source={require("../assets/images/mr-mingles.png")}
              style={[mmStyles.mrMingles, { transform: [{ translateX: vipRollAnim }] }]}
              resizeMode="contain"
            />

            {/* Actions */}
            <View style={mmStyles.ctaRow}>
            <TouchableOpacity
              style={mmStyles.vipBtn}
              onPress={async () => {
                try {
                  const u = auth.currentUser;
                  if (!u) {
                    setNotVipVisible(false);
                    setShowAuth(true);
                    return;
                  }

                  await updateDoc(doc(firestore, USERS_COLLECTION, u.uid), {
                    isVip: true,
                  });

                  // Close the upsell, then show confetti + congrats modal
                  setNotVipVisible(false);
                  setShowConfetti(true);
                  setShowVipCongrats(true);    // we'll use this to show a Mingles-style congrats modal
                  setIsVip(true);
                } catch (e) {
                  console.error("VIP upgrade failed:", e);
                }
              }}
            >
              <Text style={mmStyles.vipBtnText}>Become a VIP</Text>
            </TouchableOpacity>

              <TouchableOpacity
                style={mmStyles.laterBtn}
                onPress={() => setNotVipVisible(false)}
              >
                <Text style={mmStyles.laterBtnText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VIP Congrats (Mr. Mingles style) */}
      <Modal transparent visible={showVipCongrats} animationType="fade">
        <View style={mmStyles.modalOverlay}>
          {/* Optional X to close if you want */}
          {/* <TouchableOpacity style={mmStyles.closeButton} onPress={() => setShowVipCongrats(false)}>
            <Image source={require("../assets/images/x.png")} style={styles.closeIcon} />
          </TouchableOpacity> */}

          <View style={mmStyles.modalContainer}>
            <Text style={mmStyles.modalText}>Congrats! You are now a VIP!</Text>

            {/* Triangle pointer (keeps the same look) */}
            <View style={mmStyles.triangleContainer}>
              <View style={mmStyles.outerTriangle} />
              <View style={mmStyles.innerTriangle} />
            </View>

            {/* Mr. Mingles image (static is fine here) */}
            <Image
              source={require("../assets/images/mr-mingles.png")}
              style={mmStyles.mrMingles}
              resizeMode="contain"
            />

            {/* Big Enter button */}
            <TouchableOpacity
              style={[mmStyles.vipBtn, { position: "absolute", bottom: 16, alignSelf: "center" }]}
              onPress={() => {
                setShowVipCongrats(false);
                setShowConfetti(false);
                router.replace("/entranceAnimation");
              }}
            >
              <Text style={mmStyles.vipBtnText}>Enter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showConfetti && (
      <ConfettiCannon
        count={150}
        origin={{ x: width / 2, y: -10 }}
        fadeOut
        onAnimationEnd={() => setShowConfetti(false)}
      />
    )}

    </View>

    );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  loading:      { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  background:   { width, height: "100%", alignItems: "center" },
  entranceSign: { position: "absolute", top: "-8%", width: width * 0.55, height: height * 0.55 },
  bannerContainer:  { position: "absolute", top: height * 0.30, width: width * 0.9, height: height * 0.07 },
  bannerBackground: { flex: 1, justifyContent: "center" },
  bannerMask:       { position: "absolute", top: height * 0.012, bottom: 0, overflow: "hidden" },
  bannerText:       { fontFamily: FontNames.ArcadePixelRegular, fontSize: 32, lineHeight: 32, color: "red" },
  doorTouchable:    { position: "absolute", top: "50%", width: width * 0.9, height: height * 0.2, alignSelf: "center" },
  doorSign:         { width: "100%", height: "100%" },
  pressable: { height: height * 0.69, width: width * 0.7, position: "absolute", top: height * 0.31},
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: 'black',
  },
  rulesContainer: {
    marginTop: 8,
   alignSelf: "center"
  },
  hoursContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 24,
    color: "#d8bfd8",
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
    marginBottom: -35
  },
  hours: {
    fontSize: 26,
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratExtraLightItalic,
    textAlign: "center",
    marginBottom: 20
  },
  vipContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  vipText: {
    color: "red",          // highlight VIP in red
    fontSize: 26,
    fontFamily: FontNames.MontserratBold,
    marginRight: 6,
    marginBottom: 5
  },
  ruleText: {
    fontSize: 26,
    color: "#e78bbb",
    textAlign: "center",
    marginBottom: 10
  },
  vipButton: {
    marginTop: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e2a350',
    alignSelf: "center",
    width: 140,
    boxShadow: "5px 9px 0px rgba(0,0,0,.3)", 
  },
  vipButtonText: {
    fontSize: 16,
    color: '#460b2a',
    fontFamily: FontNames.MontserratBold,
    textAlign: "center"
  },
  minglesBody: {
    fontSize: 18,
    color: '#ffe3d0',
    textAlign: 'center',
    fontFamily: FontNames.MontserratRegular,
    marginHorizontal: 10,
  },
  vipCtaButton: {
    backgroundColor: '#ffcf33',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  vipCtaButtonText: {
    fontSize: 16,
    color: '#460b2a',
    fontFamily: FontNames.MontserratBold,
    textAlign: "center"
  },
  closeLink: {
    color: '#d8bfd8',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  congratsBody: {
    fontSize: 18,
    color: '#ffe3d0',
    textAlign: 'center',
    fontFamily: FontNames.MontserratRegular,
  },
  congratsBodySmall: {
    fontSize: 14,
    color: '#d8bfd8',
    textAlign: 'center',
    fontFamily: FontNames.MontserratRegular,
  },
  vipCta: {
    marginTop: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e2a350',
    alignSelf: "center",
    width: 140,
    boxShadow: "5px 9px 0px rgba(0,0,0,.3)",
  },
  vipCtaText: {
    color: "#592540",
    fontFamily: FontNames.MontserratBold,
    fontSize: 14,
    textAlign: "center",
  },
});

const CLOSE_ICON_PX = Math.max(18, Math.min(30, Math.round(width * 0.05)));
const authStyles = StyleSheet.create({
  
  modalOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center", height },
  // dynamic size for the X icon


  clipboard: {
    width: Math.min(width * 0.9, 420),
    aspectRatio: CLIPBOARD_AR,   // <-- gives it a proper height
    // height: undefined,        // (implicit with aspectRatio)
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  
paperBox: {
  position: "absolute",
  left: "12%",
  right: "12%",
  top: "18%",
  bottom: "2%",
  borderRadius: 10,
  overflow: "hidden",
},
  sheet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,              // <-- key: fills available height then scrolls if needed
    alignItems: "center",
  },
  
  
  title: {
    fontFamily: FontNames.MontserratBold,
    fontSize: 25,          // starting size (will shrink if needed)
    lineHeight: 30,        // keep steady vertical rhythm
    includeFontPadding: false, // Android consistency
    textAlign: "center",
    alignSelf: "stretch",
    marginTop: "5%"
  },
  input: {
    width: "100%",
    borderBottomWidth: 1,
    borderColor: "#000",
    marginVertical: 8,
    fontSize: 18,
    padding: 5,
    color: "#000",
  },
  button:         { width: 200, height: 60, backgroundColor: "#610e14", borderWidth: 5, borderColor: "#4a0a0f", borderRadius: 30, alignItems: "center", justifyContent: "center", marginTop: 10 },
  buttonText:     { fontSize: 32, color: "#fff", fontFamily: FontNames.MontserratRegular },
  bottomRow:      { flexDirection: "row", alignItems: "center", marginTop: 15 },
  checkbox:       { width: 25, height: 25, borderWidth: 3, borderColor: "#000", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkmark:      { fontSize: 20, color: "#000", fontFamily: FontNames.MontserratBold },
  checkboxLabel:  { fontSize: 16, fontFamily: FontNames.MontserratRegular, color: "#000" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  closeButton: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  
  closeIcon: {
    width: CLOSE_ICON_PX,
    height: CLOSE_ICON_PX,
    tintColor: "black",
  },
  legalWrap: { width: "100%", marginTop: 4, marginBottom: 6 },
  legalRow: { flexDirection: "row", alignItems: "center" },
  legalText: { flex: 1, color: "#000", fontFamily: FontNames.MontserratRegular, fontSize: 14 },
  link: { color: "#2563eb", textDecorationLine: "underline" },
  legalError: {
    marginTop: 6,
    color: "red",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
  },
  socialWrap: { width: "100%", marginTop: 10, gap: 8 },
  socialText: { color: "#000", fontFamily: FontNames.MontserratBold, fontSize: 14 },
  google: {},
  meta: {},
  apple: {},

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  divider: { flex: 1, height: 1, backgroundColor: "#000" },
  dividerText: { color: "#000", fontFamily: FontNames.MontserratRegular, fontSize: 12, marginTop: -2 },

  sectionTitle: { color: "#000", fontFamily: FontNames.MontserratBold, fontSize: 16, marginTop: 4 },
  checkboxChecked: { backgroundColor: "#d1fae5" },
  subtitle:       { fontSize: 16, color: "#333", marginTop: 2, marginBottom: 10, fontFamily: FontNames.MontserratRegular },
  socialRow:      { flexDirection: "row", gap: 12, marginBottom: 8 },
  socialBtn:      { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000" },
  orText:         { marginVertical: 8, color: "#444", fontFamily: FontNames.MontserratRegular },
  primaryBtn:     { minWidth: width * 0.4, height: 48, backgroundColor: "#610e14", borderWidth: 4, borderColor: "#4a0a0f", borderRadius: 24, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: FontNames.MontserratBold },
  secondaryBtn:   { minWidth: 200, height: 48, borderWidth: 2, borderColor: "#000", borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.85)" },
  secondaryBtnText:{ color: "#000", fontSize: 16, fontFamily: FontNames.MontserratRegular },
  modeRow:        { flexDirection: "row", gap: 6, marginTop: 12, alignItems: "center" },
  modeText:       { color: "#000", fontFamily: FontNames.MontserratRegular },
  modeLink:       { color: "#610e14", fontFamily: FontNames.MontserratBold, textDecorationLine: "underline" },
  staticInput:    { width: width * 0.6, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#000", marginBottom: 6 },
  staticInputText:{ fontSize: 16, color: "#000", fontFamily: FontNames.MontserratRegular },
  error:          { color: "red", marginTop: 5 },
  navRow:         { width: "100%", marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  navLink:        { color: "#610e14", fontFamily: FontNames.MontserratBold, textDecorationLine: "underline" },
  checkboxRow:    { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10, paddingHorizontal: 4 },
});

const mmStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: height * 0.05,
    right: width * 0.05,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: "#fff",
  },
  
  
  modalContainer: {
    width: "90%",
    height: height * 0.45,
    backgroundColor: "#020621",
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  modalText: {
    color: "#eceded",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 16,
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
  mrMingles: {
    width: 320,
    height: 380,
    position: "absolute",
    bottom: -330,
    right: -120,
    zIndex: 100,
  },
  ctaRow: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 12,
  },
  vipBtn: {
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
  },
  vipBtnText: {
    fontSize: 16,
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratBold,
    textTransform: "uppercase",
    textAlign: "center",
  },
  laterBtn: {
    borderWidth: 2,
    borderColor: "#ffe3d0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: "center",
  },
  laterBtnText: {
    fontSize: 14,
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
  },
});

