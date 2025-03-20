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
  ActivityIndicator,
  Animated,
  Keyboard
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
  arrayUnion
} from "firebase/firestore";
import { drinkMapping } from "./utils/drinkMapping";
// 1) Import size-matters
import {
  ScaledSheet,
  moderateScale,
  scale,
  verticalScale,
} from "react-native-size-matters";

export default function ChatScreen() {
  const [displayedText, setDisplayedText] = useState("");
  const router = useRouter();
  // Get the partner's uid from the route (e.g. /chat?partner=partnerUID)
  const { partner } = useLocalSearchParams();
  const partnerId = partner; // Should be the UID string.
  const currentUserId = auth.currentUser?.uid;
  const [showCurrentUserDrinkSpeech, setShowCurrentUserDrinkSpeech] = useState(false);
  const [showPartnerDrinkSpeech, setShowPartnerDrinkSpeech] = useState(false);  

  const inputRef = useRef<TextInput | null>(null);

  // Compute chatId by sorting the two UIDs and joining them with an underscore.
  const chatId =
    currentUserId && partnerId
      ? [currentUserId, partnerId].sort().join("_")
      : null;

  // State to store the partner's profile from Firestore.
  const [partnerProfile, setPartnerProfile] = useState(null);

  const truncateDescription = (text: string, limit: number = 35) => {
    if (text.length > limit) {
      return text.slice(0, limit) + "...";
    }
    return text;
  };

  // Fetch partner's profile from the "users" collection.
  useEffect(() => {
    const fetchPartnerProfile = async () => {
      if (partnerId) {
        try {
          const partnerDocRef = doc(firestore, "users", partnerId);
          const partnerDocSnap = await getDoc(partnerDocRef);
          if (partnerDocSnap.exists()) {
            setPartnerProfile({ id: partnerDocSnap.id, ...partnerDocSnap.data() });
          } else {
            console.log("No partner profile found for uid:", partnerId);
          }
        } catch (error) {
          console.error("Error fetching partner profile:", error);
        }
      }
    };
    fetchPartnerProfile();
  }, [partnerId]);

  // Get current user's profile from context.
  const { profile } = useContext(ProfileContext);
  const currentUserImage = profile?.photoUri
    ? { uri: profile.photoUri }
    : require("../assets/images/tyler.jpeg");

   
  // Font loading
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);

  // UI states
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showModalDrinkSpeech, setShowModalDrinkSpeech] = useState(false);
  const [mingModalVisible, setMingModalVisible] = useState(false); // For "Don't be a creep" warning
  const [typingModalVisible, setTypingModalVisible] = useState(false);

  // Animated value for Mr. Mingles image
  const rollAnim = useRef(new Animated.Value(500)).current;

  // New state and constant for typewriter effect on warning text
  const [mingDisplayedText, setMingDisplayedText] = useState("");
  const fullMingText = "Wait for them to answer. Don't be a creep!";

  // Notification context
  const { updateNotification } = useContext(NotificationContext);

  // Create a ref for the ScrollView
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Show a local notification if the last incoming message wasn't ours
  useEffect(() => {
    if (messages.length > 0 && partnerProfile) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender !== currentUserId) {
        const senderName = partnerProfile.name ? partnerProfile.name : "Partner";
        updateNotification(lastMsg.text, senderName);
      }
    }
  }, [messages, partnerProfile]);
  
  // Subscribe to real-time updates from the chat's "messages" subcollection
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(firestore, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const msgs = [];
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

  // Always auto-scroll to bottom so newest messages are visible
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Animate Mr. Mingles image when the warning modal is shown
  useEffect(() => {
    Animated.timing(rollAnim, {
      toValue: mingModalVisible ? 0 : 500,
      duration: mingModalVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [mingModalVisible]);

  // Typewriter effect for Mr. Mingles warning text when modal is visible
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (mingModalVisible) {
      setMingDisplayedText("");
      let index = 0;
      intervalId = setInterval(() => {
        index++;
        setMingDisplayedText(fullMingText.substring(0, index));
        if (index === fullMingText.length) {
          clearInterval(intervalId);
        }
      }, 30);
    } else {
      setMingDisplayedText("");
    }
    return () => clearInterval(intervalId);
  }, [mingModalVisible]);

  // Send a message
  const sendMessage = async () => {
    if (inputMessage.trim() === "" || !chatId) return;
    setTypingModalVisible(false);
    Keyboard.dismiss();
    setInputMessage("");

    // Determine if the partner has responded at least once.
    const partnerHasResponded = messages.some((msg) => msg.sender !== currentUserId);
 
    // If no partner message exists and there's already one user-sent message => warn
    if (!partnerHasResponded && messages.length >= 1) {
      setMingModalVisible(true);
      return;
    }

    try {
      // Update or create the chat document with metadata.
      const chatDocRef = doc(firestore, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          users: [currentUserId, partnerId],
          visibleFor: [currentUserId, partnerId],
          updatedAt: serverTimestamp(),
          lastMessage: inputMessage,
          partnerName: partnerProfile ? partnerProfile.name : "",
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
          visibleFor: arrayUnion(currentUserId, partnerId)
        });
      }

      // Add the new message.
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

  // Drink icons
  const currentUserDrink = profile?.drink ? profile.drink : "water";
  const currentUserDrinkIcon = drinkMapping[currentUserDrink.toLowerCase()];
  const partnerDrink = partnerProfile?.drink ? partnerProfile.drink : "water";
  const partnerDrinkIcon = drinkMapping[partnerDrink.toLowerCase()];

  // Map each partner drink to text
  const partnerDrinkTextMapping = {
    wine: "Where's the romance at?",
    beer: "Chill night... Sup?",
    whiskey: "I'm an adult.",
    martini: "I'm smart and beautiful!",
    vodka: "Get the party started!",
    tequila: "Gonna get fucked tonight",
    absinthe: "Who are you?",
    water: "I don't need alcohol to have fun",
  };
  const partnerDrinkText = partnerDrinkTextMapping[partnerDrink.toLowerCase()];
  const currentUserDrinkText = partnerDrinkTextMapping[currentUserDrink.toLowerCase()];

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Top Navbar */}
      <ProfileNavbar onBack={() => router.back()} />

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ChatWrapper: limit visible area and clip overflow */}
        <View style={styles.chatWrapper}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
          >
            {loadingMessages ? (
              <ActivityIndicator size="large" color="#fff" />
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
                      {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Text Input + Send */}
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={() => setTypingModalVisible(true)}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              onPress={() => setTypingModalVisible(true)}
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
      <Modal
        visible={typingModalVisible}
        animationType="fade"
        transparent={true}
      >
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

      {/* Bottom Profile Pictures with Drink Overlays */}
      <View style={styles.bottomProfiles}>
        <View style={styles.profileWithDrink}>
          <TouchableOpacity onPress={() => router.push("/profile?self=true&from=chat")}>
            <Image source={currentUserImage} style={styles.currentUserImage} />
          </TouchableOpacity>
          {/* Wrap the drink icon in a touchable */}
          <TouchableOpacity onPress={() => setShowCurrentUserDrinkSpeech(!showCurrentUserDrinkSpeech)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <View style={styles.drinkOverlay}>
            <Image
                source={currentUserDrinkIcon}
                style={[
                  styles.drinkIcon,
                  styles.myDrink,
                  currentUserDrink.toLowerCase() === "water" && {
                    width: moderateScale(30),
                    height: moderateScale(65),
                    bottom: "130%"
                  },
                ]}
              />
              {showCurrentUserDrinkSpeech && (
                <View style={styles.myDrinkSpeechBubble}>
                  <Text style={styles.bottomDrinkSpeechBubbleText}>{currentUserDrinkText}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.profileWithDrink}>
          <TouchableOpacity onPress={() => setShowPartnerModal(true)}>
            {partnerProfile?.photoUri ? (
              <Image source={{ uri: partnerProfile.photoUri }} style={styles.partnerImage} />
            ) : (
              <View style={styles.partnerIconContainer}>
                <MaterialIcons name="person" size={scale(80)} color="grey" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPartnerDrinkSpeech(!showPartnerDrinkSpeech)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <View style={styles.drinkOverlay}>
            <Image
                source={partnerDrinkIcon}
                style={[
                  styles.drinkIcon,
                  styles.otherDrink,
                  partnerDrink.toLowerCase() === "water" && {
                    width: moderateScale(30),
                    height: moderateScale(65),
                    bottom: "130%"
                  },
                ]}
              />
              {showPartnerDrinkSpeech && (
                <View style={styles.bottomDrinkSpeechBubble}>
                  <Text style={styles.bottomDrinkSpeechBubbleText}>{partnerDrinkText}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Partner Profile Modal */}
      <Modal
        visible={showPartnerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPartnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPartnerModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>X</Text>
            </TouchableOpacity>
            <View style={styles.profileCard}>
              <View style={styles.modalImageContainer}>
                {partnerProfile?.photoUri ? (
                  <Image
                    source={{ uri: partnerProfile.photoUri }}
                    style={styles.modalProfileImage}
                  />
                ) : (
                  <View style={styles.partnerIconContainer}>
                    <MaterialIcons
                      name="person"
                      size={scale(80)}
                      color="grey"
                    />
                  </View>
                )}
              </View>

              <View style={styles.modalDrinkContainer}>
                <TouchableOpacity
                  onPress={() => setShowModalDrinkSpeech(!showModalDrinkSpeech)}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Image
                source={partnerDrinkIcon}
                style={[
                 styles.modalDrinkIcon,
                  partnerDrink.toLowerCase() === "water" && {
                    width: moderateScale(40),
                    height: moderateScale(80),
                  },
                ]}
              />
                </TouchableOpacity>
                {showModalDrinkSpeech && (
                  <View style={styles.modalDrinkSpeechBubble}>
                    <Text style={styles.modalDrinkSpeechBubbleText}>
                      {partnerDrinkText}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalInfoContainer}>
                <Text style={styles.nameText}>
                  {partnerProfile ? partnerProfile.name : "Partner"},{" "}
                  {partnerProfile ? partnerProfile.age : ""}
                </Text>
                <Text style={styles.locationText}>
                  {partnerProfile ? partnerProfile.location : ""}
                </Text>
                <Text style={styles.descriptionText}>
                  {partnerProfile ? truncateDescription(partnerProfile.about) : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* "Don't be a creep" Warning Modal with Typewriter Effect */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mingModalVisible}
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

      {/* Bottom Navbar */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Chats" />
      </View>
    </ImageBackground>
  );
}

// Keep the separate typingModalStyles, but also convert numeric values there.
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
    height: "100@vs", // vertical scale
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

const styles = ScaledSheet.create({
  /* Basic background fill */
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
  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Top-level container for content under the navbar */
  container: {
    flex: 1,
  },

  /* The region that holds the chat messages */
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

  /* Chat bubbles */
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

  /* Input area fixed to bottom */
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
    width: scale(230)
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

  /* Bottom profile images & drink overlays */
  bottomProfiles: {
    position: "absolute",
    bottom: "28%",
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
    width: "110@ms",
    height: "110@ms",
    position: "relative",
    right: "5%",
    borderRadius: "55@ms",
  },
  partnerImage: {
    width: "110@ms",
    height: "110@ms",
    position: "relative",
    left: "5%",
    borderRadius: "55@ms",
  },
  drinkOverlay: {
    position: "absolute",
    width: moderateScale(10),
    height: moderateScale(50),
    bottom: "75%", // Moved both drinks up (changed from "65%" to "75%")
    right: 0,
  },
  drinkIcon: {
    width: "52@ms",
    height: "59@ms",
  },
  myDrink: {
    bottom: "120%",
    left: "40%" // Moved user drink bubble left (changed from "50%" to "40%")
  },
  otherDrink: {
    bottom: "120%",
    right: "1430%" // Moved partner drink bubble over its icon (changed from "-1500%" to "50%")
  },
  myDrinkSpeechBubble: {
    position: "absolute",
    top: "-105@ms",
    right: "-800%",
    width: scale(100),
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: moderateScale(5),
    borderRadius: moderateScale(10),
    alignItems: "center",
  },
  bottomDrinkSpeechBubble: {
    position: "absolute",
    top: "-105@ms",
    right: "700%",
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

  /* Bottom navbar */
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  /* Partner Profile Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalContainer: {
    width: "90%",
    height: "500@vs",
    paddingVertical: "20@ms",
    paddingHorizontal: "8@ms",
    alignItems: "center",
    position: "relative",
    bottom: "10%",
  },
  modalCloseButton: {
    position: "absolute",
    top: "5%",
    right: "10%",
    zIndex: 10,
  },
  modalCloseButtonText: {
    fontSize: "24@ms",
    color: "#fff",
  },
  profileCard: {
    backgroundColor: "rgba(69,26,31,0.8)",
    borderColor: "#371015",
    borderWidth: "8@ms",
    borderRadius: "20@ms",
    paddingHorizontal: "20@ms",
    paddingVertical: "30@ms",
    height: "470@vs",
    alignItems: "center",
  },
  modalImageContainer: {
    marginBottom: "10@ms",
  },
  modalProfileImage: {
    width: "250@ms",
    height: "250@ms",
    borderRadius: "130@ms",
  },
  modalDrinkContainer: {
    height: scale(30),
    alignItems: "center",
    marginVertical: "10@ms",
  },
  modalDrinkIcon: {
    height: "65@ms",
    width: "50@ms",
    position: "absolute",
    left: "20%",
    bottom: "-15%",
  },
  modalDrinkSpeechBubble: {
    position: "absolute",
    bottom: "310%",
    left: "-10%",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: "5@ms",
    borderRadius: "10@ms",
  },
  modalDrinkSpeechBubbleText: {
    color: "#fff",
    fontSize: "14@ms",
    fontFamily: FontNames.MontserratRegular,
  },
  modalInfoContainer: {
    alignItems: "flex-start",
    marginTop: "10@ms",
  },
  nameText: {
    color: "red",
    fontSize: "32@ms",
    fontWeight: "bold",
    marginBottom: "5@ms",
    fontFamily: FontNames.MontserratRegular,
  },
  locationText: {
    color: "orange",
    fontSize: "22@ms",
    marginBottom: "10@ms",
    fontFamily: FontNames.MontserratRegular,
  },
  descriptionText: {
    color: "beige",
    fontSize: "23@ms",
    textAlign: "left",
    width: "300@ms",
    fontFamily: FontNames.MontserratRegular,
  },

  /* "Don't be a creep" modal */
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
