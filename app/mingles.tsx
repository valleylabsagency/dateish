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
import { Linking, Platform, useWindowDimensions, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
//import { showInterstitial } from "@/services/ads";


const BG_IMG = require("../assets/images/mm-back.png");
const FRONT_IMG = require("../assets/images/mm-front.png");
const MINGLES_IMG = require("../assets/images/mr-mingles.png");

// Get the art’s intrinsic aspect ratio (so overlays line up exactly)
const { width: BGW, height: BGH } = Image.resolveAssetSource(BG_IMG);
const STAGE_AR = BGW / BGH; // aspect ratio of your scene artwork


const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18;

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
  ),
}

// Pick a lower Y on smaller phones so the drink sits farther down on the bar



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

  

  // Turn on to SEE the touchable overlays (auto-on in dev if you want)
const SHOW_HITBOXES = true; // or __DEV__
const SHOW_HITBOX = false; // flip to true when debugging tap areas

const hotspotBase = {
  position: "absolute" as const,
  zIndex: 9999,
  ...Platform.select({ android: { elevation: 9999 } }),
};

const debugOutline = SHOW_HITBOX
  ? { borderWidth: 1, borderColor: "rgba(0,255,255,0.6)", borderStyle: "dashed", backgroundColor: "transparent" }
  : null;

const hit = (color = "lime") =>
  SHOW_HITBOXES
    ? {
        backgroundColor: "rgba(0,255,0,0.15)",
        borderColor: color,
        borderWidth: 1,
        zIndex: 99,      // above front art
        elevation: 99,   // Android
      }
    : null;

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
   // await showInterstitial();
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

 // state to hold the *exact* visible height
const [stageH, setStageH] = React.useState<number | null>(null);

// ====== Stage sizing (COVER, no side bars, no bottom gap) ======
const { width: sw, height: sh } = useWindowDimensions();

// Use measured stage height if we have it; otherwise fall back to full height minus our initial navbar guess
const containerW = sw;
const visibleH = stageH ?? (sh - 72); 



// Compute cover scale in the *visible* area only
const scale = Math.max(containerW / BGW, visibleH / BGH);
const dispW = BGW * scale;
const dispH = BGH * scale;

const offsetX = (containerW - dispW) / 2;
const offsetY = (visibleH - dispH) / 2;

const FRONT_HEIGHT_FRAC = 0.64; // was 0.8 → shorter

const FRONT = { x: 0, w: 1 };

const frontLeft = offsetX + FRONT.x * dispW;
const frontHeightPx = FRONT_HEIGHT_FRAC * dispH;
const frontTop = Math.round(visibleH - frontHeightPx);

// Generic rect helper in art space (uses visibleH offsets)
const rect = React.useCallback(
  (x: number, y: number, w: number, h: number) => ({
    position: "absolute" as const,
    left: offsetX + x * dispW,
    top:  offsetY + y * dispH,
    width:  w * dispW,
    height: h * dispH,
  }),
  [offsetX, offsetY, dispW, dispH]
);

// Hotspots tied to FRONT box
const rectInFront = (x: number, y: number, w: number, h: number) => ({
  position: "absolute" as const,
  left:  frontLeft + x * dispW,
  top:   frontTop  + y * frontHeightPx,
  width: w * dispW,
  height: h * frontHeightPx,
});

const MINGLES = { x: 0.02, y: 0.06, w: 0.8, h: 0.8 };
const minglesBox = rect(MINGLES.x, MINGLES.y, MINGLES.w, MINGLES.h);
const HIT_INSET = { left: 0.3, right: 0.3, top: 0.25, bottom: 0.24 }; // 10–12% inset
const minglesHit = rect(
  MINGLES.x + MINGLES.w * HIT_INSET.left,
  MINGLES.y + MINGLES.h * HIT_INSET.top,
  MINGLES.w * (1 - HIT_INSET.left - HIT_INSET.right),
  MINGLES.h * (1 - HIT_INSET.top - HIT_INSET.bottom)
);


