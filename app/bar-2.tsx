// bar-2.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";

import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  TextInput,
  Pressable,
  Alert,
  Animated,
  Easing,
} from "react-native";

import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import {
  getDatabase,
  ref as rtdbRef,
  onValue,
  update as rtdbUpdate,
} from "firebase/database";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scale, ScaledSheet } from "react-native-size-matters";
import { ChatType, SavedChat } from "./ChitChats";
import closeIcon from "../assets/images/x.png";
import LottieView from "lottie-react-native";
import animationData from "../assets/videos/mm-dancing.json";
import { Video } from "expo-av";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { ProfileContext } from "../contexts/ProfileContext";
import { useIsFocused } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import Navbar from "../components/Navbar";
import { spendMoneys, getMessageCost } from '../services/moneys';
import { MoneysContext } from "../contexts/MoneysContext";
import PopUp from "../components/PopUp";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// top of file
import * as NavigationBar from "expo-navigation-bar";
import { MusicContext } from "../contexts/MusicContext";

// NEW
import * as MailComposer from "expo-mail-composer";
import MMAnimated from "@/services/MMAnimated";
import { Linking, useWindowDimensions, Platform, Keyboard, TouchableWithoutFeedback } from "react-native";
import { NavbarContext } from "../contexts/NavbarContext";

import SpeechBubblePop from "@/services/SpeechBubblePop";

const BG_IMG = require("../assets/images/bar-back.png");
const FRONT_IMG = require("../assets/images/bar-front.png");

// Use the art’s intrinsic aspect so we can “cover” precisely
const { width: BGW, height: BGH } = Image.resolveAssetSource(BG_IMG);

const steamboat = require("../assets/videos/steamboatwillie.mp4");

const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18; // height for the speech bubble
const START_OFFSET_RATIO = 0.085;
const SPACING_RATIO = 0.2;
const AVATAR_SIZE = 100;

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    (layer) => layer.ty !== 1 || layer.nm !== "Dark Blue Solid 1"
  ),
};

// Mapping of drink types to icons
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

// Text prompts for each drink
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

// Mr. Mingles welcome dialogue (tap to advance)
const WELCOME_MESSAGES = [
  "Beep Boop Beep Mothafuckas!",
  "Hello! I’m Mr. Mingles, how you doin?",
  "Welcome to Dateish!",
  "We're not like other dating apps.",
  'We don\'t have a fancy algorithm to match you with your "perfect match".',
  "Here you have to talk to people to actually know if you're a good match.",
  "Kinda old school… Go to a bar, talk to several people",
  "And if you like someone, ask for their number!",
  "Remember that shit??",
  "Who will you see? Whoever is in the bar right now! Like REAL life.",
  "Alright, enough chit chat! Go to the bathroom and make yourself a profile.",
];

const BAR_MM_SPEEACH_BUBBLE = [
  "Have fun, flirt freely, drink responsibly.",
  "Talk to some humans! I'm sure they're not all assholes...",
  "I'm not like all the other bots on dating apps... I promise. :)",
];

const LAST_WELCOME_INDEX = WELCOME_MESSAGES.length - 1;


export default function Bar2Screen() {
  // Inside music starts after entrance animation ends
  const { setBar2Visible } = useContext(MusicContext);

  useFocusEffect(
    useCallback(() => {
      setBar2Visible(true);
      return () => setBar2Visible(false);
    }, [setBar2Visible])
  );

  const router = useRouter();
  const params = useLocalSearchParams<{
    cameFromEntrance?: string;
    fromBathroomFirst?: string;
  }>();

  const cameFromEntrance =
    params.cameFromEntrance === "true" ||
    params.cameFromEntrance === "1" ||
    params.cameFromEntrance === true;

  const fromBathroomFirst =
    params.fromBathroomFirst === "true" ||
    params.fromBathroomFirst === "1" ||
    params.fromBathroomFirst === true;

  const { profileComplete } = useContext(ProfileContext);
  

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
  });

  // --- stage (art space) geometry
  const { width: sw, height: sh } = useWindowDimensions();
  const shortSide = Math.min(sw, sh);

  // Small screens: reduce front height fraction
  const FRONT_HEIGHT_FRAC =
    shortSide < 360
      ? 0.54 // very small (your 4.65")
      : shortSide < 400
      ? 0.58 // small/compact
      : 0.64; // normal/tall

  //const [stageH, setStageH] = useState<number | null>(null); // exact visible height above navbar
  const containerW = sw;

  //const visibleH   = stageH ?? (sh - 72); // fallback until we measure navbar
  const [navHeight, setNavHeight] = useState(0);
  const insets = useSafeAreaInsets();
  // Safe, device-correct visible area above the navbar (or full height if no navbar)
  const [topNavH, setTopNavH] = useState(0); // fixed navbar height

