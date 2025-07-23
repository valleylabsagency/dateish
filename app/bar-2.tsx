// bar-2.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TextInput
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getDatabase, ref, onValue } from "firebase/database";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scale } from "react-native-size-matters";
import ChitChats, { ChatType, SavedChat } from "./ChitChats";

const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18;           // height for the speech bubble
const START_OFFSET_RATIO = 0.085;
const SPACING_RATIO      = 0.2;
const AVATAR_SIZE        = 100;

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

export default function Bar2Screen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  const [profiles, setProfiles] = useState<any[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [showDrinkSpeech, setShowDrinkSpeech] = useState(false);

  //chitchats modal
  const [chitChatModalVisible, setChitChatModalVisible] = useState(false);
  const [ccStep, setCcStep] = useState<'choose'|'show'>('choose');
  const [selectedCc, setSelectedCc] = useState<SavedChat|null>(null);
  const [replyText, setReplyText] = useState('');

  // mapping ChatType → human label
const chatLabelMap: Record<ChatType, string> = {
  'what-happened':     'What Happened Next?',
  'if-you-were-me':     'If You Were Me',
  'complete-poem':      'Complete a Poem',
  'unpopular-opinion':  'Unpopular Opinion',
  'dont-usually-ask':   'I Don’t Usually Ask That',
  'emoji-story':        'Emoji To Story',
}


  // load persisted "started" flag
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("bar2Started");
        if (saved === "true") setStarted(true);
      } catch (e) {
        console.error("Load start-chat flag:", e);
      }
    })();
  }, []);

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
        <ActivityIndicator size="large" color="gold" />
      </ImageBackground>
    );
  }

  const startOffsetPx = width * START_OFFSET_RATIO;
  const spacingPx     = width * SPACING_RATIO;
  
  const profileChats: SavedChat[] = selectedProfile?.chitchats ?? [];

   // compute our flags
   const hasChitChats = profileChats.length > 0;
   const showChatButton =
     // always show Chat if there are no chit‑chats,
     // or if chit‑chats exist but are not required
     !hasChitChats || (hasChitChats && !selectedProfile.chitchatsRequired);
   const showChitChatButton =
     // show Chit Chat only if there are chit‑chats
     hasChitChats;
 
   // choose layout: center if only one button, else space‑around
   const buttonContainerStyle = [
     styles.bottomButtons,
     (showChatButton !== showChitChatButton) // XOR: exactly one button?
       ? { justifyContent: "center" }
       : { justifyContent: "space-around" },
   ];

  return (
    <ImageBackground
      source={require("../assets/images/bar-back.png")}
      style={styles.background}
    >
      {/* ─── WELCOME MODE: Mr. Mingles + speech bubble + button ───────── */}
      {!started && (
        <>
          <View style={styles.bubbleContainer}>
            <ImageBackground
              source={require("../assets/images/speech-bubble.png")}
              style={styles.bubble}
              resizeMode="stretch"
            >
              {/* intentionally left blank */}
            </ImageBackground>
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
            <Text style={styles.startButtonText}>Start Chatting</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ─── CHAT MODE: avatars appear after "Start Chatting" ─────────── */}
      {started && onlineProfiles.length > 0 && (
        <View style={styles.onlineRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingLeft: startOffsetPx,
              paddingRight: startOffsetPx,
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
                  marginRight: spacingPx - 20,
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
      )}

      {/* ─── BACK BAR LAYERS ───────────────────────── */}
      <View style={styles.barFrontContainer}>
        <Image
          style={styles.barFront}
          source={require("../assets/images/bar-front.png")}
          resizeMode="contain"
        />
      </View>

      {/* ─── BOTTOM NAV ────────────────────────────── */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="bar-2" />
      </View>

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
                      onPress={() => router.push(`/chat?partner=${selectedProfile.id}`)}
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
                              // build a payload containing both the prompt & the response
                              const payload = {
                                prompt: cc.content,
                                response: replyText.trim(),
                              }
                              const encoded = encodeURIComponent(JSON.stringify(payload))

                              // navigate into chat with both pieces attached
                              router.push(
                                `/chat?partner=${selectedProfile.id}&initial=${encoded}`
                              )

                              // reset modal state
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
                <Text style={styles.closeText}>X</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    alignItems: "center",
  },
  // ─── BUBBLE ───────────────────────────────────
  bubbleContainer: {
    position: "absolute",
    bottom: height * 0.71,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  bubble: {
    width: width * 0.9,
    height: BUBBLE_HEIGHT,
  },

  // ─── Mr. Mingles ──────────────────────────────
  minglesContainer: {
    position: "absolute",
    bottom: height * 0.06,
    left: width * 0.08,
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  minglesImage: {
    width: width * 0.8,
    height: height * 0.8,
  },

  startButton: {
    position: "absolute",
    bottom: height * 0.17,
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
  startButtonText: {
    fontSize: 32,
    fontFamily: FontNames.MontserratRegular,
    textTransform: "uppercase",
    color: "#ffe3d0",
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
    height: 750,
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
    alignItems: "flex-start",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
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
    alignItems: "flex-start",
  },
  modalName: {
    color: "#e2a350",
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
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: "25%"
  },
  modalChatButton: {
    backgroundColor: "#592540",
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 15,
    borderColor: "#460b2a",
    paddingVertical: 5,
    paddingHorizontal: 20,
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
    color: "white",
    fontSize: 25,
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
    backgroundColor: '#5E2A48',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
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
    color: '#F5E1C4',
  },
  pinkText: {
    color: '#E6B8C7',
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
    marginBottom: 20,
  },
  replyInput: {
    width: '100%',
    minHeight: 80,
    borderColor: '#40122E',
    borderWidth: 6,
    borderRadius: 12,
    padding: 12,
    color: '#F5E1C4',
    backgroundColor: '#6E2A48',
    marginBottom: 20,
  },
  replyButton: {
    backgroundColor: '#70214A',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 32,
    alignSelf: 'center',
  },
  replyButtonText: {
    color: '#F5E1C4',
    fontSize: 16,
    fontWeight: '600',
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
