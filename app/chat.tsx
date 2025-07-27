// ChatScreen.tsx
import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Keyboard,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProfileContext } from "../contexts/ProfileContext";
import BottomNavbar from "../components/BottomNavbar";
import ProfileNavbar from "../components/ProfileNavbar";
import { auth, firestore } from "../firebase";
import { NotificationContext } from "../contexts/NotificationContext";
import { useIsFocused } from "@react-navigation/native";
import LottieView from 'lottie-react-native';
import animationData from '../assets/videos/mm-dancing.json';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { drinkMapping } from "./utils/drinkMapping";
// 1) Import size-matters
import {
  ScaledSheet,
  moderateScale,
  scale,
  verticalScale,
} from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    layer => layer.ty !== 1 || layer.nm !== 'Dark Blue Solid 1'
  ),
}

export default function ChatScreen() {
  const router = useRouter();
  const { partner, initial } = useLocalSearchParams<{
    partner: string;
    initial?: string;
  }>();
  
  const partnerId = partner;
  const currentUserId = auth.currentUser?.uid;
  const isFocused = useIsFocused();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [typingModalVisible, setTypingModalVisible] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showModalDrinkSpeech, setShowModalDrinkSpeech] = useState(false);
  const [showCurrentUserDrinkSpeech, setShowCurrentUserDrinkSpeech] = useState(false);
  const [showPartnerDrinkSpeech, setShowPartnerDrinkSpeech] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const rollAnim = useRef(new Animated.Value(500)).current;
  const [mingModalVisible, setMingModalVisible] = useState(false);
  const [mingDisplayedText, setMingDisplayedText] = useState("");
  const fullMingText = "Wait for them to answer. Don't be a creep!";

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput | null>(null);

  const { profile } = useContext(ProfileContext);
  const { setCurrentChatId } = useContext(NotificationContext);

  const chatId =
    currentUserId && partnerId
      ? [currentUserId, partnerId].sort().join("_")
      : null;

      // ────────────────────────────────────────────────────────────────────