const { setShowWcButton } = useContext(NavbarContext);


  const [stageH, setStageH] = useState<number | null>(null);
  const hasBottomBar = !!profileComplete;
  const baseStageH = Math.max(0, sh - topNavH);
  const visibleH = baseStageH + (hasBottomBar ? 0 : insets.bottom);

  const effectiveH =
    stageH ?? Math.max(0, sh - topNavH - (profileComplete ? navHeight : 0));

  // COVER the available area with bg art
  const scaleArt = containerW / BGW;
  const dispW = containerW;
  const dispH = BGH * scaleArt;

  const offsetX = 0; // no side gaps
  const offsetY = 0;

  const START_BUTTON_EXTRA_RAISE = 0; // tweak to taste

  // --- Avatars row placement (relative to FRONT image) ---

  // ---- Start button geometry (relative to FRONT image) ----
  const BTN_W_FRAC = 0.9; // 90% of visible art width
  const BTN_H_FRAC = 0.085; // ~8.5% of visible art height
  const desiredBottomGap = hasBottomBar ? insets.bottom + 16 : 24;

  const btnW = Math.round(dispW * BTN_W_FRAC);
  const btnH = Math.round(Math.max(56, Math.min(76, dispH * BTN_H_FRAC))); // clamp for tiny/huge screens
  const btnLeft = Math.round(offsetX + (dispW - btnW) / 2);
  // place it just ABOVE the FRONT image (uses its *top* edge)
  const BTN_GAP_PX = 20; // ~20px above the front
  const btnTop = Math.max(
    8,
    Math.round((stageH ?? effectiveH) - btnH - desiredBottomGap)
  );

  const MINGLES_IMG = require("../assets/images/mr-mingles.png");
  const { width: MINGLES_W, height: MINGLES_H } =
    Image.resolveAssetSource(MINGLES_IMG);
  const MINGLES_AR = MINGLES_W / MINGLES_H;

  // Get FRONT aspect ratio
  const { width: FRONT_W, height: FRONT_H } =
    Image.resolveAssetSource(FRONT_IMG);
  const FRONT_AR = FRONT_W / FRONT_H;

  // Use the actual stage height once measured; fall back to computed visible area
  const stageAvailH = stageH ?? effectiveH;

  // Allow the bar to be bigger (so it feels “taller”) on mainstream tall phones
  const MAX_FRONT_FRAC =
    shortSide < 380
      ? 0.56 // tiniest phones: still visible but not huge
      : shortSide < 400
      ? 0.62 // compact phones
      : 0.7; // normal/tall phones → taller bar

  // Also enforce a floor so it's never “invisible” on very small screens
  const MIN_FRONT_FRAC =
    shortSide < 360
      ? 0.32 // tiny phones: guarantee presence
      : shortSide < 400
      ? 0.3
      : 0.28;

  // First try: make it full-width so it touches left/right edges
  const baseFrontWidth = dispW;
  const baseFrontHeight = baseFrontWidth / FRONT_AR;

  // Clamp height between min and max fractions of the stage (not the bg art)
  const frontMaxH = stageAvailH * MAX_FRONT_FRAC;
  const frontMinH = stageAvailH * MIN_FRONT_FRAC;
  const clampedHeight = Math.max(
    frontMinH,
    Math.min(baseFrontHeight, frontMaxH)
  );

  // If clamped down, width must preserve aspect
  const frontWidth = dispW; // edge-to-edge
  const frontHeight = dispW / FRONT_AR; // preserve aspect

  // If we didn’t clamp, width==dispW and we hit both edges.
  // If we did clamp (on tiny phones), width < dispW; center it.
  const frontLeft = offsetX;

  // Anchor to the **bottom of the stage**, not the bottom of the bg art,
  // so it never “floats” off-screen on short devices.
  const FRONT_Y_NUDGE_PX = 120;
  const frontTop = stageAvailH - frontHeight + FRONT_Y_NUDGE_PX;

  const STOOLS_ROW_Y_FRAC = 0.45;
  const STOOLS_ROW_NUDGE_PX = 16;

  const AVATAR_SIZE_PCT_OF_FRONT = 0.18;
  const AVATAR_GAP_FRAC_OF_WIDTH = 0.12;

  const AVATAR_SIZE_PX = Math.round(frontHeight * AVATAR_SIZE_PCT_OF_FRONT);
  const AVATAR_GAP_PX = dispW * AVATAR_GAP_FRAC_OF_WIDTH;

  // helpers in art space
  const rect = (x: number, y: number, w: number, h: number, extra?: any) => ({
    position: "absolute" as const,
    left: offsetX + x * dispW,
    top: offsetY + y * dispH,
    width: w * dispW,
    height: h * dispH,
    ...(extra || {}),
  });

  // --- “TV” box (fractions from your original code)
  const TV = {
    x: 0.525,
    y: 0.163,
    w: 0.28,
    h: 0.11,
  };

  // --- onboarding / welcome state
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [welcomeDisplayed, setWelcomeDisplayed] = useState("");
  const [welcomeTyping, setWelcomeTyping] = useState(true);
  const [pointerTarget, setPointerTarget] = useState<
    "mingles" | "bathroom" | null
  >(null);
  const [minglesFrame, setMinglesFrame] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [minglesBox, setMinglesBox] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  // pre-start bubble (blank) visibility
  const [bubbleVisible, setBubbleVisible] = useState(true);

  // slide-in for the avatars row
  const avatarsX = useRef(new Animated.Value(width)).current; // start off-screen right
  const avatarsOpacity = useRef(new Animated.Value(0)).current; // fade in

  const isFocused = useIsFocused();
  const pulse = useRef(new Animated.Value(0)).current;
  const { triggerSpend } = useContext(MoneysContext);

  const aspect = sh / sw;
  const M_W = shortSide < 380 ? 0.5 : shortSide < 400 ? 0.5 : 0.52;
  const M_H = shortSide < 380 ? 0.5 : shortSide < 400 ? 0.63 : 0.66;

  // lower him a bit everywhere
  const minglesY =
    shortSide < 380
      ? 0.12
      : shortSide < 400
      ? 0.2
      : aspect > 2.05
      ? 0.225
      : 0.215;

  const MINGLES_PRE = { x: 0.23, y: minglesY, w: M_W, h: M_H };

  const pointerNudgeY = (() => {
    // Move pointer UP a bit on smaller device
    if (shortSide < 380) return -104; // very small
    if (shortSide < 400) return -14; // small/compact
    return 0; // normal/tall → no change
  })();

  // choose a safe bubble height
  const bubbleH = Math.min(Math.round(dispH * 0.18), 140); // max ~140px

  // Build rects *inside* the FRONT image (x,y,w,h are 0..1 in FRONT coords)
  const rectInFront = (
    x: number,
    y: number,
    w: number,
    h: number,
    extra?: any
  ) => ({
    position: "absolute" as const,
    left: frontLeft + x * frontWidth,
    top: frontTop + y * frontHeight,
    width: w * frontWidth,
    height: h * frontHeight,
    ...(extra || {}),
  });

  // FRONT-anchored placement for Mr. Mingles
  // Slightly lower on *very* small devices so he doesn't clip
  const minglesFrontY =
    shortSide < 380
      ? 0.06 // very small
      : shortSide < 400
      ? -0.0 // compact
      : -0.02; // normal/tall

  // Width/height as a fraction of FRONT; tweak to taste
  const MINGLES_F = { x: 0.18, y: minglesFrontY, w: 0.68, h: 0.95 };

  // Hit area independent of the image (same FRONT-anchored logic).
  // Tweak these if you want the tappable box tighter/looser than the art.
  const MINGLES_TAP = {
    x: MINGLES_F.x + 0.02,
    y: MINGLES_F.y + 0.06,
    w: MINGLES_F.w * 0.96,
    h: MINGLES_F.h * 0.72,
  };

  // Handy pixel helpers for pointer placement derived from FRONT coords
  const toPxLeft = (xf: number) => frontLeft + xf * frontWidth;
  const toPxTop = (yf: number) => frontTop + yf * frontHeight;

  // How much to raise the background art (in px; tweak to taste)
  const BAR_BACK_SHIFT = 60;

  const rectOnBack = (
    x: number,
    y: number,
    w: number,
    h: number,
    extra?: any
  ) => ({
    position: "absolute" as const,
    left: offsetX + x * dispW,
    top: offsetY - BAR_BACK_SHIFT + y * dispH, // 👈 match the raised BG
    width: w * dispW,
    height: h * dispH,
    ...(extra || {}),
  });

  const skipOpacity = useRef(new Animated.Value(0)).current;
  const pointerOpacity = useRef(new Animated.Value(0)).current;

  // toast for “message sent / Chit Chat Sent”
  const [toastText, setToastText] = useState<string | null>(null);


  // “don’t be a creep” popup
  const [creepVisible, setCreepVisible] = useState(false);
  const creepRollAnim = useRef(new Animated.Value(500)).current;
  const [creepTyped, setCreepTyped] = useState("");
  const CREEP_TEXT = "Wait for them to answer. Don't be a creep!";

  const isLastWelcome = !profileComplete && welcomeIndex === LAST_WELCOME_INDEX;

  // Privacy & Security
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  // Blocked list + settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedOpen, setBlockedOpen] = useState(false);

  // Link guard
  const [noLinksVisible, setNoLinksVisible] = useState(false);

  useEffect(() => {
  // Default off unless we explicitly enable it
  const shouldShow =
    // Only relevant during onboarding flow in the bar
    !profileComplete &&
    cameFromEntrance &&
    // Only when we're on the final message AND it's fully displayed (not still typing)
    welcomeIndex === LAST_WELCOME_INDEX &&
    !welcomeTyping;

  setShowWcButton(shouldShow);

  // Safety cleanup so it doesn't "stick" when leaving the screen
  return () => setShowWcButton(false);
}, [profileComplete, cameFromEntrance, welcomeIndex, welcomeTyping, setShowWcButton]);

  //MM speech bubble texts
  const [mmBubbleIndex, setMmBubbleIndex] = useState(0);

  // Automatically mark user "in the bar" when they come from the Entrance
  useEffect(() => {
    if (!auth.currentUser) return;
    if (!cameFromEntrance) return;

    try {
      const db = getDatabase();
      const statusRef = rtdbRef(db, `status/${auth.currentUser.uid}`);
      rtdbUpdate(statusRef, {
        online: true,
        bar: true,
        lastActive: Date.now(),
      }).catch(() => {});
    } catch (e) {
      console.warn("Failed to set bar status on entrance:", e);
    }
  }, [cameFromEntrance, auth.currentUser?.uid]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const myRef = doc(firestore, "users", auth.currentUser.uid);
    const unsub = onSnapshot(myRef, async (snap) => {
      const data: any = snap.data() || {};
      const ids: string[] = Array.isArray(data.blocked) ? data.blocked : [];
      setBlockedIds(ids);

      const users: any[] = [];
      for (const uid of ids) {
        try {
          const s = await getDoc(doc(firestore, "users", uid));
          if (s.exists()) users.push({ id: s.id, ...(s.data() as any) });
        } catch {}
      }
      setBlockedUsers(users);
    });
    return () => unsub();
  }, []);

  // pointer pulse
  useEffect(() => {
    if (!pointerTarget) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pointerTarget]);

  const pointerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  // welcome pointer logic
  useEffect(() => {
    if (profileComplete) return;
    if (welcomeTyping) return;

    if (welcomeIndex === 0) {
      setPointerTarget("mingles");
    } else if (welcomeIndex === LAST_WELCOME_INDEX) {
      setPointerTarget("bathroom");
    } else {
      setPointerTarget(null);
    }
  }, [welcomeTyping, welcomeIndex, profileComplete]);

  useEffect(() => {
    Animated.timing(creepRollAnim, {
      toValue: creepVisible ? 0 : 500,
      duration: creepVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [creepVisible]);

  useEffect(() => {
    let id: NodeJS.Timeout | undefined;
    if (creepVisible) {
      setCreepTyped("");
      let i = 0;
      id = setInterval(() => {
        i++;
        setCreepTyped(CREEP_TEXT.substring(0, i));
        if (i >= CREEP_TEXT.length) clearInterval(id);
      }, 30);
    } else {
      setCreepTyped("");
    }
    return () => id && clearInterval(id);
  }, [creepVisible]);

    // restore started + overlay behavior from storage + entrance + first-time bathroom
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const everVal = await AsyncStorage.getItem("bar2HasEverStarted");
        if (!alive) return;

        const everStarted = everVal === "true";
        setHasEverStarted(everStarted);

        // 1) Coming from Entrance or first-time Bathroom:
        // ALWAYS show Start Chatting, even if they’ve used the bar before.
        if (cameFromEntrance || fromBathroomFirst) {
          setStarted(false);
          setShowStartOverlay(true);
          return;
        }

        // 2) Not from Entrance/Bathroom:
        // If they have ever pressed Start Chatting, skip overlay forever.
        if (everStarted) {
          setStarted(true);
          setShowStartOverlay(false);
        } else {
          // First ever visit to bar not via entrance → show overlay once.
          setStarted(false);
          setShowStartOverlay(true);
        }
      } catch {
        // Fallback: let them see the bar normally
        setStarted(true);
        setShowStartOverlay(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isFocused, cameFromEntrance, fromBathroomFirst]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        await AsyncStorage.removeItem("bar2HasEverStarted");
        setStarted(false);
        setShowStartOverlay(false);
        setHasEverStarted(false);
      }
    });
    return () => unsub();
  }, []);

  // welcome typing effect
  useEffect(() => {
    if (!profileComplete) {
      const current = WELCOME_MESSAGES[welcomeIndex] || "";
      setWelcomeDisplayed("");
      setWelcomeTyping(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        if (i > current.length) {
          clearInterval(interval);
          setWelcomeTyping(false);
        } else {
          setWelcomeDisplayed(current.substring(0, i));
        }
      }, 22);
      return () => clearInterval(interval);
    }
  }, [welcomeIndex, profileComplete]);

  const handleWelcomeAdvance = () => {
    if (welcomeTyping) return;
    if (welcomeIndex < WELCOME_MESSAGES.length - 1) {
      setWelcomeIndex(welcomeIndex + 1);
    }
  };

  const skipWelcome = () => {
    const finalMsg = WELCOME_MESSAGES[LAST_WELCOME_INDEX];
    setWelcomeIndex(LAST_WELCOME_INDEX);
    setWelcomeTyping(false);
    setWelcomeDisplayed(finalMsg);
    setPointerTarget("bathroom");
  };

  // skip button fade-in
  useEffect(() => {
    if (!profileComplete && cameFromEntrance) {
      Animated.timing(skipOpacity, {
        toValue: 1,
        duration: 600, // fade-in duration
        delay: 2000, // wait 2 seconds
        useNativeDriver: true,
      }).start();
    }
  }, [profileComplete, cameFromEntrance]);

  // skip button fade-in
  useEffect(() => {
    if (!profileComplete && cameFromEntrance) {
      Animated.timing(pointerOpacity, {
        toValue: 1,
        duration: 600, // fade-in duration
        delay: 1200, // wait 2 seconds
        useNativeDriver: true,
      }).start();
    }
  }, [profileComplete, cameFromEntrance]);

  // Existing chat bar state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // start state
  const [started, setStarted] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(false);
  const [hasEverStarted, setHasEverStarted] = useState(false);

  const [leaving, setLeaving] = useState(false);

  const [showDrinkSpeech, setShowDrinkSpeech] = useState(false);

  // new chats
  const [firstMessageModalVisible, setFirstMessageModalVisible] =
    useState(false);
  const [firstMessageText, setFirstMessageText] = useState("");
  const [sendingFirstMessage, setSendingFirstMessage] = useState(false);

  // chitchats modal
  const [chitChatModalVisible, setChitChatModalVisible] = useState(false);
  const [ccStep, setCcStep] = useState<"choose" | "show">("choose");
  const [selectedCc, setSelectedCc] = useState<SavedChat | null>(null);
  const [replyText, setReplyText] = useState("");

  const videoRef = useRef<Video>(null);
  const [tvOn, setTvOn] = useState(false);

  const [deletionFlag, setDeletionFlag] = useState<"you" | "them" | null>(null); // who deleted
  const [checkingDeletion, setCheckingDeletion] = useState(false);
  const [hasIncomingOnly, setHasIncomingOnly] = useState(false);
  const [hasTwoWayHistory, setHasTwoWayHistory] = useState(false);


  const [introPlayed, setIntroPlayed] = useState<boolean>(false);

  //MM bar speech bubble_reset
  useEffect(() => {
    if (showStartOverlay) {
      setMmBubbleIndex(0);
    }
  }, [showStartOverlay]);

  const handleMinglesBubbleAdvance = () => {
    setMmBubbleIndex((prev) => (prev + 1) % BAR_MM_SPEEACH_BUBBLE.length);
  };

  // presence

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = collection(firestore, "users");

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs
          .filter((d) => d.id !== auth.currentUser!.uid)
          .map((d) => ({ id: d.id, ...(d.data() as any) }));

        setProfiles(all);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [auth.currentUser?.uid]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem("bar2IntroPlayed");
        if (!alive) return;
        const played = v === "true";
        setIntroPlayed(played);
        // for post-onboarding (profileComplete && !started) show empty bubble once
        if (played) setBubbleVisible(true);
        if (!played) await AsyncStorage.setItem("bar2IntroPlayed", "true");
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    // if (started && tvOn) {
    videoRef.current.playAsync().catch(() => {});
    // } else {
    //   videoRef.current.pauseAsync().catch(() => {});
    // }
  }, []);

  const toggleTV = () => setTvOn((prev) => !prev);

  useEffect(() => {
    if (started && videoRef.current) {
      videoRef.current.playAsync().catch(console.warn);
    }
  }, [started]);

  // mapping ChatType → human label
  const chatLabelMap: Record<ChatType, string> = {
    "what-happened": "What Happened Next?",
    "if-you-were-me": "If You Were Me",
    "complete-poem": "Complete a Poem",
    "unpopular-opinion": "Unpopular Opinion",
    "dont-usually-ask": "I Don’t Usually Ask That",
    "emoji-story": "Emoji To Story",
  };

  // 1) fetch all other users
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(firestore, "users"));
        const all = snap.docs
          .filter((d) => auth.currentUser && d.id !== auth.currentUser.uid)
          .map((d) => ({ id: d.id, ...(d.data() as any) }));
        setProfiles(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [openVal, idVal] = await Promise.all([
          AsyncStorage.getItem(PROFILE_MODAL_KEY),
          AsyncStorage.getItem(PROFILE_ID_KEY),
        ]);
        if (!alive) return;

        if (openVal === "true" && idVal) {
          const found = profiles.find(p => p.id === idVal);
          if (found) {
            setSelectedProfile(found);
            setModalVisible(true);
          }
        }
      } catch (e) {
        console.log("restore profile modal failed", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [profiles]);


  // 2) subscribe to realtime online status
  useEffect(() => {
    const db = getDatabase();
    const unsub: Array<() => void> = [];
    const TEN_MIN = 10 * 60 * 1000;

    profiles.forEach((p) => {
      if (!p?.id) return;

      const statusRef = rtdbRef(db, `status/${p.id}`);

      const off = onValue(statusRef, (snap) => {
        const s = snap.val() || {};

        const fresh =
          typeof s.lastActive === "number" &&
          Date.now() - s.lastActive < TEN_MIN;

        const isOnline = Boolean(s.online) && Boolean(s.bar) && fresh;

        setOnlineStatus((prev) => {
          if (prev[p.id] === isOnline) return prev;
          return { ...prev, [p.id]: isOnline };
        });
      });

      unsub.push(off);
    });

    return () => unsub.forEach((u) => u());
  }, [profiles]);

  // When the profile modal opens, figure out deletion + whether they already messaged you
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!modalVisible || !selectedProfile || !auth.currentUser) {
        if (alive) {
          setDeletionFlag(null);
          setHasIncomingOnly(false);
          setHasTwoWayHistory(false);
        }
        return;
      }

      setCheckingDeletion(true);
      const currentUid = auth.currentUser.uid;
      const partnerId = selectedProfile.id;
      const chatId = [currentUid, partnerId].sort().join("_");

      try {
        const chatRef = doc(firestore, "chats", chatId);
        const snap = await getDoc(chatRef);

        let localDeletion: "you" | "them" | null = null;
        let incomingOnly = false;

        if (snap.exists()) {
          const data: any = snap.data();
          const vf: string[] = Array.isArray(data?.visibleFor)
            ? data.visibleFor
            : [];

          if (!vf.includes(partnerId)) {
            localDeletion = "them";
          } else if (!vf.includes(currentUid)) {
            localDeletion = "you";
          }

          // Only bother checking messages if the chat exists
          const msgsRef = collection(firestore, "chats", chatId, "messages");
          const msgsSnap = await getDocs(
            query(msgsRef, orderBy("createdAt", "asc"), limit(10))
          );

          if (!msgsSnap.empty) {
            let anyFromThem = false;
            let anyFromMe = false;

            msgsSnap.forEach((d) => {
              const m = d.data() as any;
              if (m.sender === currentUid) anyFromMe = true;
              if (m.sender === partnerId) anyFromThem = true;
            });

            // “They already sent you a message” = they’ve sent something, you haven’t
            incomingOnly = anyFromThem && !anyFromMe;

            // Ongoing convo = both have sent at least one message
            const twoWay = anyFromThem && anyFromMe;

            if (!alive) return;

            setHasTwoWayHistory(twoWay && !localDeletion); // don’t treat deleted chats as ongoing
          } else {
            if (!alive) return;
            setHasTwoWayHistory(false);
          }

        }

        if (!alive) return;

        setDeletionFlag(localDeletion);
        // If they deleted the chat, we want the “deleted” UX to win, not “incoming”
        setHasIncomingOnly(incomingOnly && localDeletion !== "them");
      } catch (e: any) {
        if (e?.code === "permission-denied") {
          if (alive) {
            setDeletionFlag("you");
            setHasIncomingOnly(false);
          }
        } else {
          console.error("checkDeletionStatus error:", e);
        }
      } finally {
        if (alive) setCheckingDeletion(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [modalVisible, selectedProfile]);

  const PROFILE_MODAL_KEY = "bar2ProfileModalOpen";
  const PROFILE_ID_KEY = "bar2SelectedProfileId";

  const openProfileModal = (profile: any) => {
    setSelectedProfile(profile);
    setModalVisible(true);
    setShowDrinkSpeech(false);

    AsyncStorage.multiSet([
      [PROFILE_MODAL_KEY, "true"],
      [PROFILE_ID_KEY, profile.id],
    ]).catch(() => {});
  };

  const closeProfileModal = () => {
    setModalVisible(false);
    setSelectedProfile(null);
    setHasTwoWayHistory(false);

    AsyncStorage.multiRemove([PROFILE_MODAL_KEY, PROFILE_ID_KEY]).catch(() => {});
  };



  

  const deletedByThem = deletionFlag === 'them';
  const deletedByYou = deletionFlag === 'you';
  const messagingBlocked = deletedByYou;

  // If this profile goes offline while their card is open
  const isSelectedOffline = !!(
    selectedProfile && onlineStatus[selectedProfile.id] === false
  );

  const myUid = auth.currentUser?.uid;
  const filtered = profiles.filter((p) => {
    const theyBlockedMe =
      Array.isArray(p.blocked) && myUid ? p.blocked.includes(myUid) : false;
    const iBlockedThem = blockedIds.includes(p.id);
    const isReady =
      p.profileComplete === true || (!!p.name && p.name.length > 0);

    return onlineStatus[p.id] && !theyBlockedMe && !iBlockedThem && isReady;
  });
  const onlineProfiles = filtered;

  // animate the avatars row once when it first appears
  const shouldAnimateAvatars = started && onlineProfiles.length > 0;
  const avatarsShownRef = useRef(false);

  useEffect(() => {
    if (!shouldAnimateAvatars) {
      avatarsShownRef.current = false;
      avatarsX.setValue(width);
      avatarsOpacity.setValue(0);
      return;
    }
    if (avatarsShownRef.current) return;

    avatarsX.setValue(width);
    avatarsOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(avatarsX, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(avatarsOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      avatarsShownRef.current = true;
    });
  }, [shouldAnimateAvatars, width]);

  // Prepare drink data for selected profile
  const profileDrink =
    typeof selectedProfile?.drink === "string"
      ? selectedProfile.drink.toLowerCase()
      : "water";
  const drinkIcon = drinkMapping[profileDrink] || drinkMapping["water"];
  const isWater = profileDrink === "water";
  const drinkWidth = isWater ? scale(35) : scale(50);
  const drinkHeight = isWater ? scale(75) : scale(70);
  const drinkText = drinkTextMapping[profileDrink] || drinkTextMapping["water"];

  //const navHeightGuess = sh - (stageH ?? (sh - 72));
  //const buttonBottomGap = navHeightGuess + 90; // ~20px above navbar
  useEffect(() => {
    if (Platform.OS !== "android") return;

    // Let content extend under the nav and match its color to the scene
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});
    NavigationBar.setBackgroundColorAsync("#592540").catch(() => {});
    NavigationBar.setButtonStyleAsync("light").catch(() => {});
  }, [profileComplete]);

  const startOffsetPx = width * START_OFFSET_RATIO;

  const profileChats: SavedChat[] = selectedProfile?.chitchats ?? [];

  const hasChitChats = profileChats.length > 0;
  const showChatButton =
    !hasChitChats || (hasChitChats && !selectedProfile?.chitchatsRequired);
  const showChitChatButton = hasChitChats;

  const buttonContainerStyle = [
    styles.bottomButtons,
    showChatButton !== showChitChatButton
      ? { justifyContent: "center" }
      : { justifyContent: "space-around" },
  ];

  const openFirstMessageModal = () => {
    // Keep the profile modal visible behind
    setFirstMessageModalVisible(true);
  };

  const openChitChatModal = () => {
    setCcStep("choose");
    setSelectedCc(null);
    setReplyText("");
    setModalVisible(false);
    setTimeout(() => setChitChatModalVisible(true), 50);
  };

  async function blockUser(uidToBlock: string) {
    if (!auth.currentUser) return;

    Alert.alert("Block user?", "They will be hidden and cannot contact you.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(firestore, "users", auth.currentUser.uid), {
              blocked: arrayUnion(uidToBlock),
            });
            setModalVisible(false);
            setSafetyOpen(false);
            Alert.alert("Done", "User is now blocked and hidden.");
            setProfiles((prev) => prev.filter((p) => p.id !== uidToBlock));
          } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not block user. Try again.");
          }
        },
      },
    ]);
  }

  async function unblockUser(uidToUnblock: string) {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(firestore, "users", auth.currentUser.uid), {
        blocked: arrayRemove(uidToUnblock),
      });
      setBlockedIds((b) => b.filter((id) => id !== uidToUnblock));
      setBlockedUsers((u) => u.filter((u2) => u2.id !== uidToUnblock));
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not unblock. Try again.");
    }
  }

  const REPORT_REASONS = [
    "Harassment or bullying",
    "Hate speech or discrimination",
    "Threats or violence",
    "Sexual content or nudity",
    "Scam or fraud",
    "Spam",
    "Impersonation",
    "Underage account",
    "Self-harm concerns",
    "Illegal activity",
    "Off-platform contact pressure",
    "Other",
  ];

  function buildReportEmailBody() {
    const reporter = auth.currentUser;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const when = new Date().toISOString();

    const target = selectedProfile || {};
    const payload = {
      reason: reportReason,
      notes: reportNotes.trim(),
      whenISO: when,
      locale,
      timeZone: tz,
      reporter: {
        uid: reporter?.uid || "",
        email: reporter?.email || "",
      },
      reportedUser: {
        uid: target.id || "",
        name: target.name || "",
        age: target.age || "",
        location: target.location || "",
      },
    };

    return [
      "Dateish Safety Report",
      "",
      `Reason: ${payload.reason}`,
      `Notes: ${payload.notes || "(none)"}`,
      "",
      `Time: ${payload.whenISO} (${payload.timeZone}, ${payload.locale})`,
      "",
      "Reporter:",
      `- uid: ${payload.reporter.uid}`,
      `- email: ${payload.reporter.email}`,
      "",
      "Reported user:",
      `- uid: ${payload.reportedUser.uid}`,
      `- name: ${payload.reportedUser.name}`,
      `- age: ${payload.reportedUser.age}`,
      `- location: ${payload.reportedUser.location}`,
    ].join("\n");
  }

  const goToChatFromProfile = async () => {
    if (!auth.currentUser || !selectedProfile) return;

    const currentUserId = auth.currentUser.uid;
    const partnerId = selectedProfile.id;
    const chatId = [currentUserId, partnerId].sort().join("_");
    const chatDocRef = doc(firestore, "chats", chatId);

    try {
      const snap = await getDoc(chatDocRef);

      if (!snap.exists()) {
        // Make sure the chat exists so ChatScreen has a doc to work with
        await setDoc(chatDocRef, {
          users: [currentUserId, partnerId],
          visibleFor: [currentUserId, partnerId],
          updatedAt: serverTimestamp(),
          lastMessage: "",
          lastMessageSender: null,
        });
      } else {
        // Make sure it's visible for both again
        await updateDoc(chatDocRef, {
          visibleFor: arrayUnion(currentUserId, partnerId),
        });
      }

      // Now safely close overlays
      setModalVisible(false);
      setChitChatModalVisible(false);
      setFirstMessageModalVisible(false);

      // ✅ Navigate to the real chat screen
      router.push({
        pathname: "/chat",
        params: {
          partner: partnerId,   // what ChatScreen.tsx expects
          // you can add `fromBar: "true"` too if you ever want special behavior there
        },
      } as any);
    } catch (err) {
      console.error("goToChatFromProfile error:", err);
      Alert.alert(
        "Error",
        "We couldn't open this chat right now. Please try again."
      );
    }
  };





  async function sendReportEmail() {
    try {
      setSendingReport(true);
      const subject = `Dateish report — ${
        reportReason || "No reason selected"
      }`;
      const body = buildReportEmailBody();

      const can = await MailComposer.isAvailableAsync();
      if (can) {
        await MailComposer.composeAsync({
          recipients: ["dateish.office@gmail.com"],
          subject,
          body,
        });
      } else {
        const mailto = `mailto:dateish.office@gmail.com?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(body)}`;
        Linking.openURL(mailto);
      }

      setReportOpen(false);
      setSafetyOpen(false);
      setReportReason(null);
      setReportNotes("");

      Alert.alert("Thank you for helping to make Dateish safer!", "", [
        {
          text: "Email us more details",
          onPress: () =>
            Linking.openURL(
              `mailto:dateish.office@gmail.com?subject=${encodeURIComponent(
                "Dateish report follow-up"
              )}`
            ),
        },
        { text: "Close" },
      ]);
    } finally {
      setSendingReport(false);
    }
  }

  const linkRx = /(https?:\/\/|www\.)\S+/gi;
  function stripLinksAndWarn(txt: string, setFn: (s: string) => void) {
    if (linkRx.test(txt)) {
      const cleaned = txt.replace(linkRx, "").trim();
      setFn(cleaned);
      setNoLinksVisible(true);
    } else {
      setFn(txt);
    }
  }

    // Shared helper: can I send another message to this person?
  const canSendInitialToSelected = async (): Promise<boolean> => {
    if (messagingBlocked || !auth.currentUser || !selectedProfile) return false;

    try {
      const currentUserId = auth.currentUser.uid;
      const partnerId = selectedProfile.id;
      const chatId = [currentUserId, partnerId].sort().join("_");
      const chatDocRef = doc(firestore, "chats", chatId);

      const chatSnap = await getDoc(chatDocRef);

      // No chat at all → first contact is allowed
      if (!chatSnap.exists()) return true;

      const msgsRef = collection(firestore, "chats", chatId, "messages");
      const msgsSnap = await getDocs(
        query(msgsRef, orderBy("createdAt", "asc"), limit(50))
      );

      // No messages → treat as fresh convo
      if (msgsSnap.empty) return true;

      let mySent = 0;
      let theirSent = 0;

      msgsSnap.forEach((d) => {
        const m = d.data() as any;
        const senderId = m.sender || m.senderId || m.from;
        if (!senderId) return;
        if (senderId === currentUserId) mySent++;
        else if (senderId === partnerId) theirSent++;
      });

      // 🚨 CREEP RULE:
      // You’ve sent stuff, they haven’t replied at all → block
      if (mySent > 0 && theirSent === 0) {
        setCreepVisible(true);
        return false;
      }

      // Otherwise it’s either first time OR there’s 2-way history → OK
      return true;
    } catch (err) {
      console.error("canSendInitialToSelected failed:", err);
      Alert.alert(
        "Error",
        "We couldn't check your chat history right now. Try again in a moment."
      );
      return false;
    }
  };


  const handleChatPress = async () => {
    const ok = await canSendInitialToSelected();
    if (!ok) return;

    // If allowed, behave like normal Chat: open the first-message modal
    openFirstMessageModal();
  };

  const handleChitChatPress = async () => {
    const ok = await canSendInitialToSelected();
    if (!ok) return;

    // If allowed, proceed with the existing Chit Chat flow
    openChitChatModal();
  };




  const onMinglesPress = () => {
    if (welcomeTyping) return;
    setPointerTarget(null);
    handleWelcomeAdvance();
  };

  const sendFirstMessage = async () => {
    if (!firstMessageText.trim() || messagingBlocked) return;

    setSendingFirstMessage(true);

    try {
      // NOTE: Temporarily disable charging Moneys to start a chat.
      // When you want to turn this back on, restore:
      //   const cost = getMessageCost();
      //   await spendMoneys({ amount: cost, reason: "start-chat-first-message" });
      //   triggerSpend(cost);

      const currentUserId = auth.currentUser!.uid;
      const partnerId = selectedProfile.id;
      const chatId = [currentUserId, partnerId].sort().join("_");
      const chatDocRef = doc(firestore, "chats", chatId);

      const chatSnap = await getDoc(chatDocRef);
      if (!chatSnap.exists()) {
        await setDoc(chatDocRef, {
          users: [currentUserId, partnerId],
          visibleFor: [currentUserId, partnerId],
          updatedAt: serverTimestamp(),
          lastMessage: firstMessageText,
        });
      } else {
        await updateDoc(chatDocRef, {
          updatedAt: serverTimestamp(),
          lastMessage: firstMessageText,
          lastMessageSender: currentUserId,
          visibleFor: arrayUnion(currentUserId, partnerId),
        });
      }

      await addDoc(collection(firestore, "chats", chatId, "messages"), {
        text: firstMessageText,
        sender: currentUserId,
        createdAt: serverTimestamp(),
      });

      // Stay in browse – just close modal and show toast
      setFirstMessageText("");
      setFirstMessageModalVisible(false);
      closeProfileModal();
      setToastText("Message sent");

      setTimeout(() => setToastText(null), 2000);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Could not send message. Please try again.");
    } finally {
      setSendingFirstMessage(false);
    }
  };

  const sendChitChatReply = async (cc: SavedChat) => {
    const trimmed = replyText.trim();
    if (!trimmed || messagingBlocked || !auth.currentUser || !selectedProfile)
      return;

    try {
      const currentUserId = auth.currentUser.uid;
      const partnerId = selectedProfile.id;
      const chatId = [currentUserId, partnerId].sort().join("_");
      const chatDocRef = doc(firestore, "chats", chatId);
      const userIds = [currentUserId, partnerId];

      // Nice readable label
      const label = chatLabelMap[cc.type] || "Chit Chat";

      // You can tweak how this is formatted in the final message
      const combined = `${label}: ${cc.content}\n\n${trimmed}`;

      const chatSnap = await getDoc(chatDocRef);
      if (!chatSnap.exists()) {
        await setDoc(chatDocRef, {
          users: userIds,
          visibleFor: userIds,
          updatedAt: serverTimestamp(),
          lastMessage: combined,
          lastMessageSender: currentUserId,
        });
      } else {
        await updateDoc(chatDocRef, {
          updatedAt: serverTimestamp(),
          lastMessage: combined,
          lastMessageSender: currentUserId,
          visibleFor: arrayUnion(...userIds),
        });
      }

      await addDoc(collection(firestore, "chats", chatId, "messages"), {
        text: combined,
        sender: currentUserId,
        createdAt: serverTimestamp(),
        chitChat: {
          type: cc.type,
          prompt: cc.content,
          response: trimmed,
        },
      });

      // Reset UI, stay in the bar, show toast
      setReplyText("");
      setChitChatModalVisible(false);
      setCcStep("choose");
      setSelectedCc(null);
      setToastText("Chit Chat Sent");
      setTimeout(() => setToastText(null), 2000);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not send Chit Chat. Please try again.");
    }
  };

  // ─────────────────────────── RENDER ───────────────────────────
  return (
    <View
    style={{
      flex: 1,
      backgroundColor: "#592540",
      // cancel parent SafeArea bottom padding when there’s no BottomNavbar
      marginBottom: hasBottomBar ? 0 : -insets.bottom,
    }}
  >



      {/* ==== STAGE (locks all layers to the same art space) ==== */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: topNavH, // sits right under Navbar
          bottom: profileComplete ? navHeight : 0, // when no bottom bar, go to screen bottom
          backgroundColor: "#592540",
          overflow: "hidden",
        }}
        onLayout={(e) => setStageH(e.nativeEvent.layout.height)}
      >
        {/* Back layer (cover) */}
        <Image
          source={BG_IMG}
          style={{
            position: "absolute",
            left: offsetX,
            top: offsetY - BAR_BACK_SHIFT, // 👈 raise it
            width: dispW,
            height: dispH + BAR_BACK_SHIFT, // 👈 extend height so bottom doesn't show a gap
          }}
          resizeMode="stretch"
        />

        {profileComplete && (showStartOverlay || leaving) && (
          <View
            style={rectInFront(
              MINGLES_F.x,
              MINGLES_F.y,
              MINGLES_F.w,
              MINGLES_F.h,
              { zIndex: 29 }
            )}
            onLayout={(e) => setMinglesBox(e.nativeEvent.layout)}
          >
            <MMAnimated
              showBackground={false}
              showBarFront={false}
              showControls={false}
              enterOnMount
              leaving={leaving}
              minglesOffsetY={5}
              onLeaveComplete={() => {
                setLeaving(false);
                setShowStartOverlay(false); // ✅ Hide overlay after animation

                setStarted(true);
              }}
              onPress={() => {
                handleMinglesBubbleAdvance();
              }}
              style={StyleSheet.absoluteFill}
            ></MMAnimated>
          </View>
        )}

        {profileComplete && showStartOverlay && (
          <>
            {/* Bubble overlay */}
            <View
              style={{
                position: "absolute",
                left: btnLeft,
                top: btnTop - 50,
                width: btnW,
                height: btnH,
                zIndex: 40,
              },
            ]}
            onPress={async () => {
              setBubbleVisible(false);
              setLeaving(true);
              setShowStartOverlay(false);
              setTimeout(() => setStarted(true), 1100);

              try {
                const db = getDatabase();
                const statusRef = rtdbRef(db, `status/${auth.currentUser!.uid}`);
                rtdbUpdate(statusRef, {
                  online: true,
                  bar: true,
                  lastActive: Date.now(),
                }).catch(() => {});

                // Mark that they've started at least once
                setHasEverStarted(true);
                await AsyncStorage.setItem("bar2HasEverStarted", "true");
              } catch {}
            }}

          >
            <Text
              style={styles.startButtonText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}   // shrink instead of truncating
              ellipsizeMode="clip"     // just in case, don’t show "…"
            >
              <SpeechBubblePop
                source={require("../assets/images/speech-bubble.png")}
                visible={bubbleVisible}
                width={dispW * 0.9}
                height={dispW * 0.45}
                delayTime={800}
                anchor={{ x: 0.5, y: 0 }}
                onHidden={() => {
                  setShowStartOverlay(false);
                }}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 20,
                  }}
                >
                  <Text style={styles.bubbleText}>
                    {BAR_MM_SPEEACH_BUBBLE[mmBubbleIndex]}
                  </Text>
                </View>
              </SpeechBubblePop>
            </View>

            {/* Start Chatting button */}
            <TouchableOpacity
              style={[
                styles.startButton,
                {
                  position: "absolute",
                  left: btnLeft,
                  top: btnTop - 20,
                  width: btnW,
                  height: btnH,
                  zIndex: 40,
                },
              ]}
              onPress={async () => {
                // 👇 this is where you trigger the pop-out
                setBubbleVisible(false);

                setLeaving(true);
                // setShowStartOverlay(false); // ⬅ if you want to SEE the exit animation,
                // move this into onHidden instead.
                try {
                  const db = getDatabase();
                  const statusRef = rtdbRef(
                    db,
                    `status/${auth.currentUser!.uid}`
                  );
                  rtdbUpdate(statusRef, {
                    online: true,
                    bar: true,
                    lastActive: Date.now(),
                  }).catch(() => {});
                  await AsyncStorage.setItem("bar2ShowPrompt", "false");
                } catch {}
              }}
            >
              <Text
                style={styles.startButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                ellipsizeMode="clip"
              >
                Start Chatting
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* (WELCOME) Mr. Mingles image (static) + typed bubble only during onboarding */}
        {!profileComplete && cameFromEntrance && (
          <>
            {/* Mr. Mingles (FRONT-anchored) */}
            <View
              style={rectInFront(
                MINGLES_F.x,
                MINGLES_F.y,
                MINGLES_F.w,
                MINGLES_F.h,
                { zIndex: 9 }
              )}
              onLayout={(e) => setMinglesBox(e.nativeEvent.layout)} // ← capture absolute rect for pointers/hitboxes
            >
              <MMAnimated
                showBackground={false}
                showBarFront={false}
                showControls={false}
                enterOnMount
                style={StyleSheet.absoluteFillObject}
                minglesOffsetY={15}
                onPress={() => {
                  // 👈 this runs AFTER the internal wiggle is triggered
                  if (welcomeTyping) {
                    setWelcomeDisplayed(WELCOME_MESSAGES[welcomeIndex]);
                    setWelcomeTyping(false);
                  } else {
                    setPointerTarget(null);
                    handleWelcomeAdvance();
                  }
                }}
              />
            </View>

            {/* Speech bubble (typed) */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: offsetX + dispW * 0.05, // keep same side margins relative to art width
                top: 15, // 👈 2px under the stage top (stage already sits under Navbar)
                width: dispW * 0.9,
                height: BUBBLE_HEIGHT,
                zIndex: 30,
              }}
            >
              {/* <ImageBackground
                source={require("../assets/images/speech-bubble.png")}
                style={{ flex: 1 }}
                resizeMode="stretch"
              > */}
              <SpeechBubblePop
                source={require("../assets/images/speech-bubble.png")}
                visible={true}
                width={dispW * 0.9}
                height={dispW * 0.45}
                delayTime={800}
                anchor={{ x: 0.5, y: 0 }}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 20,
                  }}
                >
                  <Text style={styles.bubbleText}>{welcomeDisplayed}</Text>
                </View>
              </SpeechBubblePop>
              {/* </ImageBackground> */}
            </View>
          </>
        )}
        {!profileComplete &&
          cameFromEntrance &&
          pointerTarget === "mingles" && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                // near face/hand inside the tap box
                left: toPxLeft(MINGLES_TAP.x + MINGLES_TAP.w * 0.78) - 150,
                top: toPxTop(MINGLES_TAP.y + MINGLES_TAP.h * 0.22) - 30,
                zIndex: 2000,
                transform: [{ scale: pointerScale }, { rotate: "85deg" }],
                opacity: pointerOpacity,
              }}
            >
              <MaterialIcons name="pan-tool-alt" size={56} color="#ffe3d0" />
            </Animated.View>
          )}

        {!profileComplete &&
          cameFromEntrance &&
          pointerTarget === "bathroom" && (
            <View style={{ flex: 1, zIndex: 998 }}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pointerBase,
                  styles.pointerBathroom,
                  {
                    transform: [{ scale: pointerScale }, { rotate: "10deg" }],
                    zIndex: 999,
                  },
                ]}
              >
                <MaterialIcons name="pan-tool-alt" size={56} color="#ffe3d0" />
              </Animated.View>
            </View>
          )}

        {/* TV */}
        {profileComplete && (
          <Pressable
            onPress={toggleTV}
            style={[
              { zIndex: 28 }, // behind speech
              rectOnBack(TV.x, TV.y, TV.w, TV.h, {
                top: offsetY - 48 + TV.y * dispH,
              }),
            ]}
            accessibilityRole="button"
            accessibilityLabel={tvOn ? "Turn TV off" : "Turn TV on"}
          >
            <Video
              ref={videoRef}
              source={steamboat}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
              resizeMode="cover"
              isLooping
              shouldPlay={started && tvOn}
              useNativeControls={false}
              isMuted
            />
            {!tvOn && (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(16, 16, 16, 1)",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 12,
                }}
              >
                {/* <Text
                  style={{
                    color: "#ffe3d0",
                    fontFamily: FontNames.MontserratRegular,
                  }}
                >
                  —
                </Text> */}
              </View>
            )}
          </Pressable>
        )}

        {/* ONLINE ROW — anchored over stools */}
        {profileComplete && started && onlineProfiles.length > 0 && (
          <Animated.View
            style={[
              {
                position: "absolute",
                left: offsetX - 8.2,
                width: dispW,
                // Y is: top of FRONT + fraction of FRONT height, plus tiny pixel nudge
                top:
                  frontTop +
                  frontHeight * STOOLS_ROW_Y_FRAC +
                  STOOLS_ROW_NUDGE_PX,
                zIndex: 31,
                height: AVATAR_SIZE_PX, // keeps touch targets tidy
                justifyContent: "center",
              },
              {
                transform: [{ translateX: avatarsX }],
                opacity: avatarsOpacity,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: dispW * 0.085, // tie padding to art width so it scales
                paddingRight: dispW * 0.085,
                alignItems: "center",
                columnGap: AVATAR_GAP_PX, // consistent spacing across screens
              }}
            >
              {onlineProfiles.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={{
                    width: AVATAR_SIZE_PX,
                    height: AVATAR_SIZE_PX,
                    borderRadius: AVATAR_SIZE_PX / 2,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: "white",
                    marginRight: "8%",
                  }}
                  onPress={() => openProfileModal(p)}
                >
                  <Image
                    source={{ uri: p.photoUri }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Front layer (glass/bar) — fully visible on all devices */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: frontLeft,
            top: frontTop,
            width: frontWidth,
            height: frontHeight + 15,
            zIndex: 30,
          }}
        >
          <Image
            source={FRONT_IMG}
            style={
              profileComplete
                ? { width: "100%", height: "100%", bottom: "5%" }
                : { width: "100%", height: "100%", bottom: "12%" }
            }
            resizeMode="contain" // show the whole asset without distortion
          />
        </View>

        {/* FRONT-anchored tap area for Mingles (debug color shown) */}
        {/* {!profileComplete && (
          <Pressable
            onPress={() => {
              if (welcomeTyping) {
                setWelcomeDisplayed(WELCOME_MESSAGES[welcomeIndex]);
                setWelcomeTyping(false);
                return;
              }
              setPointerTarget(null);
              handleWelcomeAdvance();
            }}
            style={rectInFront(
              MINGLES_TAP.x,
              MINGLES_TAP.y,
              MINGLES_TAP.w,
              MINGLES_TAP.h,
              {
                zIndex: 50, // > bar-front zIndex(10) so it's definitely above
              }
            )}
            // Optional: keep layout for future diagnostics
            onLayout={(e) => setMinglesBox(e.nativeEvent.layout)}
          />
        )} */}
      </View>

      {/* Skip (always above stage so it can't be covered) */}
      {!profileComplete && cameFromEntrance && pointerTarget !== "bathroom" && (
        <Animated.View
          style={{
            opacity: skipOpacity,
            position: "absolute",
            top: topNavH + sh * 0.22,
            right: sw * 0.4,
            zIndex: 3000,
            elevation: 3000,
          }}
        >
          <TouchableOpacity
            onPress={skipWelcome}
            style={{
              backgroundColor: "#6e1944",
              borderWidth: 4,
              borderColor: "#460b2a",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              width: 70,
            }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ─── PROFILE DETAIL OVERLAY (non-blocking) ──────────────────── */}
      {modalVisible && (
        <View
          style={StyleSheet.absoluteFillObject}
          pointerEvents="box-none"          
        >
          <View
            style={styles.modalOverlay}
            pointerEvents="box-none"
          >
            <View
              style={styles.modalContent}
              pointerEvents="auto"          
            >{/*}
              {deletionFlag && (
                <View style={styles.deletionBanner}>
                  <Text style={styles.deletionBannerText}>
                    {deletionFlag === "you"
                      ? "You deleted this chat"
                      : "They deleted this chat"}
                  </Text>
                </View>
              )} */}

              <TouchableOpacity
                onPress={closeProfileModal}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >

                <Image
                  style={{ width: 20, height: 20 }}
                  source={require("../assets/images/x.png")}
                />
              </TouchableOpacity>

              {selectedProfile && (
                <>
                  <Image
                    source={{ uri: selectedProfile.photoUri }}
                    style={styles.modalImage}
                  />

                  {/* Drink icon + speech bubble */}
                  <TouchableOpacity
                    style={[
                      styles.drinkIcon,
                      { width: drinkWidth, height: drinkHeight },
                    ]}
                    onPress={() => setShowDrinkSpeech(!showDrinkSpeech)}
                  >
                    <Image
                      source={drinkIcon}
                      style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                      }}
                    />
                    {showDrinkSpeech && (
                      <View style={styles.drinkSpeechBubble}>
                        <Text style={styles.drinkSpeechBubbleText}>
                          {drinkText}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.modalText}>
                    <Text style={styles.modalName}>
                      {selectedProfile.name}, {selectedProfile.age}
                    </Text>
                    <Text style={styles.modalLocation}>
                      {selectedProfile.location}
                    </Text>
                    <Text style={styles.modalDescription}>
                      {selectedProfile.about}
                    </Text>
                  </View>

                  {/* Footer: different modes depending on chat status */}
                  {deletedByThem ? (
                    <>
                      <Text style={styles.infoLine}>
                        {selectedProfile.name} deleted your convo.
                      </Text>

                      <View
                        style={[
                          styles.bottomButtons,
                          { justifyContent: "center", marginTop: 10 },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.modalChatButton}
                          onPress={handleChatPress}   // behaves like "Chat" button
                        >
                          <Text style={styles.modalChatButtonText}>Go To Chat</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : deletedByYou ? (
                    <>
                      <Text style={styles.infoLine}>
                        You deleted this convo.
                      </Text>

                      <View
                        style={[
                          styles.bottomButtons,
                          { justifyContent: "center", marginTop: 10 },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.modalChatButton,
                            isSelectedOffline && styles.modalChatButtonDisabled,
                          ]}
                          onPress={handleChatPress}     // same "start a new first message" flow
                          disabled={isSelectedOffline}
                        >
                          <Text
                            style={[
                              styles.modalChatButtonText,
                              isSelectedOffline && styles.modalChatButtonTextDisabled,
                              {color: "red", fontWeight: "bold"}
                            ]}
                          >
                            Go To Chat
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )  : hasIncomingOnly ? (
                    <>
                      <Text style={styles.infoLine}>
                        {selectedProfile.name} already sent you a message.
                      </Text>

                      <View
                        style={[
                          styles.bottomButtons,
                          { justifyContent: "center", marginTop: 10 },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.modalChatButton}
                          onPress={goToChatFromProfile}
                        >
                          <Text style={styles.modalChatButtonText}>
                            Go To Chat
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : hasTwoWayHistory ? (
                    <View
                      style={[
                        styles.bottomButtons,
                        { justifyContent: "center", marginTop: 10 },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.modalChatButton,
                          (messagingBlocked || isSelectedOffline) &&
                            styles.modalChatButtonDisabled,
                        ]}
                        onPress={goToChatFromProfile}
                        disabled={messagingBlocked || isSelectedOffline}
                      >
                        <Text
                          style={[
                            styles.modalChatButtonText,
                            (messagingBlocked || isSelectedOffline) &&
                              styles.modalChatButtonTextDisabled,
                            {color: "red", fontWeight: "bold"}
                          ]}
                        >
                          Go To Chat
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={buttonContainerStyle}>
                      {showChatButton && (
                        <TouchableOpacity
                          style={[
                            styles.modalChatButton,
                            (messagingBlocked || isSelectedOffline) &&
                              styles.modalChatButtonDisabled,
                          ]}
                          onPress={handleChatPress}
                          disabled={messagingBlocked || isSelectedOffline}
                        >
                          <Text
                            style={[
                              styles.modalChatButtonText,
                              (messagingBlocked || isSelectedOffline) &&
                                styles.modalChatButtonTextDisabled,
                            ]}
                          >
                            Chat
                          </Text>
                        </TouchableOpacity>
                      )}

                      {showChitChatButton && (
                        <TouchableOpacity
                          style={[
                            styles.modalChatButton,
                            (messagingBlocked || isSelectedOffline) &&
                              styles.modalChatButtonDisabled,
                          ]}
                          onPress={handleChitChatPress}
                          disabled={messagingBlocked || isSelectedOffline}
                        >
                          <Text
                            style={[
                              styles.modalChatButtonText,
                              (messagingBlocked || isSelectedOffline) &&
                                styles.modalChatButtonTextDisabled,
                            ]}
                          >
                            Chit Chat
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                </>
              )}
              {isSelectedOffline && (
              <View style={styles.offlineOverlayInModal} pointerEvents="none">
                <View style={styles.offlineBadge}>
                 <Text style={styles.offlineText}>
                  {(selectedProfile?.name || "They")} left the bar
                </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {selectedProfile && chitChatModalVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.ccContainer} pointerEvents="auto">
                {profileChats.length === 0 ? (
                  <View style={styles.noChatsContainer}>
                    <Text style={styles.noChatsText}>No Chit Chats found</Text>
                  </View>
                ) : profileChats.length > 1 && ccStep === "choose" ? (
                  profileChats.map((cc, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.listItem}
                      onPress={() => {
                        setSelectedCc(cc);
                        setCcStep("show");
                      }}
                    >
                      <Text
                        style={[
                          styles.listText,
                          idx % 2 === 1 ? styles.pinkText : styles.whiteText,
                        ]}
                      >
                        {chatLabelMap[cc.type]}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View>
                    {(() => {
                      const cc =
                        profileChats.length === 1
                          ? profileChats[0]
                          : selectedCc!;
                      return (
                        <>
                          <Text style={styles.ccLabel}>
                            {chatLabelMap[cc.type]}
                          </Text>
                          <Text style={styles.ccContent}>{cc.content}</Text>
                          <TextInput
                            style={styles.replyInput}
                            value={replyText}
                            onChangeText={(t) =>
                              stripLinksAndWarn(t, setReplyText)
                            }
                            placeholder="Write your reply…"
                            placeholderTextColor="#7A4C6E"
                            multiline
                            blurOnSubmit
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />

                          <TouchableOpacity
                            style={styles.replyButton}
                            onPress={() => sendChitChatReply(cc)}
                          >
                            <Text style={styles.replyButtonText}>Send</Text>
                          </TouchableOpacity>
                        </>
                      );
                    })()}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.ccCloseButton}
                  onPress={() => {
                    // If we're on the "show" screen and there are multiple Chit Chats,
                    // go back to the list first.
                    if (ccStep === "show" && profileChats.length > 1) {
                      setCcStep("choose");
                      setSelectedCc(null);
                      setReplyText("");
                      return;
                    }

                    // Otherwise, fully close Chit Chat and bring the profile card back
                    setChitChatModalVisible(false);
                    setCcStep("choose");
                    setSelectedCc(null);
                    setReplyText("");
                    setModalVisible(true); // 👈 re-open profile modal
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Image source={closeIcon} style={styles.closeIcon} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      {firstMessageModalVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.modalOverlay} pointerEvents="box-none">
              <View
                style={[
                  styles.modalContent,
                  {
                    maxHeight: Math.round(sh * 0.78),
                    paddingBottom: 20 + insets.bottom,
                  },
                ]}
                pointerEvents="auto"
              >{/*}
              {deletionFlag && (
                <View style={styles.deletionBanner}>
                  <Text style={styles.deletionBannerText}>
                    {deletionFlag === 'you' ? 'You deleted this chat' : 'They deleted this chat'}
                  </Text>
                </View>
              )} */}

              <TouchableOpacity
                onPress={() => setFirstMessageModalVisible(false)}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Image
                  style={{ width: 20, height: 20 }}
                  source={require("../assets/images/x.png")}
                />
              </TouchableOpacity>

              {selectedProfile && (
                <>
                  <ScrollView
                    contentContainerStyle={[
                      styles.modalBody,
                      { paddingBottom: 28 + insets.bottom },
                    ]}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text
                      style={[
                        styles.modalLocation,
                        { marginTop: 12, marginBottom: 4, fontSize: 18, textAlign: "center", margin: "auto" },
                      ]}
                    >
                      Your first message
                    </Text>
                    <TextInput
                       style={[
                        styles.replyInput,
                        { minHeight: 140, maxHeight: 260 }, // ⬅️ bigger box
                      ]}
                      value={firstMessageText}
                      onChangeText={(t) => stripLinksAndWarn(t, setFirstMessageText)}
                      placeholder="Say something nice…"
                      placeholderTextColor="#7A4C6E"
                      multiline
                      blurOnSubmit
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />

                <TouchableOpacity
                  onPress={() => setFirstMessageModalVisible(false)}
                  style={styles.closeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Image
                    style={{ width: 20, height: 20 }}
                    source={require("../assets/images/x.png")}
                  />
                </TouchableOpacity>

                {selectedProfile && (
                  <>
                    <ScrollView
                      contentContainerStyle={[
                        styles.modalBody,
                        { paddingBottom: 28 + insets.bottom },
                      ]}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text
                        style={[
                          styles.modalLocation,
                          {
                            marginTop: 12,
                            marginBottom: 4,
                            fontSize: 18,
                            textAlign: "center",
                            margin: "auto",
                          },
                        ]}
                      >
                        Your first message
                      </Text>
                      <TextInput
                        style={styles.replyInput}
                        value={firstMessageText}
                        onChangeText={(t) =>
                          stripLinksAndWarn(t, setFirstMessageText)
                        }
                        placeholder="Say something nice…"
                        placeholderTextColor="#7A4C6E"
                        multiline
                        blurOnSubmit
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </ScrollView>

                    <View
                      style={[styles.modalFooter, { justifyContent: "center" }]}
                    >
                      <TouchableOpacity
                        style={styles.modalChatButton}
                        onPress={sendFirstMessage}
                        disabled={sendingFirstMessage || messagingBlocked}
                      >
                        <Text style={styles.modalChatButtonText}>
                          {sendingFirstMessage ? "Sending..." : "Send"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      {noLinksVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.modalOverlay} pointerEvents="box-none">
            <View style={styles.ccContainer} pointerEvents="auto">
              <Text style={[styles.ccLabel, { marginBottom: 8 }]}>
                Mr. Mingles
              </Text>
              <Text
                style={{ color: "#F5E1C4", textAlign: "center", fontSize: 18 }}
              >
                No links allowed here, take it outside!
              </Text>
              <TouchableOpacity
                style={[styles.replyButton, { marginTop: 16 }]}
                onPress={() => setNoLinksVisible(false)}
              >
                <Text style={styles.replyButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* “Don’t be a creep” popup */}
      {creepVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={creepStyles.mingModalOverlay} pointerEvents="box-none">
            <View style={creepStyles.mingModalContainer} pointerEvents="auto">
              <TouchableOpacity
                style={creepStyles.mingModalCloseButton}
                onPress={() => setCreepVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Image source={closeIcon} style={styles.closeIcon} />{" "}
              </TouchableOpacity>

              <Text style={creepStyles.mingModalText}>{creepTyped}</Text>

              <View style={creepStyles.mingTriangleContainer}>
                <View style={creepStyles.mingOuterTriangle} />
                <View style={creepStyles.mingInnerTriangle} />
              </View>

              <MMAnimated
                showBackground={false}
                showBarFront={false}
                showControls={false}
                enterOnMount
                leaving={leaving}
                onLeaveComplete={() => {
                  setLeaving(false);
                  setStarted(true);
                }}
                style={{ position: "absolute", top: "80%", left: "10%" }}
              />
            </View>
          </View>
        </View>
      )}

      {/* 2s toast for “Message sent / Chit Chat Sent” */}
      {toastText && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastText}</Text>
        </View>
      )}

      {profileComplete && (
        <View
          style={[
            styles.bottomNavbarContainer,
            { paddingBottom: insets.bottom },
          ]} // 👈 include inset in height
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h !== navHeight) setNavHeight(h);
          }}
          collapsable={false}
        >
          <BottomNavbar selectedTab="bar-2" />
        </View>
      )}
      {(!fontsLoaded || loading) && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <ImageBackground
            source={BG_IMG}
            style={styles.background}
            blurRadius={4}
          >
            <LottieView
              source={withoutBg}
              autoPlay
              loop
              style={{
                width: 600,
                height: 600,
                backgroundColor: "transparent",
                margin: "auto",
                position: "relative",
                right: "25%",
                bottom: "10%",
              }}
            />
          </ImageBackground>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerInStage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    width: width,
    aspectRatio: 1125 / 2436,
  },

  // ─── BUBBLE text ─────────────────────────────
  bubbleText: {
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
    fontFamily: FontNames.MontserratRegular,
    position: "relative",
    bottom: 10,
  },

  touchShield: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },

  // Skip (welcome)
  skipButton: {
    position: "absolute",
    top: "22%",
    right: "40%",
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 500,
    width: 70,
  },
  skipText: {
    color: "#ffe3d0",
    fontSize: 16,
    fontFamily: FontNames.MontSerratSemiBold,
  },

  pointerBase: {
    position: "absolute",
    width: 55,
    height: 55,
    zIndex: 20,
  },

  pointerBathroom: {
    top: height * -0.01,
    left: width * 0.06,
  },

  // ─── START CHAT button (profile complete, not started) ─────────────
  startButton: {
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    borderRadius: 20,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  startButtonText: {
    fontSize: 36, // starting size; will auto-shrink if needed
    lineHeight: 38,
    fontFamily: FontNames.MontSerratSemiBold,
    textTransform: "uppercase",
    color: "#ffe3d0",
    textAlign: "center",
    includeFontPadding: false,
  },

  // ─── NAVBAR ──────────────────────────────────
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    zIndex: 20,
    elevation: 20,
  },

  // ─── PROFILE MODAL ───────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  modalContent: {
    width: "85%",
    borderWidth: 8,
    borderColor: "#460b2a",
    backgroundColor: "#592540",
    position: "relative",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalBody: {
    alignItems: "center",
    paddingBottom: 12,
  },
  photoWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
    position: "relative", // ⬅️ anchor for absolute drink icon
  },
  modalImage: {
    width: "58%",
    maxWidth: 180,
    aspectRatio: 1,
    borderRadius: 999,
  },

  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  closeIcon: {
    width: 24,
    height: 24,
    tintColor: "#F5E1C4",
    top: 5,
    right: 5,
  },
  drinkIcon: {
    position: "absolute",
    left: "75%",
    top: "30%",
    width: 50,
    height: 70,
  },

  // text area
  modalText: {
    marginTop: 25,
    alignSelf: "stretch",
    marginBottom: 30,
  },

  // footer pinned at bottom of card
  modalFooter: {
    alignSelf: "stretch",
    marginTop: 18, // ⬅️ extra gap above the buttons
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: "rgba(70,11,42,0.35)",
    flexDirection: "row",
    alignItems: "center",
  },
  modalName: {
    color: "#ffe3d0",
    fontSize: 38,
    fontFamily: FontNames.MontserratBold,
  },
  modalLocation: {
    color: "white",
    fontSize: 20,
    marginVertical: 8,
    fontFamily: FontNames.MontserratRegular,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  modalDescription: {
    color: "#ffe3d0",
    fontSize: 16,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  bottomButtons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  modalChatButton: {
    backgroundColor: "#6e1944",
    borderWidth: 3,
    borderColor: "#460b2a",
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    borderRadius: 25,
    alignSelf: "center",
    shadowColor: "black",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    elevation: 5,
    boxShadow: "5px 9px 0px rgba(0,0,0,.3)",
  },
  modalChatButtonText: {
    color: "#F5E1C4",
    fontSize: 28,
    fontFamily: FontNames.MontserratRegular,
    fontWeight: "600",
    textAlignVertical: "center",
  },

  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ccContainer: {
    width: "90%",
    backgroundColor: "#592540",
    borderRadius: 20,
    padding: 20,
    position: "relative",
    borderColor: "#460b2a",
    borderWidth: 6,
  },
  listItem: {
    paddingVertical: 12,
    alignItems: "center",
  },
  listText: {
    fontSize: 24,
    fontWeight: "500",
    fontFamily: FontNames.MontserratRegular,
  },
  whiteText: {
    color: "#d8bfd8",
  },
  pinkText: {
    color: "#e78bbb",
  },
  ccLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E6B8C7",
    textAlign: "center",
    marginBottom: 12,
    marginTop: 12,
  },
  ccContent: {
    fontSize: 16,
    color: "#F5E1C4",
    textAlign: "center",
    marginBottom: 20,
  },
  replyInput: {
    width: "100%",             // use full container width
    maxWidth: 320,             // keeps it nice on big phones
    minHeight: 80,
    maxHeight: 180,
    borderColor: "#40122E",
    borderWidth: 6,
    borderRadius: 12,
    padding: 12,
    color: "#F5E1C4",
    backgroundColor: "#6E2A48",
    marginTop: 16,             // smaller top margin
    marginBottom: 0,
    alignSelf: "center",       // center inside ccContainer
    textAlignVertical: "top",
  },

  replyButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    marginVertical: 10,
    borderColor: "#460b2a",
    paddingVertical: 5,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignSelf: "center",
    shadowColor: "black",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    elevation: 5,
  },
  replyButtonText: {
    color: "#ffe3d0",
    textTransform: "uppercase",
    fontSize: 32,
    lineHeight: 35,
    textAlignVertical: "center",
    fontFamily: FontNames.MontserratRegular,
    fontWeight: "600",
  },
  ccCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36, // same invisible square tap area
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    color: "#F5E1C4",
    fontSize: 24,
  },
  noChatsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noChatsText: {
    color: "#F5E1C4",
    fontSize: 18,
    fontWeight: "600",
  },

  // ─── DRINK ICON + SPEECH BUBBLE ─────────────
  drinkSpeechBubble: {
    position: "absolute",
    bottom: "110%",
    left: "-20%",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 5,
    borderRadius: 10,
    width: scale(100),
  },
  drinkSpeechBubbleText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
  },
  toast: {
    position: "absolute",
    bottom: height * 0.18,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#460b2a",
    zIndex: 999,
  },
  toastText: {
    color: "#ffe3d0",
    fontSize: 16,
    fontFamily: FontNames.MontserratBold,
    textAlign: "center",
  },
  deletionBanner: {
    position: "absolute",
    top: 10,
    left: "30%",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#460b2a",
    zIndex: 5,
  },
  deletionBannerText: {
    color: "red",
    fontSize: 12,
    fontFamily: FontNames.MontserratRegular,
  },
  modalChatButtonDisabled: {
    backgroundColor: "#3b2232",
    borderColor: "#2b1523",
    shadowOpacity: 0.3,
    elevation: 1,
  },
  modalChatButtonTextDisabled: {
    color: "#b38eaa",
  },
  offlineOverlayInModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  offlineBadge: {
    backgroundColor: "#6e1944",
    borderWidth: 3,
    borderColor: "#460b2a",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  offlineText: {
    color: "#F5E1C4",
    fontSize: 18,
    fontFamily: FontNames.MontserratBold,
    textAlign: "center",
  },
  infoLine: {
    color: "#F5E1C4",
    fontSize: 16,
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
    marginTop: 10,
  },
});

const creepStyles = ScaledSheet.create({
  mingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mingModalContainer: {
    width: "90%",
    height: "400@vs",
    backgroundColor: "#020621",
    borderWidth: "4@ms",
    borderColor: "#fff",
    borderRadius: "20@ms",
    paddingVertical: "50@ms",
    paddingHorizontal: "8@ms",
    alignItems: "center",
    position: "relative",
    bottom: "18%",
  },
  mingModalCloseButton: {
    position: "absolute",
    top: "2%",
    right: "5%",
    zIndex: 100,
    width: "44@ms",
    height: "44@ms",
    justifyContent: "center",
    alignItems: "center",
  },

  mingModalCloseButtonText: {
    color: "#fff",
    fontSize: "32@ms",
    fontFamily: FontNames.MontserratExtraLight,
  },
  mingModalText: {
    color: "#eceded",
    fontSize: "32@ms",
    textAlign: "center",
    marginBottom: "20@ms",
    fontWeight: "400",
    fontFamily: FontNames.MontserratExtraLight,
  },
  mingTriangleContainer: {
    position: "absolute",
    bottom: "-24@ms",
    right: "24@ms",
    width: 0,
    height: 0,
  },
  mingOuterTriangle: {
    width: 5,
    height: 5,
    borderLeftWidth: "26@ms",
    borderRightWidth: "26@ms",
    borderTopWidth: "24@ms",
    position: "absolute",
    left: "-44@ms",
    top: "-24@ms",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
  mingInnerTriangle: {
    position: "absolute",
    top: "-25@ms",
    left: "-40@ms",
    width: 0,
    height: 0,
    borderLeftWidth: "22@ms",
    borderRightWidth: "22@ms",
    borderTopWidth: "22@ms",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#020621",
  },
  mingMrMingles: {
    width: "350@ms",
    height: "420@ms",
    position: "absolute",
    bottom: "-95%",
    right: "-20%",
  },
});

export { Bar2Screen };