// Keep the bubble height consistent with bar-2
const bubbleH = Math.min(Math.round(dispH * 0.18), 140);


// A little extra spacing for the TAP button (positive pushes it down)
const tapExtraGap = 0.02 * dispH;

const shortSide = Math.min(sw, sh);

// Default position (good for normal/tall phones)
let drinkY = 0.33;

// Nudge downward on compact devices
if (shortSide < 400) drinkY = 0.30;   // small
if (shortSide < 380) drinkY = 0.29;   // very small
if (shortSide < 360) drinkY = 0.28;   // tiniest
// You can tweak the numbers to taste, higher = lower placement

// One place to control drink box geometry
const DRINK_BOX = rectInFront(0.53, drinkY, 0.13, 0.22);




  return (
    <>
      <View style={styles.container}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "flex-start",
            backgroundColor: "black", // letterbox bars if needed
          }}
        >
          {/* ==== STAGE (locked to bg aspect) ==== */}
          <View style={{ width: containerW, height: visibleH, overflow: "hidden" }}>

            {/* Back layer */}
            <Image
              source={BG_IMG}
              style={{ position: "absolute", left: offsetX, top: offsetY, width: dispW, height: dispH }}
              resizeMode="stretch"
            />


            {/* Mr. Mingles (click to cycle) */}
            
            <Image
              source={MINGLES_IMG}
              style={[minglesBox]}
              resizeMode="contain"
              pointerEvents="none"
            />
           

{/* Speech bubble — same placement as bar-2 */}
<View
  style={{
    position: "absolute",
    left:  offsetX + dispW * 0.05,
    top:   2,                  // 2px under the stage top
    width: dispW * 0.90,
    height: bubbleH,           // capped height like bar-2
    zIndex: 30,
    ...Platform.select({ android: { elevation: 30 } }),
  }}
>
  <ImageBackground
    source={require("../assets/images/speech-bubble.png")}
    style={{ flex: 1 }}
    resizeMode="stretch"
  >
    {/* LEFT ARROW */}
    <TouchableOpacity
      onPress={back}
      style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, width: 40,
        alignItems: "center", justifyContent: "center",
        zIndex: 2, ...Platform.select({ android: { elevation: 2 } }),
      }}
    >
      <MaterialIcons name="chevron-left" size={32} color="#fff" />
    </TouchableOpacity>

    {/* RIGHT ARROW */}
    <TouchableOpacity
      onPress={cycle}
      style={{
        position: "absolute",
        right: 0, top: 0, bottom: 0, width: 40,
        alignItems: "center", justifyContent: "center",
        zIndex: 2, ...Platform.select({ android: { elevation: 2 } }),
      }}
    >
      <MaterialIcons name="chevron-right" size={32} color="#fff" />
    </TouchableOpacity>

    {/* CENTER CONTENT */}
    <View
      pointerEvents="box-none"
      style={{
        flex: 1,
        justifyContent: "center",
        position: "relative",
        bottom: 10,
        alignItems: "center",
        paddingLeft: 40,
        paddingRight: 40,
      }}
    >
      <Text
        style={[
          styles.bubbleText,
          { includeFontPadding: false },
        ]}
      >
        {messages[idx]}
      </Text>

      {idx === 0 && (
        <TouchableOpacity
          onPress={() => setShowDrinkMenu(true)}
          style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8, marginTop: 8 }}
        >
          <Text style={styles.tapText}>- TAP -</Text>
        </TouchableOpacity>
      )}
    </View>
  </ImageBackground>