//  🌟  INITIAL CHIT‑CHAT SEED
// If we got an `initial` param, decode & parse it, then
// setMessages to [ prompt, response ] before firestore kicks in.
useEffect(() => {
  if (!initial) return;
  try {
    const { prompt, response } = JSON.parse(
      decodeURIComponent(initial)
    ) as { prompt: string; response: string };

    setMessages([
      {
        id: "cc-prompt",
        text: prompt,
        sender: partnerId,                // show as “incoming”
        createdAt: { seconds: Date.now() / 1000 },
      },
      {
        id: "cc-reply",
        text: response,
        sender: currentUserId,            // show as “outgoing”
        createdAt: { seconds: Date.now() / 1000 },
      },
    ]);
  } catch (e) {
    console.warn("Invalid initial chit‑chat payload:", e);
  }
}, [initial, partnerId, currentUserId]);
// ────────────────────────────────────────────────────────────────────


  // Fetch partner profile
  useEffect(() => {
    if (!partnerId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "users", partnerId));
        if (snap.exists()) setPartnerProfile({ id: snap.id, ...snap.data() });
      } catch (error) {
        console.error("Error fetching partner profile:", error);
      }
    })();
  }, [partnerId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(firestore, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const msgs: any[] = [];
        querySnapshot.forEach((docSnap) => {
          msgs.push({ id: docSnap.id, ...docSnap.data() });
        });
        setMessages(msgs);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoadingMessages(false);
      }
    );
    return () => unsubscribe();
  }, [chatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Update current chat ID for notifications
  useEffect(() => {
    if (isFocused && chatId) {
      setCurrentChatId(chatId);
    } else {
      setCurrentChatId(null);
    }
  }, [isFocused, chatId]);

  // Mingle modal animation
  useEffect(() => {
    Animated.timing(rollAnim, {
      toValue: mingModalVisible ? 0 : 500,
      duration: mingModalVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [mingModalVisible]);

  // Typewriter effect for mingle text
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (mingModalVisible) {
      setMingDisplayedText("");
      let index = 0;
      intervalId = setInterval(() => {
        index++;
        setMingDisplayedText(fullMingText.substring(0, index));
        if (index === fullMingText.length) clearInterval(intervalId);
      }, 30);
    } else {
      setMingDisplayedText("");
    }
    return () => clearInterval(intervalId);
  }, [mingModalVisible]);

  const sendMessage = async () => {
    if (inputMessage.trim() === "" || !chatId) return;
    setTypingModalVisible(false);
    Keyboard.dismiss();
    setInputMessage("");

    const partnerHasResponded = messages.some((msg) => msg.sender !== currentUserId);

    if (!partnerHasResponded && messages.length >= 1) {
      setMingModalVisible(true);
      return;
    }

    try {
      const chatDocRef = doc(firestore, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          users: [currentUserId, partnerId],
          visibleFor: [currentUserId, partnerId],
          updatedAt: serverTimestamp(),
          lastMessage: inputMessage,
          partnerName: partnerProfile?.name || "",
          partnerPhotoUri:
            partnerProfile && partnerProfile.drink
              ? drinkMapping[partnerProfile.drink.toLowerCase()]
              : drinkMapping["water"],
        });
      } else {
        await updateDoc(chatDocRef, {
          updatedAt: serverTimestamp(),
          lastMessage: inputMessage,
          lastMessageSender: currentUserId,
          visibleFor: arrayUnion(currentUserId, partnerId),
        });
      }

      const messagesRef = collection(firestore, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        text: inputMessage,
        sender: currentUserId,
        createdAt: serverTimestamp(),
      });
      setInputMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Drink icon setup for current user
  const currentUserDrink = profile?.drink ? profile.drink : "water";
  const currentUserDrinkIcon = drinkMapping[currentUserDrink.toLowerCase()];
  const smallDrinkNames = ["tequila", "vodka"];
  const isCurrentUserSmallDrink = smallDrinkNames.includes(currentUserDrink.toLowerCase());
  const userHasWater = currentUserDrink.toLowerCase() === "water";
  const currentUserDrinkWidth = userHasWater
    ? moderateScale(30)
    : isCurrentUserSmallDrink
    ? moderateScale(30)
    : moderateScale(45);
  const currentUserDrinkHeight = userHasWater
    ? moderateScale(70)
    : isCurrentUserSmallDrink
    ? moderateScale(30)
    : moderateScale(65);

  // Drink icon setup for partner
  const partnerDrink = partnerProfile?.drink ? partnerProfile.drink : "water";
  const partnerDrinkIcon = drinkMapping[partnerDrink.toLowerCase()];
  const isPartnerSmallDrink = smallDrinkNames.includes(partnerDrink.toLowerCase());
  const partnerHasWater = partnerDrink.toLowerCase() === "water";
  const partnerDrinkWidth = partnerHasWater
    ? moderateScale(30)
    : isPartnerSmallDrink
    ? moderateScale(35)
    : moderateScale(45);
  const partnerDrinkHeight = partnerHasWater
    ? moderateScale(70)
    : isPartnerSmallDrink
    ? moderateScale(50)
    : moderateScale(65);

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
  const partnerDrinkText = drinkTextMapping[partnerDrink.toLowerCase()];
  const currentUserDrinkText = drinkTextMapping[currentUserDrink.toLowerCase()];

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
                source={withoutBg}
                autoPlay
                loop
                style={{ width: 600, height: 600, backgroundColor: "transparent" }}
               />
      </View>
    );
  }

  const currentUserImage = profile?.photoUri
    ? { uri: profile.photoUri }
    : require("../assets/images/tyler.jpeg");

  return (
    <ImageBackground
      source={require("../assets/images/chat-full.png")}
      style={styles.background}
      resizeMode="stretch"
    >
      <ProfileNavbar onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.chatWrapper}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {loadingMessages ? (
              <LottieView
                      source={withoutBg}
                      autoPlay
                      loop
                      style={{ width: 600, height: 600, backgroundColor: "transparent" }}
                     />
            ) : (
              messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.chatBubble,
                    msg.sender === currentUserId
                      ? styles.userBubble
                      : styles.partnerBubble,
                  ]}
                >
                  <Text style={styles.chatText}>{msg.text}</Text>
                  {msg.createdAt?.seconds && (
                    <Text style={styles.timestamp}>
                      {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={() => setTypingModalVisible(true)}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              returnKeyType="send"
              editable={false}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Typing Modal */}
      <Modal visible={typingModalVisible} animationType="fade" transparent>
        <View style={typingModalStyles.container}>
          <View style={typingModalStyles.inputBox}>
            <TextInput
              style={typingModalStyles.textInput}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={typingModalStyles.doneButton}
              onPress={() => {
                setTypingModalVisible(false);
                sendMessage();
              }}
            >
              <Text style={typingModalStyles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomProfiles}>
        <View style={styles.profileWithDrink}>
          <TouchableOpacity
            onPress={() => router.push("/profile?self=true&from=chat")}
          >
            <Image source={currentUserImage} style={styles.currentUserImage} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.drinkIcon,
              {
                width: currentUserDrinkWidth,
                height: currentUserDrinkHeight,
                left: "100%",
                top: isCurrentUserSmallDrink ? moderateScale(25) : 0,
              },
            ]}
            onPress={() =>
              setShowCurrentUserDrinkSpeech(!showCurrentUserDrinkSpeech)
            }
          >
            <Image
              source={currentUserDrinkIcon}
              style={{ width: "100%", height: "100%", position: "relative" }}
            />
            {showCurrentUserDrinkSpeech && (
              <View style={styles.myDrinkSpeechBubble}>
                <Text style={styles.bottomDrinkSpeechBubbleText}>
                  {currentUserDrinkText}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.profileWithDrink}>
          <TouchableOpacity onPress={() => setShowPartnerModal(true)}>
            {partnerProfile?.photoUri ? (
              <Image
                source={{ uri: partnerProfile.photoUri }}
                style={styles.partnerImage}
              />
            ) : (
              <View style={styles.partnerIconContainer}>
                <MaterialIcons name="person" size={scale(80)} color="grey" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.drinkIcon,
              {
                width: partnerDrinkWidth,
                height: partnerDrinkHeight,
                right: "100%",
                top: isPartnerSmallDrink ? moderateScale(25) : 0,
              },
            ]}
            onPress={() =>
              setShowPartnerDrinkSpeech(!showPartnerDrinkSpeech)
            }
            hitSlop={{ top: 15, bottom: 60, left: 20, right: 20 }}
          >
            <Image
              source={partnerDrinkIcon}
              style={{ width: "100%", height: "100%", position: "relative" }}
            />
            {showPartnerDrinkSpeech && (
              <View style={styles.bottomDrinkSpeechBubble}>
                <Text style={styles.bottomDrinkSpeechBubbleText}>
                  {partnerDrinkText}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Partner Profile Modal (from Bar2Screen) */}
      <Modal
        visible={showPartnerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPartnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowPartnerModal(false)}
              style={styles.closeButton}
            >
              <Image
                style={{ width: 20, height: 20 }}
                source={require("../assets/images/x.png")}
              />
            </TouchableOpacity>

            {partnerProfile && (
              <>
                <Image
                  source={{ uri: partnerProfile.photoUri }}
                  style={styles.modalImage}
                />

                {/* Drink icon + speech bubble */}
                <TouchableOpacity
                  style={[
                    styles.drinkIcon,
                    {
                      width: partnerDrinkWidth,
                      height: partnerDrinkHeight,
                    },
                  ]}
                  onPress={() =>
                    setShowModalDrinkSpeech(!showModalDrinkSpeech)
                  }
                >
                  <Image
                    source={partnerDrinkIcon}
                    style={{ width: "100%", height: "100%", position: "absolute", top: height * 0.25, left: width * 0.55 }}
                  />
                  {showModalDrinkSpeech && (
                    <View style={styles.drinkSpeechBubble}>
                      <Text style={styles.drinkSpeechBubbleText}>
                        {partnerDrinkText}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.modalText}>
                  <Text style={styles.modalName}>
                    {partnerProfile.name}, {partnerProfile.age}
                  </Text>
                  <Text style={styles.modalLocation}>
                    {partnerProfile.location}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {partnerProfile.about}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Mingles Modal */}
      <Modal
        visible={mingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMingModalVisible(false)}
      >
        <View style={styles.mingModalOverlay}>
          <View style={styles.mingModalContainer}>
            <TouchableOpacity
              style={styles.mingModalCloseButton}
              onPress={() => setMingModalVisible(false)}
            >
              <Text style={styles.mingModalCloseButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.mingModalText}>{mingDisplayedText}</Text>
            <View style={styles.mingTriangleContainer}>
              <View style={styles.mingOuterTriangle} />
              <View style={styles.mingInnerTriangle} />
            </View>
            <Animated.Image
              source={require("../assets/images/mr-mingles.png")}
              style={[styles.mingMrMingles, { transform: [{ translateX: rollAnim }] }]}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Chats" />
      </View>
    </ImageBackground>
  );
}

// Typing Modal Styles
const typingModalStyles = ScaledSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: "20@ms",
  },
  inputBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: "10@ms",
    padding: "20@ms",
    alignItems: "center",
  },
  textInput: {
    width: "100%",
    height: "100@vs",
    fontSize: "18@ms",
    borderWidth: "1@ms",
    borderColor: "#ccc",
    borderRadius: "8@ms",
    padding: "10@ms",
    textAlignVertical: "top",
  },
  doneButton: {
    marginTop: "20@ms",
    backgroundColor: "#4a0a0f",
    paddingVertical: "10@ms",
    paddingHorizontal: "20@ms",
    borderRadius: "8@ms",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: "18@ms",
  },
});

