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
  ActivityIndicator,
  Modal,
} from "react-native";
import { Video } from "expo-av";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { FirstTimeContext } from "../contexts/FirstTimeContext";
import { signUp, login } from "../services/authservice";
import { FontNames } from "../constants/fonts";

const { width, height } = Dimensions.get("window");
const MESSAGE = "Happy Hour daily! ";

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

  const [fontsLoaded] = useFonts({
    ArcadePixel:               require("../assets/fonts/ArcadePixel-Regular.otf"),
    [FontNames.MontserratBold]:    require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

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
      router.replace('/entranceAnimation')
    } catch {
      setAuthError(true);
    } finally {
      setLoadingAuth(false);
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
        <ActivityIndicator size="large" color="#fff" />
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
                  {MESSAGE.repeat(3)}
                </Animated.Text>
          
              
            </View>
          </ImageBackground>
        </View>

        <TouchableOpacity
          onPress={() => setShowAuth(true)}
          style={styles.doorTouchable}
          activeOpacity={0.8}
        >
          <Image
            source={require("../assets/images/open-sign.png")}
            style={styles.doorSign}
            resizeMode="contain"
          />
        </TouchableOpacity>
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
             <Text style={authStyles.closeButtonText}>×</Text>
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
                  ? <ActivityIndicator color="#fff" />
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
            {loadingAuth && (
              <View style={authStyles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </ImageBackground>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  loading:      { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  background:   { width, height, alignItems: "center" },
  entranceSign: { position: "absolute", top: "-15%", width: width * 0.55, height: height * 0.55 },
  bannerContainer:  { position: "absolute", top: height * 0.23, width: width * 0.8, height: height * 0.07 },
  bannerBackground: { flex: 1, justifyContent: "center" },
  bannerMask:       { position: "absolute", top: "21%", bottom: 0, overflow: "hidden" },
  bannerText:       { fontFamily: "ArcadePixel", fontSize: 32, color: "red", fontWeight: "bold" },
  doorTouchable:    { position: "absolute", top: height * 0.49, width: width * 0.9, height: height * 0.2, alignSelf: "center" },
  doorSign:         { width: "100%", height: "100%" },
});

const authStyles = StyleSheet.create({
  modalOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center" },
  clipboard:      { width: width * 0.9, height: height * 0.75, justifyContent: "center", alignItems: "center" },
  sheet:          { width: 320, padding: 20, alignItems: "center" },
  title:          { fontSize: 27, fontFamily: FontNames.MontserratBold, marginBottom: 10 },
  input:          { width: "100%", borderBottomWidth: 1, borderColor: "#000", marginVertical: 8, fontSize: 18, padding: 5, color: "#000" },
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
