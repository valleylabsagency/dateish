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

import { auth } from "../firebase";

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

  const [textWidth, setTextWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(width)).current;
  const videoRef = useRef<Video>(null);
  const hasStartedRef = useRef(false);
  const [isBarOpen, setIsBarOpen] = useState<boolean>(isBarOpenNow());
  const [showPopupRules, setShowPopupRules] = useState(false);

  const signSrc = isBarOpen
  ? require("../assets/images/open-sign.png")
  : require("../assets/images/closed-sign.png");


  

  const [fontsLoaded] = useFonts({
    [FontNames.ArcadePixelRegular]: require("../assets/fonts/ArcadePixel-Regular.otf"),
    [FontNames.MontserratBold]:     require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratRegular]:  require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratExtraLightItalic]: require("../assets/fonts/Montserrat-ExtraLightItalic.ttf"), 
  });
  

  useEffect(() => {
    // set immediately
    setIsBarOpen(isBarOpenNow());
    // refresh every minute
    const id = setInterval(() => setIsBarOpen(isBarOpenNow()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  const handleSignUpOrIn = async () => {
    setLoadingAuth(true);
    setAuthError(false);
    try {
      if (firstTime) await signUp(username, password);
      else          await login(username, password);
      setShowAuth(false);
      router.replace('/entranceAnimation') //replace with entrance animation
    } catch {
      setAuthError(true);
    } finally {
      setLoadingAuth(false);
    }
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
        </View>
      </PopUp>
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
  }
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
