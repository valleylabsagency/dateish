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
  Alert
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import { getDatabase, ref, onValue } from "firebase/database";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scale } from "react-native-size-matters";
import ChitChats, { ChatType, SavedChat } from "./ChitChats";
import closeIcon from '../assets/images/x.png';
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';
import { Video } from 'expo-av';
import {
  doc, setDoc, updateDoc, collection, addDoc, getDocs, getDoc, query, limit, serverTimestamp, arrayUnion
} from "firebase/firestore";
import { ProfileContext } from "../contexts/ProfileContext";
import { useIsFocused } from "@react-navigation/native";

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
}

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
  "Hello! I’m Mr. Mingles — welcome to Dateish!",
  "We’re not like other dating apps. No perfect-match algorithm here.",
  "It’s simple: chat with people in the bar, see if you vibe, then grab their number.",
  "First things first — make yourself a profile in the bathroom.",
  "Ready? Let’s set you up so others can see you."
];

export default function Bar2Screen() {
  const router = useRouter();
  const { profileComplete } = useContext(ProfileContext);

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
  });

  const [bgFrame, setBgFrame] = useState<{ x:number, y:number, w:number, h:number } | null>(null);
  const TV = bgFrame && {
    x: bgFrame.x + bgFrame.w * 0.525,    // left edge at 53% of the bg’s width
    y: bgFrame.y + bgFrame.h * 0.163,    // top edge at 15% of the bg’s height
    w: bgFrame.w * 0.28,                 // width = 28% of bg width
    h: bgFrame.h * 0.11,                 // height = 10% of bg height
  };

  // --------------------------------------
  // New: Welcome dialogue state (for incomplete profiles)
  // --------------------------------------
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [welcomeDisplayed, setWelcomeDisplayed] = useState("");
  const [welcomeTyping, setWelcomeTyping] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    // whenever this screen is focused, refresh the started flag
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
    // Skip straight to profile creation
    router.push("/bathroom?onboard=true");
  };

  // --------------------------------------
  // Existing chat bar state
  // --------------------------------------
  const [profiles, setProfiles] = useState<any[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Note: start button appears only when profile is complete
  const [started, setStarted] = useState(false);

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

  const [tvOn, setTvOn] = useState(true);

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
  }

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
    const unsub: (() => void)[] = [];
    profiles.forEach(p => {
      const statusRef = ref(db, `status/${p.id}`);
      const off = onValue(statusRef, snap =>
        setOnlineStatus(prev => ({ ...prev, [p.id]: snap.val()?.online ?? false }))
      );
      unsub.push(off);
    });
    return () => unsub.forEach(f => f());
  }, [profiles]);

  const onlineProfiles = profiles.filter(p => onlineStatus[p.id]);

  // Prepare drink data for selected profile
  const profileDrink = typeof selectedProfile?.drink === "string"
    ? selectedProfile.drink.toLowerCase()
    : "water";
  const drinkIcon = drinkMapping[profileDrink] || drinkMapping["water"];
  const isWater = profileDrink === "water";
  const drinkWidth = isWater ? scale(35) : scale(50);
  const drinkHeight = isWater ? scale(75) : scale(70);
  const drinkPosition = isWater ? "60%" : "58%";
  const drinkText = drinkTextMapping[profileDrink] || drinkTextMapping["water"];

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
  const spacingPx     = width * SPACING_RATIO;

  const profileChats: SavedChat[] = selectedProfile?.chitchats ?? [];

  // compute our flags
  const hasChitChats = profileChats.length > 0;
  const showChatButton =
    !hasChitChats || (hasChitChats && !selectedProfile?.chitchatsRequired);
  const showChitChatButton = hasChitChats;

  // choose layout: center if only one button, else space‑around
  const buttonContainerStyle = [
    styles.bottomButtons,
    (showChatButton !== showChitChatButton)
      ? { justifyContent: "center" }
      : { justifyContent: "space-around" },
  ];

  const handleChatPress = async () => {
    const currentUserId = auth.currentUser?.uid!;
    const partnerId = selectedProfile.id;
    const chatId = [currentUserId, partnerId].sort().join("_");

    // look for any existing message
    const msgsSnap = await getDocs(
      query(
        collection(firestore, "chats", chatId, "messages"),
        limit(1)
      )
    );

    if (msgsSnap.empty) {
      setFirstMessageModalVisible(true);
    } else {
      router.push(`/chat?partner=${partnerId}`);
    }
  };

  const sendFirstMessage = async () => {
    if (!firstMessageText.trim()) return;
    setSendingFirstMessage(true);

    try {
      const currentUserId = auth.currentUser!.uid;
      const partnerId = selectedProfile.id;
      const chatId = [currentUserId, partnerId].sort().join("_");
      const chatDocRef = doc(firestore, "chats", chatId);

      // create or update chat doc
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

      // add the actual message
      await addDoc(
        collection(firestore, "chats", chatId, "messages"),
        {
          text: firstMessageText,
          sender: currentUserId,
          createdAt: serverTimestamp(),
        }
      );

      Alert.alert("Sent!", "Your message was delivered.");
      setFirstMessageText("");
      setFirstMessageModalVisible(false);
      setModalVisible(false);
      // router.push(`/chat?partner=${partnerId}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not send message. Please try again.");
    } finally {
      setSendingFirstMessage(false);
    }
  };

  return (
    <>
      <ImageBackground
        source={require("../assets/images/bar-back.png")}
        style={styles.background}
        resizeMode="contain"
        onLayout={e => {
          const { x, y, width: w, height: h } = e.nativeEvent.layout;
          setBgFrame({ x, y, w, h });
        }}
      >
        {/* ─── WELCOME SECTION (only if profile is NOT complete) ───────── */}
        {!profileComplete && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleWelcomeAdvance}
            style={{ flex: 1 }}
          >
            <View style={styles.bubbleContainer}>
              <ImageBackground
                source={require("../assets/images/speech-bubble.png")}
                style={styles.bubble}
                resizeMode="stretch"
              >
                <View style={styles.bubbleTextWrap}>
                  <Text style={styles.bubbleText}>{welcomeDisplayed}</Text>
                </View>
              </ImageBackground>
            </View>

            <View style={styles.minglesContainer}>
              <Image
                source={require("../assets/images/mr-mingles.png")}
                style={styles.minglesImage}
                resizeMode="contain"
              />
            </View>

            {/* Skip button */}
            <TouchableOpacity style={styles.skipButton} onPress={skipWelcome}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* CTA: Create Profile */}
            {!welcomeTyping && welcomeIndex === WELCOME_MESSAGES.length - 1 && (
              <TouchableOpacity
                style={styles.createProfileButton}
                onPress={() => router.push("/bathroom?onboard=true")}
              >
                <Text style={styles.createProfileText}>Create Profile</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}

        {/* ─── START CHAT SCREEN (profile complete, not started) ───────── */}
        {profileComplete && !started && (
          <>
            <View style={styles.bubbleContainer}>
              <ImageBackground
                source={require("../assets/images/speech-bubble.png")}
                style={styles.bubble}
                resizeMode="stretch"
              />
            </View>

            <View style={styles.minglesContainer}>
              <Image
                source={require("../assets/images/mr-mingles.png")}
                style={styles.minglesImage}
                resizeMode="contain"
              />
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={async () => {
                setStarted(true);
                try {
                  await AsyncStorage.setItem("bar2Started", "true");
                } catch (e) {
                  console.error("Save start-chat flag:", e);
                }
              }}
            >
              <Text numberOfLines={1} style={styles.startButtonText}>Start Chatting</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ─── CHAT MODE: avatars appear after "Start Chatting" ───────── */}
        {profileComplete && started && onlineProfiles.length > 0 && TV && (
          <>
            <Pressable
             onPress={toggleTV}
              style={{
                position: "absolute",
                top:    TV.y,
                left:   TV.x,
                width:  TV.w,
                height: TV.h,
                overflow: "hidden",
                zIndex: 3,
                borderRadius: 9
              }}
              accessibilityRole="button"
              accessibilityLabel={tvOn ? "Turn TV off" : "Turn TV on"}
            >
               <Video
                ref={videoRef}
                source={steamboat}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                isLooping
                shouldPlay={started && tvOn}  // <- key line
                useNativeControls={false}
                onError={e => console.warn("Video error:", e)}
              />
              {!tvOn && (
                // Optional: simple “TV off” overlay; remove if not needed
                <View style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "black",
                  opacity: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <Text style={{ color: "#ffe3d0", fontFamily: FontNames.MontserratRegular }}>
                   — 
                  </Text>
                </View>
              )}
            </Pressable>

            <View style={styles.onlineRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: width * START_OFFSET_RATIO,
                  paddingRight: width * START_OFFSET_RATIO,
                  alignItems: "center",
                }}
              >
                {onlineProfiles.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={{
                      width: AVATAR_SIZE,
                      height: AVATAR_SIZE,
                      borderRadius: AVATAR_SIZE / 2,
                      overflow: "hidden",
                      marginRight: width * SPACING_RATIO - 20,
                      borderWidth: 2,
                      borderColor: "white",
                    }}
                    onPress={() => {
                      setSelectedProfile(p);
                      setModalVisible(true);
                      setShowDrinkSpeech(false);
                    }}
                  >
                    <Image source={{ uri: p.photoUri }} style={styles.avatarImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* ─── BACK BAR LAYERS ───────────────────────── */}
        <View style={styles.barFrontContainer}>
          <Image
            style={styles.barFront}
            source={require("../assets/images/bar-front.png")}
            resizeMode="stretch"
          />
        </View>
      </ImageBackground>

      {/* ─── PROFILE DETAIL MODAL ──────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                    >
                      <Text style={styles.modalChatButtonText}>Chat</Text>
                    </TouchableOpacity>
                  )}

                  {showChitChatButton && (
                    <TouchableOpacity
                      style={styles.modalChatButton}
                      onPress={() => setChitChatModalVisible(true)}
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
        <Modal visible={chitChatModalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.ccContainer}>
              {profileChats.length === 0 ? (
                /* NO CHITS */
                <View style={styles.noChatsContainer}>
                  <Text style={styles.noChatsText}>No Chit Chats found</Text>
                </View>
              ) : profileChats.length > 1 && ccStep === 'choose' ? (
                /* MULTIPLE: pick one */
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
                /* ONE OR SELECTED: show & reply */
                <View>
                  {(() => {
                    const cc =
                      profileChats.length === 1
                        ? profileChats[0]
                        : selectedCc!
                    return (
                      <>
                        <Text style={styles.ccLabel}>
                          {chatLabelMap[cc.type]}
                        </Text>
                        <Text style={styles.ccContent}>{cc.content}</Text>
                        <TextInput
                          style={styles.replyInput}
                          value={replyText}
                          onChangeText={setReplyText}
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
                            }
                            const encoded = encodeURIComponent(JSON.stringify(payload))

                            router.push(
                              `/chat?partner=${selectedProfile.id}&initial=${encoded}`
                            )

                            setChitChatModalVisible(false)
                            setCcStep('choose')
                            setSelectedCc(null)
                            setReplyText('')
                          }}
                        >
                          <Text style={styles.replyButtonText}>Send</Text>
                        </TouchableOpacity>
                      </>
                    )
                  })()}
                </View>
              )}

              <TouchableOpacity
                style={styles.ccCloseButton}
                onPress={() => {
                  setChitChatModalVisible(false)
                  setCcStep('choose')
                  setSelectedCc(null)
                  setReplyText('')
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
          <View style={styles.ccContainer}>
            <Text style={styles.ccLabel}>Send a Message</Text>
            <TextInput
              style={styles.replyInput}
              value={firstMessageText}
              onChangeText={setFirstMessageText}
              placeholder="Type your first message…"
              placeholderTextColor="#AB83A1"
              multiline
            />
            <TouchableOpacity
              style={[styles.replyButton, sendingFirstMessage && { opacity: 0.5 }]}
              disabled={sendingFirstMessage}
              onPress={sendFirstMessage}
            >
              <Text style={styles.replyButtonText}>
                {sendingFirstMessage ? "Sending…" : "Send"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ccCloseButton}
              onPress={() => setFirstMessageModalVisible(false)}
            >
              <Image source={closeIcon} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="bar-2" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    width: width,
    aspectRatio: 1125 / 2436
  },

  // ─── BUBBLE ───────────────────────────────────
  bubbleContainer: {
    position: "absolute",
    top: "3%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  bubble: {
    width: width * 0.9,
    height: BUBBLE_HEIGHT,
  },
  bubbleTextWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleText: {
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
    fontFamily: FontNames.MontserratRegular,
  },

  // ─── Mr. Mingles ──────────────────────────────
  minglesContainer: {
    position: "absolute",
    top: "11%",
    left: width * 0.08,
    height: "100%",
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  minglesImage: {
    width: width * 0.8,
    height: height * 0.75,
  },

  // Skip (welcome)
  skipButton: {
    position: "absolute",
    top: 30,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 5,
  },
  skipText: {
    color: "#ffe3d0",
    fontSize: 16,
    fontFamily: FontNames.MontserratRegular,
  },

  // CTA to profile (welcome)
  createProfileButton: {
    position: "absolute",
    bottom: height * 0.2,
    alignSelf: "center",
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    width: "90%",
    height: 70,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
    paddingTop: 10,
  },
  createProfileText: {
    fontSize: 28,
    fontFamily: FontNames.MontserratBold,
    color: "#ffe3d0",
    textAlign: "center",
    textTransform: "uppercase",
  },

  // ─── START CHAT button (profile complete, not started) ─────────────
  startButton: {
    position: "absolute",
    bottom: height * 0.2,
    alignSelf: "center",
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    width: "90%",
    height: 70,
    borderRadius: 20,
    zIndex: 10,
    paddingTop: 10,
    boxShadow: "0px 9px 0px rgba(0,0,0,.3)", 
   

  },
  
  startButtonText: {
    fontSize: 38,
    lineHeight: 38,
    fontFamily: FontNames.MontSerratSemiBold,
    textTransform: "uppercase",
    color: "#ffe3d0",
    zIndex: 10,
    textAlign: "center",
   
  },

  // ─── ONLINE ROW ──────────────────────────────
  onlineRow: {
    position: "absolute",
    top: "60%",
    right: 0,
    width: "100%",
    zIndex: 5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },

  // ─── BAR FRONT ───────────────────────────────
  barFrontContainer: {
    position: "absolute",
    bottom: "-5%",
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },
  barFront: {
    width: "100%",
    height: 830,
    zIndex: 2,
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
    marginBottom: 220,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    height: height * 0.65,
    borderWidth: 8,
    borderColor: "#460b2a",
    backgroundColor: "#592540",
    position: "relative",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: '#F5E1C4',
  },
  modalImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 16,
    alignSelf: "center",
  },
  modalText: {
    marginTop: 16,
    alignSelf: "flex-start",
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
    marginTop: "25%"
  },
  modalChatButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 15,
    borderColor: "#460b2a",
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    borderRadius: 25,
    alignSelf: "center",
    shadowColor: "#460b2a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 5,
  },
  modalChatButtonText: {
    color: "#ffe3d0",
    textTransform: "uppercase",
    fontSize: 27,
    lineHeight: 35,
    textAlignVertical: "center",
    fontFamily: FontNames.MontserratRegular,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },

  // -- CHIT CHATS MODAL --
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
    fontSize: 20,
    fontWeight: '500',
  },
  whiteText: {
    color: '#ffe3d0',
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
  },
  ccContent: {
    fontSize: 16,
    color: '#F5E1C4',
    textAlign: "center",
    marginBottom: 20,
  },
  replyInput: {
    width: '100%',
    height: 130,
    minHeight: 80,
    borderColor: '#40122E',
    borderWidth: 6,
    borderRadius: 12,
    padding: 12,
    color: '#F5E1C4',
    backgroundColor: '#6E2A48',
    marginBottom: 20,
    textAlignVertical: "top"
  },
  replyButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 5,
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
  drinkIcon: {
    position: "absolute",
    top: 160,
    right: "15%"
  },
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
});

export { Bar2Screen };