// Styles
const styles = ScaledSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  partnerIconContainer: {
    width: "110@ms",
    height: "110@ms",
    borderRadius: "55@ms",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  chatWrapper: {
    height: "50%",
    overflow: "hidden",
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: "10@ms",
    paddingBottom: "3%",
  },
  chatBubble: {
    maxWidth: "70%",
    padding: "10@ms",
    borderRadius: "10@ms",
    marginVertical: "5@ms",
    position: "relative",
  },
  userBubble: {
    backgroundColor: "#e4ddff",
    alignSelf: "flex-start",
  },
  partnerBubble: {
    backgroundColor: "#dde5ff",
    alignSelf: "flex-end",
  },
  chatText: {
    fontSize: "16@ms",
    color: "#000",
  },
  timestamp: {
    fontSize: "12@ms",
    color: "#666",
    alignSelf: "flex-end",
    marginTop: "4@ms",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: "15%",
    width: "100%",
    paddingHorizontal: "20@ms",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: "20@ms",
    paddingHorizontal: "15@ms",
    paddingVertical: scale(10),
    fontSize: "16@ms",
    width: scale(230),
  },
  sendButton: {
    marginLeft: "10@ms",
    backgroundColor: "#4a0a0f",
    paddingHorizontal: "20@ms",
    paddingVertical: "10@ms",
    borderRadius: "20@ms",
  },
  sendButtonText: {
    color: "#ffe3d0",
    fontSize: "16@ms",
    fontFamily: FontNames.MontserratRegular,
  },
  bottomProfiles: {
    position: "absolute",
    bottom: "25%",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: "20@ms",
    alignItems: "center",
  },
  profileWithDrink: {
    position: "relative",
  },
  currentUserImage: {
    width: "100@ms",
    height: "100@ms",
    position: "relative",
    right: "5%",
    borderRadius: "55@ms",
  },
  partnerImage: {
    width: "100@ms",
    height: "100@ms",
    position: "relative",
    left: "5%",
    borderRadius: "55@ms",
  },
  drinkOverlay: {
    position: "absolute",
    width: moderateScale(10),
    height: moderateScale(50),
    bottom: "75%",
    right: 0,
  },
  drinkIcon: {
    position: "absolute",
    top: 0,
  },
  myDrinkSpeechBubble: {
    position: "absolute",
    top: "-100%",
    right: "-80%",
    width: scale(100),
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: moderateScale(5),
    borderRadius: moderateScale(10),
    alignItems: "center",
  },
  bottomDrinkSpeechBubble: {
    position: "absolute",
    top: "-100%",
    left: "-80%",
    width: scale(100),
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: moderateScale(5),
    borderRadius: moderateScale(10),
    alignItems: "center",
  },
  bottomDrinkSpeechBubbleText: {
    color: "#fff",
    fontSize: scale(12),
    textAlign: "center",
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  /* Bar2Screen Modal Styles */
  modalOverlay: {
    flex: 1,
    marginBottom: verticalScale(220),
    height,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    height: height * 0.65,
    borderWidth: "8@ms",
    borderColor: "#460b2a",
    backgroundColor: "#592540",
    position: "relative",
    borderRadius: "16@ms",
    paddingVertical: "50@ms",
    paddingHorizontal: "20@ms",
    alignItems: "flex-start",
  },
  closeButton: {
    position: "absolute",
    top: "12@ms",
    right: "12@ms",
  },
  modalImage: {
    width: "180@ms",
    height: "180@ms",
    borderRadius: "90@ms",
    marginBottom: "16@ms",
    alignSelf: "center",
  },
  drinkSpeechBubble: {
    position: "absolute",
    bottom: "-160%",
    left: "560%",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: "5@ms",
    borderRadius: "10@ms",
    width: scale(100),
  },
  drinkSpeechBubbleText: {
    color: "#fff",
    fontSize: "14@ms",
    fontFamily: FontNames.MontserratRegular,
    textAlign: "center",
  },
  modalText: {
    marginTop: "16@ms",
    alignItems: "flex-start",
  },
  modalName: {
    color: "#e2a350",
    fontSize: "38@ms",
    fontFamily: FontNames.MontserratBold,
  },
  modalLocation: {
    color: "white",
    fontSize: "20@ms",
    marginVertical: "8@ms",
    fontFamily: FontNames.MontserratRegular,
    alignSelf: "flex-start",
  },
  modalDescription: {
    color: "#ffe3d0",
    fontSize: "16@ms",
    alignSelf: "flex-start",
  },
 
  /* Mingles Modal Styles */
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

export { ChatScreen };