</View>



            {/* ==== DRINK MENU MODAL ==== */}
            <Modal visible={showDrinkMenu} transparent animationType="fade" onRequestClose={() => setShowDrinkMenu(false)}>
              <View style={drinkModalStyles.modalOverlay}>
                <View style={drinkModalStyles.modalContainer}>
                  <ImageBackground
                    source={require("../assets/images/drinks-menu.png")}
                    style={drinkModalStyles.menuBackground}
                    resizeMode="contain"
                  >
                    {/* close area in the top-right */}
                    <TouchableOpacity
                      style={drinkModalStyles.closeHotspot}
                      onPress={() => setShowDrinkMenu(false)}
                    />

                    {/* clickable price labels over each drink */}
                    {Object.entries(drinkMapping).map(([name]) => (
                      <TouchableOpacity
                        key={name}
                        style={drinkModalStyles[name]}   // wine/beer/… positions you already defined
                        onPress={() => handleDrinkSelect(name)}
                        activeOpacity={0.8}
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


            {/* Hotspots – all normalized; tweak once and they’re stable everywhere */}
            <Pressable
              style={[hotspotBase, minglesHit]} // hit() only for debugging
              onPress={cycle}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
            />

            <Pressable
              style={[hotspotBase, rectInFront(0.57, 0.69, 0.16, 0.03)]}
              onPress={() => setShowDrinkMenu(true)}
            />
            <Pressable
              style={[hotspotBase, rectInFront(0.57, 0.76, 0.13, 0.03)]}
              onPress={() => { setPopupFlag("shop"); setShowPopupShop(true); }}
            />
            <Pressable
              style={[hotspotBase, rectInFront(0.54, 0.84, 0.16, 0.03)]}
              onPress={() => { setPopupFlag("rules"); setShowPopupRules(true); }}
            />
            <Pressable
              style={[hotspotBase, rectInFront(0.05, 0.3, 0.18, 0.19)]}
              onPress={handleTipJar}
            />
            {/*
            <Pressable
              style={rect(0.38, 0.79, 0.28, 0.06)} // "Don’t Press Here"
              onPress={async () => { if (!dontPressPressed) { setDontPressPressed(true); } }}
            > 
              <Text style={[styles.dontPressText, dontPressPressed && styles.dontPressDisabled]}>
                {dontPressPressed ? "Told you not to press…" : "Don’t Press Here"}
              </Text>
            </Pressable>*/}

            {/* Front layer (glass, bar, etc.) – perfectly aligned */}
            <Image
              source={FRONT_IMG}
              style={{
                position: "absolute",
                left: frontLeft,
                top: frontTop,
                width: FRONT.w * dispW,
                height: frontHeightPx,
              }}
              resizeMode="stretch"
              pointerEvents="none"
            />
            {/* --- User's drink, positioned relative to the FRONT image --- */}
            {drinkIcon && (
              <View
                // pick a spot on the bar: tweak these fractions to move it
                style={[
                  DRINK_BOX,
                  { zIndex: 20, alignItems: "center", justifyContent: "center",
                    ...Platform.select({ android: { elevation: 20 } }),
                  },
                ]}
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  onPress={() => setShowDrinkSpeech((v) => !v)}
                  activeOpacity={0.9}
                  style={StyleSheet.absoluteFill}
                >
                  <Image
                    source={drinkIcon}
                    // fill the front-relative box; use contain so art keeps aspect
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {showDrinkSpeech && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: "105%",             // bubble sits just above the drink
                      left: "50%",
                      transform: [{ translateX: -70 }],
                      backgroundColor: "rgba(0,0,0,0.8)",
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 10,
                      width: 140,
                    }}
                    pointerEvents="none"
                  >
                    <Text style={{ color: "#fff", textAlign: "center", fontFamily: FontNames.MontserratRegular }}>
                      {drinkText}
                    </Text>
                  </View>
                )}
              </View>
            )}



          </View>
        </View>

        {/* Bottom nav can remain full-width below */}
        <View
          style={styles.navbarContainer}
          onLayout={(e) => setStageH(e.nativeEvent.layout.y)}
          pointerEvents="box-none"
        >
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
          showsVerticalScrollIndicator
          persistentScrollbar   
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
        <ScrollView style={shopStyles.vipScroll}>
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
        </ScrollView>
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
  bubbleContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  mmfront: {
    width: "100%",
    height: "80%",
    position: "absolute",
    bottom: 0
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
    fontSize: 18,
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
    zIndex: 550,
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

