// bar-2.tsx
import React, { useState, useEffect, useRef, useContext } from "react";

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
  Easing
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import { getDatabase, ref as rtdbRef, onValue, update as rtdbUpdate } from "firebase/database";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scale, ScaledSheet } from "react-native-size-matters";
import { ChatType, SavedChat } from "./ChitChats";
import closeIcon from '../assets/images/x.png';
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';
import { Video } from 'expo-av';
import {
  doc, setDoc, updateDoc, collection, addDoc, getDocs, getDoc, query, limit, serverTimestamp, arrayUnion, arrayRemove, onSnapshot
} from "firebase/firestore";
import { ProfileContext } from "../contexts/ProfileContext";
import { useIsFocused } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import Navbar from "@/components/Navbar";
import { spendMoneys, getMessageCost } from '../services/moneys';
import { MoneysContext } from "../contexts/MoneysContext";
import PopUp from "../components/PopUp";
import { useSafeAreaInsets } from "react-native-safe-area-context";


// NEW
import * as MailComposer from "expo-mail-composer";
import MMAnimated from "@/services/MMAnimated";
import { Linking, useWindowDimensions } from "react-native";

const BG_IMG = require("../assets/images/bar-back.png");
const FRONT_IMG = require("../assets/images/bar-front.png");

// Use the art’s intrinsic aspect so we can “cover” precisely
const { width: BGW, height: BGH } = Image.resolveAssetSource(BG_IMG);

const steamboat = require('../assets/videos/steamboatwillie.mp4');

const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18;           // height for the speech bubble
const START_OFFSET_RATIO = 0.085;
const SPACING_RATIO      = 0.2;
const AVATAR_SIZE        = 100;

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
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
  "We don't have a fancy algorithm to match you with your \"perfect match\".",
  "Here you have to talk to people to actually know if you're a good match.",
  "Kinda old school… Go to a bar, talk to several people",
  "And if you like someone, ask for their number!",
  "Remember that shit??",
  "Who will you see? Whoever is in the bar right now! Like REAL life.",
  "Alright, enough chit chat! Go to the bathroom and make yourself a profile."
];

const POINTER_ASSET: any = null; // require('../assets/images/hand-tap.png');
const LAST_WELCOME_INDEX = WELCOME_MESSAGES.length - 1;

export default function Bar2Screen() {
  const router = useRouter();
  const { profileComplete } = useContext(ProfileContext);

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
    [FontNames.MontserratExtraLight]: require("../assets/fonts/Montserrat-ExtraLight.ttf"),
  });

  // --- stage (art space) geometry
  const { width: sw, height: sh } = useWindowDimensions();
  const [stageH, setStageH] = useState<number | null>(null); // exact visible height above navbar
  const containerW = sw;
  const visibleH   = stageH ?? (sh - 72); // fallback until we measure navbar

  const insets = useSafeAreaInsets();

  // COVER the available area with bg art
  const scaleArt = Math.max(containerW / BGW, visibleH / BGH);
  const dispW = BGW * scaleArt;
  const dispH = BGH * scaleArt;

  const offsetX = (containerW - dispW) / 2;
  const offsetY = (visibleH - dispH) / 2;


 // FRONT placement
const FRONT_HEIGHT_FRAC = 0.64;     // keep whatever you like here
const FRONT_BOTTOM_LIFT_FRAC = 0;   // can be 0; not used in the new formula below

const frontLeft   = offsetX;
const frontWidth  = dispW;
const frontHeight = FRONT_HEIGHT_FRAC * dispH;

// ✅ Key change: align to the stage bottom (visibleH), not BG bottom (offsetY + dispH)
const frontTop    = Math.round(visibleH - frontHeight);

const START_BUTTON_EXTRA_RAISE = 0; // tweak to taste



