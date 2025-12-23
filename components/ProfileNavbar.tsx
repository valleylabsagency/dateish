import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { MusicContext } from "../contexts/MusicContext";
import { ProfileContext } from "../contexts/ProfileContext";
import { MoneysContext } from "../contexts/MoneysContext";
import PopUp from "../components/PopUp";
import LottieView from "lottie-react-native";
import animationData from "../assets/videos/mm-dancing.json";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showRewarded } from "@/services/ads";
import { doc, updateDoc, increment } from "firebase/firestore";
import { auth, firestore } from "@/firebase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ProfileNavbarProps {
  onBack: () => void;
  showBack?: boolean;
}

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    (layer) => layer.ty !== 1 || layer.nm !== "Dark Blue Solid 1"
  ),
};

const { width, height } = Dimensions.get("window");

export default function ProfileNavbar({
  onBack,
  showBack = true,
}: ProfileNavbarProps) {
  // Access the music context so we can toggle music or show loading
  const { isPlaying, soundLoading, toggleMusic } = useContext(MusicContext);

  // We'll animate the speaker-lines bigger/smaller for 5s whenever music toggles on
  // but we do NOT hide them in between loops. Instead we let them remain at the last scale value
  const linesAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // We track whether lines are actually visible on screen at all
  const [linesVisible, setLinesVisible] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupFlag, setPopupFlag] = useState<string | null>(null);

  type RewardState = { remaining: number; resetAt: number };

  const [rewardRemaining, setRewardRemaining] = useState<number>(5);
  const [rewardLoading, setRewardLoading] = useState(false);

  const { profile } = useContext(ProfileContext);
   const insets = useSafeAreaInsets();
  const insetTop = Math.max(6, insets.top * 0.6); // tweak multiplier
  
  /*
  const isVip = !!profile?.isVip;
const displayMoneys =
typeof profile?.moneys === "number"
  ? profile!.moneys!
  : (isVip ? 300 : 100);
*/
  const { width, height } = Dimensions.get("window");

  function computeNextResetAt(): number {
    const d = new Date();
    const reset = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      17,
      0,
      0,
      0
    ); // 17:00 today
    if (Date.now() >= reset.getTime()) reset.setDate(reset.getDate() + 1); // else, today 17:00
    return reset.getTime();
  }

  async function ensureRewardState(): Promise<RewardState> {
    const raw = await AsyncStorage.getItem("adRewardsState");
    let state: RewardState | null = raw ? JSON.parse(raw) : null;
    if (!state || Date.now() >= state.resetAt) {
      state = { remaining: 5, resetAt: computeNextResetAt() };
      await AsyncStorage.setItem("adRewardsState", JSON.stringify(state));
    }
    setRewardRemaining(state.remaining);
    return state;
  }

  async function saveRewardState(next: RewardState) {
    setRewardRemaining(next.remaining);
    await AsyncStorage.setItem("adRewardsState", JSON.stringify(next));
  }

  async function grantTenMoneys() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(firestore, "users", uid), { moneys: increment(10) });
  }

  async function handleWatchReward() {
    if (rewardRemaining <= 0 || rewardLoading) return;
    setRewardLoading(true);
    try {
      const ok = await showRewarded();
      if (ok) {
        await grantTenMoneys();
        const state = await ensureRewardState();
        const next = { ...state, remaining: Math.max(0, state.remaining - 1) };
        await saveRewardState(next);
      }
    } finally {
      setRewardLoading(false);
    }
  }

  useEffect(() => {
    if (showPopup && popupFlag === "moneys") {
      ensureRewardState();
    }
  }, [showPopup, popupFlag]);

  const router = useRouter();

  useEffect(() => {
    if (isPlaying) {
      setLinesVisible(true); // ensure lines are on top of the base speaker
      // Start repeating scale 1 -> 1.2 -> 1
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(linesAnim, {
            toValue: 1.2,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(linesAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();

      // Stop the loop after 5s, but keep lines shown at the last scale factor
      const timer = setTimeout(() => {
        if (loopRef.current) loopRef.current.stop();
        linesAnim.stopAnimation((currentValue) => {
          // Freeze at the final scale, or pick a stable value
          linesAnim.setValue(1.2);
        });
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // If not playing, hide lines entirely & reset scale
      if (loopRef.current) {
        loopRef.current.stop();
      }
      linesAnim.setValue(1);
      setLinesVisible(false);
    }
  }, [isPlaying]);

  return (
    <View
      style={[
        styles.navbar,
        {
          paddingTop: insetTop,
          height: (Platform.OS === "ios" ? 85 : 65) + insetTop,
        },
      ]}
    >
    <View style={profileNavbarStyles.navbar}>
    {showBack ? (
          <TouchableOpacity onPress={onBack}>
            <Image
              source={require("../assets/images/icons/back-arrow.png")}
              style={profileNavbarStyles.navIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : (
          <View style={profileNavbarStyles.navPlaceholder} />
        )}

        <View style={profileNavbarStyles.navSpacer} />
        {/*}
     <TouchableOpacity 
             style={styles.moneysBar}
             onPress={() => {
               setPopupFlag("moneys");
               setShowPopup(true);
             }}
           >
          
              
             <Text style={styles.moneysAmount}>{displayMoneys}</Text>
             <Image style={styles.moneysImage} source={require("../assets/images/moneys.png")} />
             
           </TouchableOpacity> */}

        {/* Speaker icon area */}
        {soundLoading ? (
          <LottieView
            source={withoutBg}
            autoPlay
            loop
            style={{ width: 600, height: 600, backgroundColor: "transparent" }}
          />
        ) : (
          <TouchableOpacity
            onPress={toggleMusic}
            style={profileNavbarStyles.speakerWrapper}
          >
            {/* speaker-no-lines is always there */}
            <Image
              source={require("../assets/images/icons/speaker-no-lines.png")}
              style={profileNavbarStyles.speakerBase}
              resizeMode="contain"
            />
            {linesVisible && (
              <Animated.Image
                source={require("../assets/images/icons/speaker-lines.png")}
                style={[
                  profileNavbarStyles.speakerLines,
                  {
                    transform: [{ scale: linesAnim }],
                  },
                ]}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        )}
      </View>
      {/*}
      <PopUp
      visible={showPopup}
      flag={popupFlag || undefined}
      onClose={() => setShowPopup(false)}
    >
      {popupFlag === "moneys" && (
        <View style={moneyStyles.wrap}>
          <Text style={moneyStyles.note}>
            Every day when the bar opens, your moneys will fill up to 100
          </Text>
    
          <TouchableOpacity
            style={[moneyStyles.rewardBtn, (rewardRemaining === 0 || rewardLoading) && { opacity: 0.6 }]}
            onPress={handleWatchReward}
            disabled={rewardRemaining === 0 || rewardLoading}
            activeOpacity={0.85}
          >
            <Image
              source={require("../assets/images/icons/ad.png")}
              style={moneyStyles.adIcon}
              resizeMode="contain"
            />
            <Text style={moneyStyles.rewardText}>
              {rewardLoading ? "Loading…" : "Get 10 Moneys"}
            </Text>
            <Text style={moneyStyles.counter}>{rewardRemaining}/5</Text>
          </TouchableOpacity>
    
          <TouchableOpacity
            style={moneyStyles.shopBtn}
            onPress={() => {
              setShowPopup(false);
              router.push("/mingles?open=shop");
            }}
          >
            <Text style={moneyStyles.shopText}>Go to Shop</Text>
          </TouchableOpacity>
        </View>
      )}
    </PopUp> */}

       </View>
  );
}

const profileNavbarStyles = StyleSheet.create({
  navbar: {
    width: "100%",
    height: Platform.OS === "ios" ? 85 : 65,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 0,
    paddingTop: Platform.OS === "ios" ? 0 : 0,
    zIndex: 1000,
    elevation: 1000,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
  navPlaceholder: { width: 50, height: 50 },
  navSpacer: {
    flex: 1,
  },
  moneysBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    height: 35,
    width: width * 0.26,
    paddingHorizontal: "2%",
    paddingVertical: 0,
    marginRight: "5%",
    backgroundColor: "#d8bfd8",
    position: "relative",
  },
  moneysAmount: {
    color: "#460b2a",
    fontSize: 30,
    letterSpacing: 0,
    position: "relative",
    bottom: height * 0.004,
    right: width * 0.01,
  },
  moneysImage: {
    width: 65,
    height: "95%",
  },
  speakerWrapper: {
    width: 50,
    height: 50,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  speakerBase: {
    width: 45,
    height: 45,
    position: "absolute",
  },
  speakerLines: {
    width: 55,
    height: 40,
    position: "absolute",
  },
});

const styles = StyleSheet.create({
  navbar: {
    width: "100%",
    height: Platform.OS === "ios" ? 85 : 65,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 0,
    paddingTop: Platform.OS === "ios" ? 0 : 0,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
  navPlaceholder: {
    width: 50,
    height: 50,
  },
  navSpacer: {
    flex: 1,
  },
  moneysBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    height: 35,
    paddingHorizontal: "2%",
    paddingVertical: 0,
    marginRight: "5%",
    backgroundColor: "#d8bfd8",
    position: "relative",
  },
  moneysAmount: {
    color: "#460b2a",
    fontSize: 30,
    letterSpacing: -2,
    position: "relative",
    bottom: height * 0.004,
    right: width * 0.01,
  },
  moneysImage: {
    width: 60,

    height: "90%",
  },
  speakerWrapper: {
    width: 50,
    height: 50,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  speakerBase: {
    width: 45,
    height: 45,
    position: "absolute",
  },
  speakerLines: {
    width: 55,
    height: 40,
    position: "absolute",
  },
  spendFallText: {
    position: "absolute",
    left: "15%", // tweak until it visually appears under the number
    top: 0, // starts near the top of the bar
    fontSize: 32,
    fontWeight: "700",
    color: "red", // nice “spent” red; change if you prefer
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

const moneyStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 6 },
  note: {
    color: "#d8bfd8",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  rewardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#6e1944",
    borderWidth: 3,
    borderColor: "#460b2a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  adIcon: { width: 26, height: 26 },
  rewardText: { color: "#ffe3d0", fontSize: 18, fontWeight: "600" },
  counter: { color: "#ffe3d0", fontSize: 16, marginLeft: 8, opacity: 0.9 },
  shopBtn: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#460b2a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  shopText: { color: "#ffe3d0", fontSize: 16 },
});
