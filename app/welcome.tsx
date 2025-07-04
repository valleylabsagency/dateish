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

  // state
  const [showAuth,    setShowAuth]    = useState(false);
  const [showAnim,    setShowAnim]    = useState(false);
  const [user,        setUser]        = useState("");
  const [pass,        setPass]        = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authErr,     setAuthErr]     = useState(false);

  // marquee
  const [txtW, setTxtW] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // fonts
  const [fontsLoaded] = useFonts({
    ArcadePixel: require("../assets/fonts/ArcadePixel-Regular.otf"),
    [FontNames.MontserratBold]:    require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  // marquee loop
  useEffect(() => {
    if (!txtW) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollX, {
          toValue: -txtW,
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
  }, [scrollX, txtW]);

  if (!fontsLoaded) return null;

  // when auth succeeds
  const submitAuth = async () => {
    setLoadingAuth(true);
    setAuthErr(false);
    try {
      if (firstTime) {
        await signUp(user, pass);
      } else {
        await login(user, pass);
      }
      setShowAuth(false);
      setShowAnim(true);
    } catch {
      setAuthErr(true);
    } finally {
      setLoadingAuth(false);
    }
  };

  // when video ends
  const onVideoStatus = (status: any) => {
    if (status.didJustFinish) router.replace("/bar-2");
  };

  return (
    <View style={styles.container}>
      {/* 1) Video overlay */}
      {showAnim && (
        <Video
          source={require("../assets/images/entrance-animation.mp4")}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={onVideoStatus}
        />
      )}

      {/* 2) Main entrance UI (still in tree even when showAnim, but video covers it) */}
      <ImageBackground
        source={require("../assets/images/entrance.png")}
        style={styles.background}
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
            <View style={styles.bannerMask}>
              <Animated.View
                onLayout={e => setTxtW(e.nativeEvent.layout.width)}
                style={{ transform: [{ translateX: scrollX }] }}
              >
                <Text style={styles.bannerText} numberOfLines={1}>
                  {MESSAGE.repeat(3) + "   "}
                </Text>
              </Animated.View>
            </View>
          </ImageBackground>
        </View>

        <TouchableOpacity
          onPress={() => setShowAuth(true)}
          activeOpacity={0.8}
        >
          <Image
            source={require("../assets/images/open-sign.png")}
            style={styles.doorSign}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ImageBackground>

      {/* 3) Auth modal */}
      <Modal visible={showAuth} animationType="slide" transparent>
        <View style={authStyles.modalOverlay}>
          <ImageBackground
            source={require("../assets/images/clipboard.png")}
            style={authStyles.clipboard}
            resizeMode="contain"
          >
            <View style={authStyles.sheet}>
              <Text style={authStyles.title}>
                {firstTime ? "Sign Up" : "Sign In"}
              </Text>
              <TextInput
                style={authStyles.input}
                placeholder="Username"
                placeholderTextColor="#999"
                value={user}
                onChangeText={setUser}
                autoCapitalize="none"
              />
              <TextInput
                style={authStyles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                value={pass}
                onChangeText={setPass}
              />
              {authErr && (
                <Text style={authStyles.error}>Authentication failed</Text>
              )}
              <TouchableOpacity
                style={authStyles.button}
                onPress={submitAuth}
              >
                {loadingAuth ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={authStyles.buttonText}>GO IN!</Text>
                )}
              </TouchableOpacity>
              <View style={authStyles.bottomRow}>
                <TouchableOpacity
                  onPress={() => setFirstTime(!firstTime)}
                  style={authStyles.checkbox}
                >
                  {firstTime && <Text style={authStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={authStyles.checkboxLabel}>
                  It's my first time here
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
  },
  entranceSign: {
    position: "absolute",
    top: "-17%",
    width: width * 0.5,
    height: height * 0.5,
  },
  bannerContainer: {
    position: "absolute",
    top: height * 0.19,
    width: width * 0.8,
    height: height * 0.07,
  },
  bannerBackground: { flex: 1, justifyContent: "center" },
  bannerMask: { overflow: "hidden", width: "100%" },
  bannerText: {
    fontFamily: "ArcadePixel",
    fontSize: 32,
    color: "red",
    fontWeight: "bold",
  },
  doorSign: {
    position: "absolute",
    top: height * 0.435,
    width: width * 0.9,
    height: height * 0.2,
    alignSelf: "center",
  },
});

const authStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  clipboard: {
    width: width * 0.9,
    height: height * 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: 320,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 27,
    fontFamily: FontNames.MontserratBold,
    marginBottom: 12,
  },
  input: {
    width: "100%",
    borderBottomWidth: 1,
    borderColor: "#000",
    marginVertical: 8,
    fontSize: 18,
    fontFamily: FontNames.MontserratRegular,
    padding: 5,
    color: "#000",
  },
  error: { color: "red", marginTop: 5 },
  button: {
    width: 200,
    height: 60,
    backgroundColor: "#610e14",
    borderWidth: 5,
    borderColor: "#4a0a0f",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: {
    fontSize: 32,
    color: "#fff",
    fontFamily: FontNames.MontserratRegular,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 3,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkmark: {
    fontSize: 20,
    color: "#000",
    fontFamily: FontNames.MontserratBold,
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: FontNames.MontserratRegular,
    color: "#000",
  },
});
