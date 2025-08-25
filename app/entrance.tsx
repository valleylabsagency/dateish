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

const { width, height } = Dimensions.get("window");
const MESSAGE = "Happy Hour daily! ";

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
  ),
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
    try {
      const user = firstTime
        ? await signUp(username, password)
        : await login(username, password);
  
      // Fetch VIP status
      const ref = doc(firestore, USERS_COLLECTION, user.uid);
      const snap = await getDoc(ref);
      const vipNow = Boolean(snap.data()?.isVip);
  
      setShowAuth(false);
  
      // If bar is closed and user isn't VIP -> show Mr. Mingles upsell
      if (!isBarOpenNow() && !vipNow) {
        setNotVipVisible(true);
        return;
      }
  
      // Otherwise proceed
      router.replace("/entranceAnimation");
    } catch {
      setAuthError(true);
    } finally {
      setLoadingAuth(false);
    }
  };

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
        router.replace("/bar-2");
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
      router.replace("/bar-2");
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
            source={require("../assets/images/clipboard.png")}
            style={authStyles.clipboard}
            resizeMode="contain"
          >
          <TouchableOpacity
             style={authStyles.closeButton}
             onPress={() => setShowAuth(false)}
           >
             <Image source={closeIcon} style={styles.closeIcon} />
           </TouchableOpacity>
            <View style={authStyles.sheet}>
              <Text style={authStyles.title}>
                {firstTime ? "Sign Up" : "Sign In"}
              </Text>
              <TextInput
                style={authStyles.input}
                placeholder="Username"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loadingAuth}
              />
              <TextInput
                style={authStyles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loadingAuth}
              />
              {authError && <Text style={authStyles.error}>Auth failed</Text>}
              <TouchableOpacity
                style={authStyles.button}
                onPress={handleSignUpOrIn}
                disabled={loadingAuth}
              >
                {loadingAuth
                  ? <LottieView
                          source={withoutBg}
                          autoPlay
                          loop
                          style={{ width: 600, height: 600, backgroundColor: "transparent" }}
                         />
                  : <Text style={authStyles.buttonText}>GO IN!</Text>
                }
              </TouchableOpacity>
              <View style={authStyles.bottomRow}>
                <TouchableOpacity
                  onPress={() => setFirstTime(!firstTime)}
                  style={authStyles.checkbox}
                  disabled={loadingAuth}
                >
                  {firstTime && <Text style={authStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={authStyles.checkboxLabel}>It's my first time here</Text>
              </View>
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
          >
            <Image source={require("../assets/images/x.png")} style={styles.closeIcon} />
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
  entranceSign: { position: "absolute", top: "-11%", width: width * 0.55, height: height * 0.55 },
  bannerContainer:  { position: "absolute", top: height * 0.27, width: width * 0.9, height: height * 0.07 },
  bannerBackground: { flex: 1, justifyContent: "center" },
  bannerMask:       { position: "absolute", top: height * 0.012, bottom: 0, overflow: "hidden" },
  bannerText:       { fontFamily: FontNames.ArcadePixelRegular, fontSize: 32, lineHeight: 32, color: "red", fontWeight: "bold" },
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

const authStyles = StyleSheet.create({
  modalOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center", height },
  clipboard:      { width: width * 0.9, height: height * 0.75, justifyContent: "center", alignItems: "center" },
  sheet:          { width: 320, padding: 20, alignItems: "center" },
  title:          { fontSize: 27, fontFamily: FontNames.MontserratBold, marginBottom: 10 },
  input:          { width: width * 0.6, borderBottomWidth: 1, borderColor: "#000", marginVertical: 8, fontSize: 18, padding: 5, color: "#000" },
  error:          { color: "red", marginTop: 5 },
  button:         { width: 200, height: 60, backgroundColor: "#610e14", borderWidth: 5, borderColor: "#4a0a0f", borderRadius: 30, alignItems: "center", justifyContent: "center", marginTop: 10 },
  buttonText:     { fontSize: 32, color: "#fff", fontFamily: FontNames.MontserratRegular },
  bottomRow:      { flexDirection: "row", alignItems: "center", marginTop: 15 },
  checkbox:       { width: 25, height: 25, borderWidth: 3, borderColor: "#000", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkmark:      { fontSize: 20, color: "#000", fontFamily: FontNames.MontserratBold },
  checkboxLabel:  { fontSize: 16, fontFamily: FontNames.MontserratRegular, color: "#000" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  closeButton: {
    position: "absolute",
    top: "25%",
    right: "12%",
    zIndex: 10,
  },
  
  closeButtonText: {
    fontSize: 32,
    color: "#000",
    fontFamily: FontNames.MontserratBold,
  },
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
    zIndex: 100,
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

