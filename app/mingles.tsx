// mingles.tsx
import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
  ScrollView
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { MaterialIcons } from "@expo/vector-icons";
import { ProfileContext } from "../contexts/ProfileContext";
import { NavbarContext } from '../contexts/NavbarContext';
import PopUp from "../components/PopUp";
import { verticalScale } from "react-native-size-matters";
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';
import { spendMoneys } from '../services/moneys';
import { MoneysContext } from "../contexts/MoneysContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { auth, firestore } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { Linking, Platform } from "react-native";
import { showInterstitial } from "@/services/ads";





const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18;

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
  ),
}


export default function MinglesScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });
  const { profile, saveProfile } = useContext(ProfileContext);
  const { setShowWcButton } = useContext(NavbarContext);

  const [showPopupShop, setShowPopupShop] = useState(false);
  const [showPopupRules, setShowPopupRules] = useState(false);
  const [showPopupTips, setShowPopupTips] = useState(false);
  const [popupFlag, setPopupFlag] = useState<string | null>(null);
  const [vipLoading, setVipLoading] = useState(false);


  const router = useRouter();
  const params = useLocalSearchParams<{ open?: string }>();
  

  const [showVipPopup, setShowVipPopup] = useState(false);

  const [dontPressPressed, setDontPressPressed] = useState(false);

  // rating prompts
  const [showRatePrompt, setShowRatePrompt] = useState(false);
  const [showNoThanks, setShowNoThanks] = useState(false);



  // toggles the drink‐speech bubble
  const [showDrinkSpeech, setShowDrinkSpeech] = useState(false);

  const { triggerSpend } = useContext(MoneysContext);

  useEffect(() => {
    if (params.open === "shop") {
      setPopupFlag("shop");
      setShowPopupShop(true);
    }
  }, [params.open]);
  


  useEffect(() => {
    setShowWcButton(true);
  }, [setShowWcButton]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("barVisitCount");
      const n = (raw ? parseInt(raw, 10) : 0) + 1;
      await AsyncStorage.setItem("barVisitCount", String(n));
  
      const prompted = await AsyncStorage.getItem("ratingPrompted");
      if (n === 2 && !prompted) {
        setShowRatePrompt(true);
      }
    })();
  }, []);

  const ANDROID_PKG = "com.yourapp";           // TODO: your package
const IOS_APP_ID  = "id0000000000";          // TODO: your App Store ID

async function handleRateYes() {
  setShowRatePrompt(false);
  await AsyncStorage.setItem("ratingPrompted", "1");

  // Prefer native in-app review if available
  if (await StoreReview.isAvailableAsync()) {
    StoreReview.requestReview();
    return;
  }

  const url = Platform.select({
    ios: `itms-apps://itunes.apple.com/app/${IOS_APP_ID}?action=write-review`,
    android: `market://details?id=${ANDROID_PKG}`,
  });
  if (url) Linking.openURL(url);
}

