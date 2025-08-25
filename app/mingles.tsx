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

  // toggles the drink‐speech bubble
  const [showDrinkSpeech, setShowDrinkSpeech] = useState(false);

  const { triggerSpend } = useContext(MoneysContext);


  useEffect(() => {
    setShowWcButton(true);
  }, [setShowWcButton]);

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
      />

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
  }
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