// --- Avatars row placement (relative to FRONT image) ---
  const STOOLS_ROW_Y_FRAC = 0.45; 
  const STOOLS_ROW_NUDGE_PX = 0;   

  const AVATAR_SIZE_PCT_OF_FRONT = 0.18;   
  const AVATAR_GAP_FRAC_OF_WIDTH = 0.12;   

  const AVATAR_SIZE_PX = Math.round(frontHeight * AVATAR_SIZE_PCT_OF_FRONT);
  const AVATAR_GAP_PX  = dispW * AVATAR_GAP_FRAC_OF_WIDTH;

  // ---- Start button geometry (relative to FRONT image) ----
  const BTN_W_FRAC = 0.90;           // 90% of visible art width
  const BTN_H_FRAC = 0.085;          // ~8.5% of visible art height
  const BTN_GAP_FRAC = -0.60;        // gap between button and the FRONT image

  const btnW = Math.round(dispW * BTN_W_FRAC);
  const btnH = Math.round(Math.max(56, Math.min(76, dispH * BTN_H_FRAC))); // clamp for tiny/huge screens
  const btnLeft = Math.round(offsetX + (dispW - btnW) / 2);
  // place it just ABOVE the FRONT image (uses its *top* edge)
  const btnTop = Math.max(
    8,
    Math.round(frontTop - btnH - dispH * BTN_GAP_FRAC)
  );





  // helpers in art space
  const rect = (x: number, y: number, w: number, h: number, extra?: any) => ({
    position: "absolute" as const,
    left:  offsetX + x * dispW,
    top:   offsetY + y * dispH,
    width: w * dispW,
    height:h * dispH,
    ...(extra || {}),
  });

  // --- “TV” box (fractions from your original code)
  const TV = {
    x: 0.525, y: 0.163, w: 0.28, h: 0.11
  };

  // --- onboarding / welcome state
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [welcomeDisplayed, setWelcomeDisplayed] = useState("");
  const [welcomeTyping, setWelcomeTyping] = useState(true);
  const [pointerTarget, setPointerTarget] = useState<'mingles'|'bathroom'|null>(null);
  const [minglesFrame, setMinglesFrame] = useState<{x:number,y:number,width:number,height:number} | null>(null);

  // pre-start bubble (blank) visibility
  const [bubbleVisible, setBubbleVisible] = useState(false);

  // slide-in for the avatars row
  const avatarsX = useRef(new Animated.Value(width)).current;   // start off-screen right
  const avatarsOpacity = useRef(new Animated.Value(0)).current; // fade in

  const isFocused = useIsFocused();
  const pulse = useRef(new Animated.Value(0)).current;
  const { triggerSpend } = useContext(MoneysContext);

  // toast for “message sent”
  const [sentToast, setSentToast] = useState(false);

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
    if (!auth.currentUser) return;
    const myRef = doc(firestore, "users", auth.currentUser.uid);
    const unsub = onSnapshot(myRef, async snap => {
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
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pointerTarget]);

  const pointerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  // welcome pointer logic
  useEffect(() => {
    if (profileComplete) return;
    if (welcomeTyping) return;

    if (welcomeIndex === 0) {
      setPointerTarget('mingles');
    } else if (welcomeIndex === LAST_WELCOME_INDEX) {
      setPointerTarget('bathroom');
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

  // restore started flag on focus
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem("bar2Started");
        setStarted(v === "true");
      } catch {}
    })();
  }, [isFocused]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        await AsyncStorage.removeItem("bar2Started");
        setStarted(false);
      }
    });
    return unsub;
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
    setPointerTarget('bathroom');
  };

  // Existing chat bar state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // start state
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [showDrinkSpeech, setShowDrinkSpeech] = useState(false);

  // new chats
  const [firstMessageModalVisible, setFirstMessageModalVisible] = useState(false);
  const [firstMessageText, setFirstMessageText] = useState("");
  const [sendingFirstMessage, setSendingFirstMessage] = useState(false);

  // chitchats modal
  const [chitChatModalVisible, setChitChatModalVisible] = useState(false);
  const [ccStep, setCcStep] = useState<'choose'|'show'>('choose');
  const [selectedCc, setSelectedCc] = useState<SavedChat|null>(null);
  const [replyText, setReplyText] = useState('');

  const videoRef = useRef<Video>(null);
  const [tvOn, setTvOn] = useState(false);

  const [deletionFlag, setDeletionFlag] = useState<'you'|'them'|null>(null); // who deleted
  const [checkingDeletion, setCheckingDeletion] = useState(false);

  const [introPlayed, setIntroPlayed] = useState<boolean>(false);

  // presence
  useEffect(() => {
    if (!auth.currentUser) return;
    const db = getDatabase();
    const statusRef = rtdbRef(db, `status/${auth.currentUser.uid}`);

    let hb: any = null;

    const goOnline = () => {
      rtdbUpdate(statusRef, { online: true, bar: true, lastActive: Date.now() }).catch(() => {});
      hb = setInterval(() => {
        rtdbUpdate(statusRef, { lastActive: Date.now() }).catch(() => {});
      }, 30_000);
    };

    const goOffline = () => {
      if (hb) { clearInterval(hb); hb = null; }
      rtdbUpdate(statusRef, { online: false, bar: false, lastActive: Date.now() }).catch(() => {});
    };

    if (started && isFocused) {
      goOnline();
    } else {
      goOffline();
    }

    return () => {
      if (hb) { clearInterval(hb); hb = null; }
      if (auth.currentUser) {
        rtdbUpdate(statusRef, { online: false, bar: false, lastActive: Date.now() }).catch(() => {});
      }
    };
  }, [started, isFocused, auth.currentUser?.uid]);

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
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    if (started && tvOn) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [tvOn, started]);

  const toggleTV = () => setTvOn(prev => !prev);

  useEffect(() => {
    if (started && videoRef.current) {
      videoRef.current.playAsync().catch(console.warn)
    }
  }, [started])

  // mapping ChatType → human label
  const chatLabelMap: Record<ChatType, string> = {
    'what-happened':     'What Happened Next?',
    'if-you-were-me':    'If You Were Me',
    'complete-poem':     'Complete a Poem',
    'unpopular-opinion': 'Unpopular Opinion',
    'dont-usually-ask':  'I Don’t Usually Ask That',
    'emoji-story':       'Emoji To Story',
  };

  // 1) fetch all other users
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(firestore, "users"));
        const all = snap.docs
          .filter(d => auth.currentUser && d.id !== auth.currentUser.uid)
          .map(d => ({ id: d.id, ...(d.data() as any) }));
        setProfiles(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  // When the profile modal opens, figure out if the chat was deleted by you/them
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!modalVisible || !selectedProfile || !auth.currentUser) {
        if (alive) setDeletionFlag(null);
        return;
      }
      setCheckingDeletion(true);
      const currentUid = auth.currentUser.uid;
      const partnerId = selectedProfile.id;
      const chatId = [currentUid, partnerId].sort().join("_");
      try {
        const chatRef = doc(firestore, "chats", chatId);
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
          if (alive) setDeletionFlag(null);
        } else {
          const data: any = snap.data();
          const vf: string[] = Array.isArray(data?.visibleFor) ? data.visibleFor : [];
          if (!vf.includes(partnerId)) {
            if (alive) setDeletionFlag('them');
          } else if (!vf.includes(currentUid)) {
            if (alive) setDeletionFlag('you');
          } else {
            if (alive) setDeletionFlag(null);
          }
        }
      } catch (e: any) {
        if (e?.code === 'permission-denied') {
          if (alive) setDeletionFlag('you');
        } else {
          console.error('checkDeletionStatus error:', e);
        }
      } finally {
        if (alive) setCheckingDeletion(false);
      }
    })();
    return () => { alive = false; };
  }, [modalVisible, selectedProfile]);

  const messagingBlocked = deletionFlag !== null;

  const myUid = auth.currentUser?.uid;
  const filtered = profiles.filter(p => {
    const theyBlockedMe = Array.isArray(p.blocked) && myUid ? p.blocked.includes(myUid) : false;
    const iBlockedThem  = blockedIds.includes(p.id);
    return onlineStatus[p.id] && !theyBlockedMe && !iBlockedThem;
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
  const profileDrink = typeof selectedProfile?.drink === "string"
    ? selectedProfile.drink.toLowerCase()
    : "water";
  const drinkIcon = drinkMapping[profileDrink] || drinkMapping["water"];
  const isWater = profileDrink === "water";
  const drinkWidth = isWater ? scale(35) : scale(50);
  const drinkHeight = isWater ? scale(75) : scale(70);
  const drinkText = drinkTextMapping[profileDrink] || drinkTextMapping["water"];

  const navHeightGuess = sh - (stageH ?? (sh - 72));
  const buttonBottomGap = navHeightGuess + 90; // ~20px above navbar

  if (!fontsLoaded || loading) {
    return (
      <ImageBackground
        source={require("../assets/images/bar-back.png")}
        style={styles.background}
        blurRadius={4}
      >
        <LottieView
          source={withoutBg}
          autoPlay
          loop
          style={{ width: 600, height: 600, backgroundColor: "transparent", margin: "auto", position: "relative", right: "25%", bottom: "10%" }}
        />
      </ImageBackground>
    );
  }

  const startOffsetPx = width * START_OFFSET_RATIO;

  const profileChats: SavedChat[] = selectedProfile?.chitchats ?? [];

  const hasChitChats = profileChats.length > 0;
  const showChatButton =
    !hasChitChats || (hasChitChats && !selectedProfile?.chitchatsRequired);
  const showChitChatButton = hasChitChats;

  const buttonContainerStyle = [
    styles.bottomButtons,
    (showChatButton !== showChitChatButton)
      ? { justifyContent: "center" }
      : { justifyContent: "space-around" },
  ];

  const openFirstMessageModal = () => {
    setModalVisible(false);
    setTimeout(() => setFirstMessageModalVisible(true), 50);
  };

  const openChitChatModal = () => {
    setCcStep('choose');
    setSelectedCc(null);
    setReplyText('');
    setModalVisible(false);
    setTimeout(() => setChitChatModalVisible(true), 50);
  };

  async function blockUser(uidToBlock: string) {
    if (!auth.currentUser) return;

    Alert.alert(
      "Block user?",
      "They will be hidden and cannot contact you.",
      [
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
              setProfiles(prev => prev.filter(p => p.id !== uidToBlock));
            } catch (e) {
              console.error(e);
              Alert.alert("Error", "Could not block user. Try again.");
            }
          }
        }
      ]
    );
  }

  async function unblockUser(uidToUnblock: string) {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(firestore, "users", auth.currentUser.uid), {
        blocked: arrayRemove(uidToUnblock),
      });
      setBlockedIds(b => b.filter(id => id !== uidToUnblock));
      setBlockedUsers(u => u.filter(u2 => u2.id !== uidToUnblock));
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

  async function sendReportEmail() {
    try {
      setSendingReport(true);
      const subject = `Dateish report — ${reportReason || "No reason selected"}`;
      const body = buildReportEmailBody();

      const can = await MailComposer.isAvailableAsync();
      if (can) {
        await MailComposer.composeAsync({
          recipients: ["dateish.office@gmail.com"],
          subject,
          body,
        });
      } else {
        const mailto = `mailto:dateish.office@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        Linking.openURL(mailto);
      }

      setReportOpen(false);
      setSafetyOpen(false);
      setReportReason(null);
      setReportNotes("");

      Alert.alert(
        "Thank you for helping to make Dateish safer!",
        "",
        [
          {
            text: "Email us more details",
            onPress: () =>
              Linking.openURL(
                `mailto:dateish.office@gmail.com?subject=${encodeURIComponent("Dateish report follow-up")}`
              ),
          },
          { text: "Close" },
        ]
      );
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

  const handleChatPress = async () => {
    if (messagingBlocked) return;
    try {
      const currentUserId = auth.currentUser?.uid!;
      const partnerId = selectedProfile.id;
      const chatId = [currentUserId, partnerId].sort().join("_");
      const chatDocRef = doc(firestore, "chats", chatId);

      const chatSnap = await getDoc(chatDocRef);
      if (!chatSnap.exists()) {
        openFirstMessageModal();
        return;
      }

      const msgsSnap = await getDocs(
        query(collection(firestore, "chats", chatId, "messages"), limit(1))
      );

      if (msgsSnap.empty) {
        openFirstMessageModal();
      } else {
        setCreepVisible(true);
      }
    } catch (err) {
      console.error("handleChatPress failed:", err);
      openFirstMessageModal();
    }
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
      const cost = getMessageCost();
      await spendMoneys({ amount: cost, reason: "start-chat-first-message" });
      triggerSpend(cost);

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

      await addDoc(
        collection(firestore, "chats", chatId, "messages"),
        {
          text: firstMessageText,
          sender: currentUserId,
          createdAt: serverTimestamp(),
        }
      );

      // (toast replaces blocking alert)
      setFirstMessageText("");
      setFirstMessageModalVisible(false);
      setModalVisible(false);
      setSentToast(true);
      setTimeout(() => setSentToast(false), 2000);
    } catch (err: any) {
      if (err?.code === "functions/failed-precondition" || /Insufficient moneys/i.test(err?.message)) {
        Alert.alert("Out of moneys", "You don’t have enough moneys to start a new chat. Visit the shop to top up.");
      } else {
        Alert.alert("Error", "Could not send message. Please try again.");
      }
      console.error(err);
    } finally {
      setSendingFirstMessage(false);
    }
  };

  // ─────────────────────────── RENDER ───────────────────────────
  return (
    <>
      <Navbar
        bathroomRoute={!profileComplete ? "/bathroom?onboard=true" : "/bathroom"}
        lockNonBathroom={isLastWelcome}
      />

      {/* ==== STAGE (locks all layers to the same art space) ==== */}
      <View style={{ width: containerW, height: visibleH, overflow: "hidden" }}>
        {/* Back layer (cover) */}
        <Image
          source={BG_IMG}
          style={{ position: "absolute", left: offsetX, top: offsetY, width: dispW, height: dispH }}
          resizeMode="stretch"
        />

        {/* (WELCOME) Mr. Mingles image (static) + typed bubble only during onboarding */}
        {!profileComplete && (
          <>
            <View
              style={rect(0.23, 0.11, 0.80, 0.75, { zIndex: 9 })}
              pointerEvents="box-none"
              onLayout={e => {
                const { x, y, width, height } = e.nativeEvent.layout;
                setMinglesFrame({ x, y, width, height });
              }}
            >
              <Pressable
                onPress={onMinglesPress}
                hitSlop={20}
                disabled={welcomeIndex === LAST_WELCOME_INDEX}
                style={{ width: "100%", height: "100%" }}
              >
                <Image
                  source={require("../assets/images/mr-mingles.png")}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </Pressable>
            </View>

            {/* Speech bubble (typed) */}
            <View style={rect(0.05, 0.05, 0.90, BUBBLE_HEIGHT / dispH, { zIndex: 20 })}>
              <ImageBackground source={require("../assets/images/speech-bubble.png")} style={{ flex: 1 }} resizeMode="stretch">
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
                  <Text style={styles.bubbleText}>{welcomeDisplayed}</Text>
                </View>
              </ImageBackground>
            </View>
          </>
        )}

        {/* TV */}
        {profileComplete && started && (
          <Pressable
            onPress={toggleTV}
            style={rect(TV.x, TV.y, TV.w, TV.h)}
            accessibilityRole="button"
            accessibilityLabel={tvOn ? "Turn TV off" : "Turn TV on"}
          >
            <Video
              ref={videoRef}
              source={steamboat}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              isLooping
              shouldPlay={started && tvOn}
              useNativeControls={false}
              isMuted
            />
            {!tvOn && (
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#ffe3d0", fontFamily: FontNames.MontserratRegular }}>—</Text>
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
                left: offsetX,
                width: dispW,
                // Y is: top of FRONT + fraction of FRONT height, plus tiny pixel nudge
                top: frontTop + frontHeight * STOOLS_ROW_Y_FRAC + STOOLS_ROW_NUDGE_PX,
                zIndex: 25,
                height: AVATAR_SIZE_PX,     // keeps touch targets tidy
                justifyContent: "center",
              },
              { transform: [{ translateX: avatarsX }], opacity: avatarsOpacity },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: dispW * 0.085,    // tie padding to art width so it scales
                paddingRight: dispW * 0.085,
                alignItems: "center",
                columnGap: AVATAR_GAP_PX,      // consistent spacing across screens
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
                    marginRight: "8%"
                  }}
                  onPress={() => {
                    setSelectedProfile(p);
                    setModalVisible(true);
                    setShowDrinkSpeech(false);
                  }}
                >
                  <Image source={{ uri: p.photoUri }} style={{ width: "100%", height: "100%" }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {profileComplete && !started && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: offsetX,
              top: "1%",
              width: dispW,
              height: dispH,
              zIndex: 9, // < front image (10)
            }}
          >
            <MMAnimated
              showBackground={false}
              showBarFront={false}
              showControls={false}
              enterOnMount
              leaving={leaving}
              onLeaveComplete={() => {
                setLeaving(false);
                setStarted(true); // <-- important
              }}
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        )}



        {/* Front layer (glass/bar) — fully visible on all devices */}
        <Image
          source={FRONT_IMG}
          style={{ position: "absolute", left: frontLeft, top: frontTop, width: frontWidth, height: frontHeight, zIndex: 10 }}
          resizeMode="stretch"
          pointerEvents="none"
        />
      </View>

      {/* ===== PRE-START OVERLAY (profile complete, not started) ===== */}
      {profileComplete && !started && (
        <>
          {/* Blank bubble above the stage (same position as onboarding bubble) */}
          {bubbleVisible && (
            <View style={[rect(0.05, 0.18, 0.90, BUBBLE_HEIGHT / dispH, { zIndex: 30 })]}>
              <ImageBackground
                source={require("../assets/images/speech-bubble.png")}
                style={{ flex: 1 }}
                resizeMode="stretch"
              />
            </View>
          )}
          {/* Start Chatting button pinned ~20px above navbar */}
          <TouchableOpacity
            style={[
              styles.startButton,
              {
                position: "absolute",
                left: btnLeft,
                top: btnTop,
                width: btnW,
                height: btnH,
                zIndex: 40,
              },
            ]}
            onPress={async () => {
              setBubbleVisible(false);
              setLeaving(true);
              setTimeout(() => setStarted((s) => s || true), 1100);
              try {
                const db = getDatabase();
                const statusRef = rtdbRef(db, `status/${auth.currentUser!.uid}`);
                rtdbUpdate(statusRef, { online: true, bar: true, lastActive: Date.now() }).catch(() => {});
                await AsyncStorage.setItem("bar2Started", "true");
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
              Start Chatting
            </Text>
          </TouchableOpacity>

        </>
      )}

      {/* ─── PROFILE DETAIL MODAL ──────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {deletionFlag && (
              <View style={styles.deletionBanner}>
                <Text style={styles.deletionBannerText}>
                  {deletionFlag === 'you' ? 'You deleted this chat' : 'They deleted this chat'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Image style={{ width: 20, height: 20 }} source={require("../assets/images/x.png")} />
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
                    { width: drinkWidth, height: drinkHeight},
                  ]}
                  onPress={() => setShowDrinkSpeech(!showDrinkSpeech)}
                >
                  <Image
                    source={drinkIcon}
                    style={{ width: "100%", height: "100%", position: "relative" }}
                  />
                  {showDrinkSpeech && (
                    <View style={styles.drinkSpeechBubble}>
                      <Text style={styles.drinkSpeechBubbleText}>{drinkText}</Text>
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

                <View style={buttonContainerStyle}>
                  {showChatButton && (
                    <TouchableOpacity
                      style={styles.modalChatButton}
                      onPress={handleChatPress}
                      disabled={messagingBlocked}
                    >
                      <Text style={styles.modalChatButtonText}>Chat</Text>
                    </TouchableOpacity>
                  )}

                  {showChitChatButton && (
                    <TouchableOpacity
                      style={styles.modalChatButton}
                      onPress={openChitChatModal}
                      disabled={messagingBlocked}
                    >
                      <Text style={styles.modalChatButtonText}>Chit Chat</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {selectedProfile && (
        <Modal
          visible={chitChatModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (ccStep === 'show') {
              setCcStep('choose');
              setSelectedCc(null);
              setReplyText('');
            } else {
              setChitChatModalVisible(false);
            }
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.ccContainer}>
              {profileChats.length === 0 ? (
                <View style={styles.noChatsContainer}>
                  <Text style={styles.noChatsText}>No Chit Chats found</Text>
                </View>
              ) : profileChats.length > 1 && ccStep === 'choose' ? (
                profileChats.map((cc, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.listItem}
                    onPress={() => {
                      setSelectedCc(cc)
                      setCcStep('show')
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
                    const cc = profileChats.length === 1 ? profileChats[0] : selectedCc!;
                    return (
                      <>
                        <Text style={styles.ccLabel}>
                          {chatLabelMap[cc.type]}
                        </Text>
                        <Text style={styles.ccContent}>{cc.content}</Text>
                        <TextInput
                          style={styles.replyInput}
                          value={replyText}
                          onChangeText={(t) => stripLinksAndWarn(t, setReplyText)}
                          placeholder="Write your reply…"
                          placeholderTextColor="#7A4C6E"
                          multiline
                        />
                        <TouchableOpacity
                          style={styles.replyButton}
                          onPress={() => {
                            const payload = {
                              prompt: cc.content,
                              response: replyText.trim(),
                            };
                            const encoded = encodeURIComponent(JSON.stringify(payload));
                            router.push(`/chat?partner=${selectedProfile.id}&initial=${encoded}`);
                            setChitChatModalVisible(false);
                            setCcStep('choose');
                            setSelectedCc(null);
                            setReplyText('');
                          }}
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
                  if (ccStep === 'show') {
                    setCcStep('choose');
                    setSelectedCc(null);
                    setReplyText('');
                  } else {
                    setChitChatModalVisible(false);
                  }
                }}
              >
                <Image source={closeIcon} style={styles.closeIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={firstMessageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { maxHeight: Math.round(sh * 0.78), paddingBottom: 20 + insets.bottom }
            ]}
          >
            {deletionFlag && (
              <View style={styles.deletionBanner}>
                <Text style={styles.deletionBannerText}>
                  {deletionFlag === 'you' ? 'You deleted this chat' : 'They deleted this chat'}
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Image style={{ width: 20, height: 20 }} source={require("../assets/images/x.png")} />
            </TouchableOpacity>

            {selectedProfile && (
              <>
                {/* BODY SCROLLS IF NEEDED */}
                <ScrollView
                  contentContainerStyle={[styles.modalBody, { paddingBottom: 28 + insets.bottom }]}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Photo wrapper so drink icon can anchor to its bottom-right reliably */}
                  <View style={styles.photoWrap}>
                    <Image source={{ uri: selectedProfile.photoUri }} style={styles.modalImage} />

                    <TouchableOpacity
                      style={[styles.drinkIcon, { right: "33%", bottom: "12%" }]} // ⬅️ key change
                      onPress={() => setShowDrinkSpeech(!showDrinkSpeech)}
                    >
                      <Image source={drinkIcon} style={{ width: "100%", height: "100%" }} />
                      {showDrinkSpeech && (
                        <View style={styles.drinkSpeechBubble}>
                          <Text style={styles.drinkSpeechBubbleText}>{drinkText}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalText}>
                    <Text style={styles.modalName}>
                      {selectedProfile.name}, {selectedProfile.age}
                    </Text>
                    <Text style={styles.modalLocation}>{selectedProfile.location}</Text>
                    <Text style={styles.modalDescription}>{selectedProfile.about}</Text>
                  </View>
                </ScrollView>

                {/* FOOTER PINNED TO BOTTOM OF CARD */}
                <View
                  style={[
                    styles.modalFooter,
                    (showChatButton !== showChitChatButton)
                      ? { justifyContent: "center" }
                      : { justifyContent: "space-around" },
                  ]}                
                >
                  {showChatButton && (
                    <TouchableOpacity
                      style={styles.modalChatButton}
                      onPress={handleChatPress}
                      disabled={messagingBlocked}
                    >
                      <Text style={styles.modalChatButtonText}>Chat</Text>
                    </TouchableOpacity>
                  )}
                  {showChitChatButton && (
                    <TouchableOpacity
                      style={styles.modalChatButton}
                      onPress={openChitChatModal}
                      disabled={messagingBlocked}
                    >
                      <Text style={styles.modalChatButtonText}>Chit Chat</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

      </Modal>

      {/* “Don’t be a creep” popup */}
      <Modal
        visible={creepVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreepVisible(false)}
      >
        <Modal transparent visible={noLinksVisible} animationType="fade" onRequestClose={() => setNoLinksVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.ccContainer}>
              <Text style={[styles.ccLabel, { marginBottom: 8 }]}>Mr. Mingles</Text>
              <Text style={{ color: "#F5E1C4", textAlign: "center", fontSize: 18 }}>
                No links allowed here, take it outside!
              </Text>
              <TouchableOpacity style={[styles.replyButton, { marginTop: 16 }]} onPress={() => setNoLinksVisible(false)}>
                <Text style={styles.replyButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={creepStyles.mingModalOverlay}>
          <View style={creepStyles.mingModalContainer}>
            <TouchableOpacity
              style={creepStyles.mingModalCloseButton}
              onPress={() => setCreepVisible(false)}
            >
              <Text style={creepStyles.mingModalCloseButtonText}>X</Text>
            </TouchableOpacity>

            <Text style={creepStyles.mingModalText}>{creepTyped}</Text>

            <View style={creepStyles.mingTriangleContainer}>
              <View style={creepStyles.mingOuterTriangle} />
              <View style={creepStyles.mingInnerTriangle} />
            </View>

            <MMAnimated />
          </View>
        </View>
      </Modal>

      {/* 2s toast for “Message sent” */}
      {sentToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Message sent</Text>
        </View>
      )}

      {profileComplete && (
        <View
          style={styles.bottomNavbarContainer}
          onLayout={(e) => setStageH(e.nativeEvent.layout.y)}  // measure visible stage height
        >
          <BottomNavbar selectedTab="bar-2" />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    width: width,
    aspectRatio: 1125 / 2436
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
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 2,
  },

  // Skip (welcome)
  skipButton: {
    position: "absolute",
    top: "18%",
    right: "40%",
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 5,
    width: 70
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
    top: height * -.01,
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
    fontSize: 36,                 // starting size; will auto-shrink if needed
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
    position: "relative",      // ⬅️ anchor for absolute drink icon
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
  },
  closeIcon: {
    width: 20,
    height: 18,
    tintColor: '#F5E1C4',
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
    marginBottom: 30
  },

  // footer pinned at bottom of card
  modalFooter: {
    alignSelf: "stretch",
    marginTop: 18,                 // ⬅️ extra gap above the buttons
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ccContainer: {
    width: '90%',
    backgroundColor: '#592540',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    borderColor: "#460b2a",
    borderWidth: 6,
  },
  listItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  listText: {
    fontSize: 24,
    fontWeight: '500',
    fontFamily: FontNames.MontserratRegular,
  },
  whiteText: {
    color: '#d8bfd8',
  },
  pinkText: {
    color: '#e78bbb',
  },
  ccLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E6B8C7',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 12
  },
  ccContent: {
    fontSize: 16,
    color: '#F5E1C4',
    textAlign: "center",
    marginBottom: 20,
  },
  replyInput: {
    width: '80%',
    height: 180,
    minHeight: 80,
    borderColor: '#40122E',
    borderWidth: 6,
    borderRadius: 12,
    padding: 12,
    color: '#F5E1C4',
    backgroundColor: '#6E2A48',
    marginBottom: 20,
    marginHorizontal: "auto",
    textAlignVertical: "top"
  },
  replyButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
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
    position: 'absolute',
    top: 12,
    right: 12,
  },
  closeText: {
    color: '#F5E1C4',
    fontSize: 24,
  },
  noChatsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noChatsText: {
    color: '#F5E1C4',
    fontSize: 18,
    fontWeight: '600',
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