async function handleRateNo() {
  setShowRatePrompt(false);
  setShowNoThanks(true);
  await AsyncStorage.setItem("ratingPrompted", "1");
  setTimeout(async () => {
    setShowNoThanks(false);
    await showInterstitial();
  }, 3000);
}

  

  // ─── Bubble messages ─────────────────────────
  const messages = [
    "What would you like to drink?",
    "It's Happy Hour! Everything is half price!",
    "Go talk to some humans!",
  ];
  const [idx, setIdx] = useState(0);
  const back = () => setIdx(i => (i - 1 + messages.length) % messages.length);
  // cycles forward, wrapping to zero
  const cycle = () => setIdx(i => (i + 1) % messages.length);

  // ─── Drink menu modal ────────────────────────
  const [showDrinkMenu, setShowDrinkMenu] = useState(false);
  const [drinkLoading, setDrinkLoading] = useState(false);
  const drinkMapping: Record<string, any> = {
    wine: require("../assets/images/icons/wine.png"),
    beer: require("../assets/images/icons/beer.png"),
    whiskey: require("../assets/images/icons/whiskey.png"),
    martini: require("../assets/images/icons/martini.png"),
    vodka: require("../assets/images/icons/vodka.png"),
    tequila: require("../assets/images/icons/tequila.png"),
    absinthe: require("../assets/images/icons/absinthe.png"),
    water: require("../assets/images/icons/water.png"),
  };
  const handleDrinkSelect = async (drinkName: string) => {
    setDrinkLoading(true);
    try {
      await saveProfile({ drink: drinkName });
      setShowDrinkSpeech(false);
    } catch (err) {
      console.error(err);
    }
    setDrinkLoading(false);
    setShowDrinkMenu(false);
  };

  const handleTipJar = async () => {
    try {
      // Spend exactly 1 for the tip jar
      const result = await spendMoneys({ amount: 1, reason: "tip-jar" });
      triggerSpend(1);
  
      // (Optional) You can show a quick “thanks” animation here if you want
      // then show the Tips popup:
      setPopupFlag("tips");
     //setShowPopupTips(true);
    } catch (e: any) {
      console.error("Tip jar failed:", e.code, e.message);
      // If e.code === 'functions/not-found', the URL retry in the helper should have caught it;
      // If it still fails, check project/region and any App Check enforcement.
    }
  };

  // ─── Derive drink icon + text ───────────────
  const userDrink = (profile?.drink || "water").toLowerCase();
  const drinkIcon = drinkMapping[userDrink];
  const isSmall = ["vodka", "tequila"].includes(userDrink);
  const drinkSize = isSmall ? width * 0.10 : width * 0.25;
  const drinkTextMapping: Record<string, string> = {
    wine: "Where's the romance at?",
    beer: "Chill night... Sup?",
    whiskey: "I'm an adult.",
    martini: "I'm smart and beautiful!",
    vodka: "Get the party started!",
    tequila: "Gonna get fucked tonight",
    absinthe: "Who are you?",
    water: "I don't need alcohol to have fun",
  };
  const drinkText = drinkTextMapping[userDrink];

  if (!fontsLoaded) return null;

  return (
    <>
      <View style={styles.container}>
        {/* 1) BACKGROUND */}
        <ImageBackground
          source={require("../assets/images/mm-back.png")}
          style={styles.background}
          imageStyle={styles.backgroundImage}
        />

        {/* 2) MR. MINGLES – clickable, cycles messages */}
        <View style={styles.minglesContainer}>
          <TouchableOpacity
           onPress={cycle}
           activeOpacity={0.8}
           style={styles.minglesImageTouchable}
          >
            <Image
              source={require("../assets/images/mr-mingles.png")}
              style={styles.minglesImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
         
        </View>

        {/* 3) BAR FRONT OVERLAY (no pointer events) */}
        <View style={styles.frontContainer} pointerEvents="none">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{
              width: "100%",
              height: 700,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={require("../assets/images/mm-front.png")}
              style={styles.frontImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
        </View>

        {/* 4) SPEECH BUBBLE */}
        <View style={styles.bubbleContainer}>
          <ImageBackground
            source={require("../assets/images/speech-bubble.png")}
            imageStyle={{ transform: [{ scaleX: -1 }] }}
            style={styles.bubble}
            resizeMode="stretch"
          >
            <TouchableOpacity onPress={back} style={styles.arrow}>
              <MaterialIcons
                name="chevron-left"
                size={32}
                color={"#fff"}
              />
            </TouchableOpacity>

            <View style={styles.bubbleContent}>
              <Text style={styles.bubbleText}>{messages[idx]}</Text>
              {idx === 0 && (
                <TouchableOpacity onPress={() => setShowDrinkMenu(true)} style={styles.tapButton}>
                  <Text style={styles.tapText}>- TAP -</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={cycle}
              style={styles.arrow}
            >
              <MaterialIcons
                name="chevron-right"
                size={32}
                color={"#fff"}
              />
            </TouchableOpacity>
          </ImageBackground>
        </View>

        {/* 5) DRINK MENU MODAL */}
        <Modal visible={showDrinkMenu} transparent animationType="slide">
          <View style={drinkModalStyles.modalOverlay}>
            <View style={drinkModalStyles.modalContainer}>
              <ImageBackground
                source={require("../assets/images/drinks-menu.png")}
                style={drinkModalStyles.menuBackground}
                resizeMode="contain"
              >
                <TouchableOpacity
                  style={drinkModalStyles.closeHotspot}
                  onPress={() => setShowDrinkMenu(false)}
                />
                {Object.entries(drinkMapping).map(([name]) => (
                  <TouchableOpacity
                    key={name}
                    style={drinkModalStyles[name]}
                    onPress={() => handleDrinkSelect(name)}
                  >
                    <Image
                      source={require("../assets/images/price-label.png")}
                      style={drinkModalStyles.labelImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                ))}
                {drinkLoading && (
                  <View style={drinkModalStyles.loadingOverlay}>
                    <LottieView
                            source={withoutBg}
                            autoPlay
                            loop
                            style={{ width: 600, height: 600, backgroundColor: "transparent" }}
                           />
                  </View>
                )}
              </ImageBackground>
            </View>
          </View>
        </Modal>

        {/* hotspots for drink/shop/rules/tips */}
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={() => setShowDrinkMenu(true)}
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={styles.overlayTouchableShop}
          onPress={() => {
            setPopupFlag("shop");
            setShowPopupShop(true);
          }}
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={styles.overlayTouchableRules}
          onPress={() => {
            setPopupFlag("rules");
            setShowPopupRules(true);
          }}
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={styles.overlayTouchableTips}
          onPress={handleTipJar}          
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={styles.dontPressHotspot}
          disabled={dontPressPressed}
          onPress={async () => {
            const ok = await showInterstitial();
            setDontPressPressed(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.dontPressText, dontPressPressed && styles.dontPressDisabled]}>
            {dontPressPressed ? "Told you not to press…" : "Don’t Press Here"}
          </Text>
        </TouchableOpacity>


        {/* 6) USER DRINK ICON + SPEECH */}
        {profile?.drink && (
          <TouchableOpacity
            style={[
              styles.userDrinkIconContainer,
              { top: isSmall ? height * 0.59 : height * 0.525 },
            ]}
            onPress={() => setShowDrinkSpeech(s => !s)}
            activeOpacity={0.8}
          >
            {showDrinkSpeech && (
              <View
                style={[
                  styles.drinkSpeechBubble,
                  { bottom: drinkSize + 8 },
                ]}
              >
                <Text style={styles.drinkSpeechBubbleText}>{drinkText}</Text>
              </View>
            )}
            <Image
              source={drinkIcon}
              style={{ width: drinkSize, height: drinkSize }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* 7) BOTTOM NAV */}
        <View style={styles.navbarContainer}>
          <BottomNavbar selectedTab="Mr. Mingles" />
        </View>
      </View>

      <PopUp
        visible={showPopupShop}
        flag={popupFlag || undefined}
        title="Shop"
        onClose={() => setShowPopupShop(false)}
      >
        <ScrollView
          style={shopStyles.scroll}
          contentContainerStyle={shopStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          <View style={shopStyles.container}>
            {[
              { amount: 30,  price: "$1"  },
              { amount: 100, price: "$3"  },
              { amount: 300, price: "$5"  },
              { amount: 1000,price: "$10" },
            ].map((p) => (
              <View key={p.amount} style={shopStyles.row}>
                <Text style={shopStyles.amount}>{p.amount} moneys</Text>
                <View style={shopStyles.right}>
                  <Text style={shopStyles.price}>{p.price}</Text>
                  <TouchableOpacity style={shopStyles.buyBtn} onPress={() => {}}>
                    <Text style={shopStyles.buyText}>Buy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {profile?.isVip ? (
              <View style={[shopStyles.row, shopStyles.vipActiveRow]}>
                <Text style={shopStyles.vipActiveText}>You're a VIP</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[shopStyles.row, shopStyles.vipRow]}
                onPress={() => setShowVipPopup(true)}
                activeOpacity={0.9}
              >
                <Text style={shopStyles.vipText}>Become a VIP</Text>
                <View style={shopStyles.right}>
                  <Text style={shopStyles.price}>$5 / month</Text>
                  <View style={shopStyles.badgeWrap}>
                    <Text style={shopStyles.badge}>24/7 Bar</Text>
                    <Text style={shopStyles.badge}>300/day</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}


            {/* spacer so last item isn’t tight to bottom edge */}
            <View style={{ height: 8 }} />
          </View>
        </ScrollView>
      </PopUp>

      <PopUp
        visible={showVipPopup}
        title="Become a VIP"
        onClose={() => setShowVipPopup(false)}
      >
        <ScrollView
          style={shopStyles.vipScroll}
          contentContainerStyle={shopStyles.vipScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={shopStyles.vipContainer}>
            <Text style={shopStyles.vipLine}>$5 a month</Text>
            <Text style={shopStyles.vipLine}>Bar is open 24/7</Text>
            <Text style={shopStyles.vipLine}>300 moneys a day</Text>

            <TouchableOpacity
              style={[shopStyles.buyBtn, { marginTop: 14, opacity: vipLoading ? 0.6 : 1 }]}
              disabled={vipLoading}
              onPress={async () => {
                try {
                  setVipLoading(true);
                  const uid = auth.currentUser?.uid;
                  if (!uid) throw new Error("No user");
                  await updateDoc(doc(firestore, "users", uid), {
                    isVip: true,
                    vipSince: serverTimestamp(),
                  });
                  // keep ProfileContext in sync immediately
                  await saveProfile({ isVip: true });
                  setShowVipPopup(false);
                  setShowPopupShop(false);
                  alert("Congrats! You’re a VIP of Dateish! You’re way cooler now.");
                } catch (e) {
                  console.error(e);
                } finally {
                  setVipLoading(false);
                }
              }}
            >
              <Text style={shopStyles.buyText}>{vipLoading ? "Subscribing…" : "Subscribe"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </PopUp>




      <PopUp
          visible={showPopupRules}
          flag={popupFlag || undefined}
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

      <PopUp
        visible={showPopupTips}
        flag={popupFlag || undefined}
        title="Tips"
        onClose={() => setShowPopupTips(false)}
      />
      <PopUp
        visible={showRatePrompt}
        title="Mr. Mingles"
        onClose={() => setShowRatePrompt(false)}
      >
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: "#ffe3d0", fontSize: 18, textAlign: "center", marginBottom: 12 }}>
            If you’re a nice awesome person, rate us in the app store!
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={shopStyles.buyBtn} onPress={handleRateYes}>
              <Text style={shopStyles.buyText}>Yeah I’m the best</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[shopStyles.buyBtn, { backgroundColor: "rgba(255,255,255,0.06)" }]}
              onPress={handleRateNo}
            >
              <Text style={{ color: "#ffe3d0" }}>No I don’t wanna</Text>
            </TouchableOpacity>
          </View>
        </View>
      </PopUp>

      <PopUp
        visible={showNoThanks}
        title="Mr. Mingles"
        onClose={() => setShowNoThanks(false)}
      >
        <Text style={{ color: "#ffe3d0", fontSize: 18, textAlign: "center" }}>
          Ok no worries… Oh btw completely unrelated, here’s an ad :)
        </Text>
      </PopUp>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundImage: {
    position: "absolute",
    top: -70,
    height: "100%",
  },
  minglesContainer: {
    position: "absolute",
    top: verticalScale(190),
    right: "24%",
    alignItems: "center",
  },
  minglesImageTouchable: {
    width: "70%",
    alignItems: "center",
    justifyContent: "center",
    height: "38%"
  },
  minglesImage: {
    width: width * 0.8,
    height: height * 0.8,
  },
  frontContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "80%",
    alignItems: "center",
    // pointerEvents none above
  },
  frontImage: {
    width: "100%",
    height: 700
  },
  bubbleContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  bubble: {
    width: width * 0.9,
    height: BUBBLE_HEIGHT,
    flexDirection: "row",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between"
  },
  arrow: { width: 40, alignItems: "center", justifyContent: "center", position: "relative", bottom: 15 },
  bubbleContent: {
    position: "absolute",
    top: 0, 
    bottom: 25,
    left: 40,
    right: 40,
    justifyContent: "center",
    alignItems: "center"
  },
  bubbleText: {
    fontFamily: FontNames.MontserratRegular,
    fontSize: 20,
    color: "#fff",
    textAlign: "center",
  },
  tapButton: {
    position: "relative",
    bottom: 5,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tapText: {
    color: "white",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 18,
  },
  overlayTouchable: {
    position: "absolute",
    bottom: "24%",
    right: "27%",
    width: 70,
    height: 30,
    zIndex: 550
  },
  overlayTouchableShop: {
    position: "absolute",
    bottom: "19.5%",
    right: "27%",
    width: 70,
    height: 30,
    zIndex: 550
  },
  overlayTouchableRules: {
    position: "absolute",
    bottom: "15%",
    right: "30%",
    width: 70,
    height: 30,
    zIndex: 550
  },
  overlayTouchableTips: {
    position: "absolute",
    bottom: "42%",
    left: "3%",
    width: 83,
    height: 105,
  },
  userDrinkIconContainer: {
    position: "absolute",
    right: width * 0.31,
    zIndex: 5,
    alignItems: "center",
  },
  drinkSpeechBubble: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: 200,
    alignItems: "center",
  },
  drinkSpeechBubbleText: {
    color: "#fff",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
    textAlign: "center",
  },
  navbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  rulesContainer: {
    marginTop: 8,
    margin: "auto",
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
  dontPressHotspot: {
    position: "absolute",
    bottom: "20.5%",   // tweak to sit “on the bar next to the chalkboard”
    right: "44%",
    width: 160,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dontPressText: {
    color: "#ffe3d0",
    fontSize: 16,
    fontFamily: FontNames.MontserratRegular,
  },
  dontPressDisabled: { opacity: 0.6 },
});
const drinkModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: { width: "90%", height: "80%", backgroundColor: "transparent" },
  menuBackground: { width: "100%", height: "100%" },
  closeHotspot: { position: "absolute", top: 40, right: 0, width: 80, height: 80 },
  labelImage: { width: 55, height: 55 },
  wine:    { position: "absolute", top: "42%", left: "28%" },
  beer:    { position: "absolute", top: "55%", left: "28%" },
  whiskey: { position: "absolute", top: "67%", left: "28%" },
  martini: { position: "absolute", top: "82%", left: "28%" },
  vodka:   { position: "absolute", top: "42%", left: "75%" },
  tequila: { position: "absolute", top: "55%", left: "75%" },
  absinthe:{ position: "absolute", top: "67%", left: "75%" },
  water:   { position: "absolute", top: "82%", left: "75%" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});

const shopStyles = StyleSheet.create({
  container: { marginTop: 8, paddingHorizontal: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#460b2a",
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
  },
  amount: {
    fontSize: 22,
    color: "#e6c9d7",
    fontFamily: FontNames.MontserratRegular,
  },
  right: { alignItems: "flex-end" },
  price: {
    fontSize: 18,
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    marginBottom: 6,
  },
  buyBtn: {
    backgroundColor: "#6e1944",
    borderWidth: 3,
    borderColor: "#460b2a",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  buyText: {
    color: "#ffe3d0",
    fontSize: 16,
    fontFamily: FontNames.MontserratRegular,
    textTransform: "uppercase",
  },
  vipRow: {
    borderColor: "#b51e64",
    backgroundColor: "rgba(110,25,68,0.25)",
  },
  vipText: {
    fontSize: 22,
    color: "#e78bbb",
    fontFamily: FontNames.MontserratRegular,
  },
  badgeWrap: { flexDirection: "row", gap: 6 },
  badge: {
    color: "#d8bfd8",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  vipActiveRow: {
    borderColor: "#FFD700",
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  vipActiveText: {
    flex: 1,
    textAlign: "center",
    color: "#FFD700",
    fontSize: 22,
    fontFamily: FontNames.MontserratBold,
  },
  
  vipScroll: { maxHeight: height * 0.5, width: "100%" },
  vipScrollContent: { alignItems: "center", paddingHorizontal: 12, paddingBottom: 12 },
  
  vipContainer: {
    alignItems: "center",
    paddingVertical: 6,
    width: "100%",
  },
  vipLine: {
    fontSize: 18,
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    marginBottom: 6,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  
  scroll: { maxHeight: height * 0.6, width: "100%" },
  scrollContent: { paddingHorizontal: 8, paddingBottom: 12 },
});

