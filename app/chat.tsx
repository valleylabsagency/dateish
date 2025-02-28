import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
} from "react-native";
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
} from "firebase/firestore";
import { drinkMapping } from "./utils/drinkMapping"; // Assuming you have a separate file for drink mappings.

const { width, height } = Dimensions.get("window");

export default function ChatScreen() {
  const router = useRouter();
  // Get the partner's uid from the route (e.g., /chat?partner=partnerUID)
  const { partner } = useLocalSearchParams();
  const partnerId = partner; // Should be the uid string.
  const currentUserId = auth.currentUser?.uid;

  // Compute chatId by sorting the two UIDs and joining them with an underscore.
  const chatId =
    currentUserId && partnerId
      ? [currentUserId, partnerId].sort().join("_")
      : null;

  // State to store the partner's profile fetched from Firestore.
  const [partnerProfile, setPartnerProfile] = useState(null);

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

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  // Removed the main screen speech bubble state for the partner's drink.
  // Added modal drink bubble state for the partner's drink in the modal.
  const [showModalDrinkSpeech, setShowModalDrinkSpeech] = useState(false);
  // State to trigger Mr. Mingles warning when user texts twice with no response.
  const [mingModalVisible, setMingModalVisible] = useState(false);
  // Animated value for Mr. Mingles image.
  const rollAnim = useRef(new Animated.Value(500)).current;

  const { showNotification } = useContext(NotificationContext);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender !== currentUserId) {
        showNotification(lastMsg.text, chatId);
      }
    }
  }, [messages]);

  // Subscribe to real-time updates from the chat's "messages" subcollection.
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(firestore, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const msgs = [];
        querySnapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() });
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

  // Animate Mr. Mingles image when the warning modal is shown.
  useEffect(() => {
    Animated.timing(rollAnim, {
      toValue: mingModalVisible ? 0 : 500,
      duration: mingModalVisible ? 1000 : 0,
      useNativeDriver: true,
    }).start();
  }, [mingModalVisible]);

  // Function to send a message.
  const sendMessage = async () => {
    if (inputMessage.trim() === "" || !chatId) return;
    
    // Count consecutive messages from currentUser (no partner response)
    let consecutiveCount = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === currentUserId) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    // If two or more consecutive messages have already been sent, show Mr. Mingles warning.
    if (consecutiveCount >= 2) {
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
          updatedAt: serverTimestamp(),
          lastMessage: inputMessage,
          partnerName: partnerProfile ? partnerProfile.name : "",
          partnerPhotoUri: partnerProfile && partnerProfile.drink
            ? drinkMapping[partnerProfile.drink.toLowerCase()]
            : drinkMapping["water"],
        });
      } else {
        await updateDoc(chatDocRef, {
          updatedAt: serverTimestamp(),
          lastMessage: inputMessage,
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

  // Optional auto-reply simulation (for testing purposes).
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === currentUserId) {
        const timer = setTimeout(async () => {
          try {
            const messagesRef = collection(firestore, "chats", chatId, "messages");
            await addDoc(messagesRef, {
              text: "Auto-reply: I'm busy right now!",
              sender: partnerId,
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            console.error("Error sending auto-reply:", error);
          }
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Determine current user's drink icon.
  const currentUserDrink = profile && profile.drink ? profile.drink : "water";
  const currentUserDrinkIcon = drinkMapping[currentUserDrink.toLowerCase()];

  // Determine partner's drink icon.
  const partnerDrink = partnerProfile && partnerProfile.drink ? partnerProfile.drink : "water";
  const partnerDrinkIcon = drinkMapping[partnerDrink.toLowerCase()];

  // Map each drink to its corresponding text.
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

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={styles.background}
    >
      {/* Top Navbar */}
      <ProfileNavbar onBack={() => router.back()} />

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
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
                {msg.createdAt && msg.createdAt.seconds && (
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
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Profile Pictures with Drink Overlays */}
      <View style={styles.bottomProfiles}>
        <View style={styles.profileWithDrink}>
          <TouchableOpacity onPress={() => router.push("/profile?self=true")}>
            <Image source={currentUserImage} style={styles.currentUserImage} />
          </TouchableOpacity>
          <View style={styles.drinkOverlay}>
            <Image source={currentUserDrinkIcon} style={[styles.drinkIcon, styles.myDrink]} />
          </View>
        </View>
        <View style={styles.profileWithDrink}>
          <TouchableOpacity onPress={() => setShowPartnerModal(true)}>
            {partnerProfile && partnerProfile.photoUri ? (
              <Image source={{ uri: partnerProfile.photoUri }} style={styles.partnerImage} />
            ) : (
              <Image source={require("../assets/images/person1.jpg")} style={styles.partnerImage} />
            )}
          </TouchableOpacity>
          {/* Partner drink overlay is now static (non-clickable) */}
          <View style={styles.drinkOverlay}>
            <Image source={partnerDrinkIcon} style={[styles.drinkIcon, styles.otherDrink]} />
          </View>
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
                {partnerProfile && partnerProfile.photoUri ? (
                  <Image source={{ uri: partnerProfile.photoUri }} style={styles.modalProfileImage} />
                ) : (
                  <Image source={require("../assets/images/person1.jpg")} style={styles.modalProfileImage} />
                )}
              </View>
              {/* New Drink Section in Modal */}
              <View style={styles.modalDrinkContainer}>
                <TouchableOpacity onPress={() => setShowModalDrinkSpeech(!showModalDrinkSpeech)}>
                  <Image source={partnerDrinkIcon} style={styles.modalDrinkIcon} />
                </TouchableOpacity>
                {showModalDrinkSpeech && (
                  <View style={styles.modalDrinkSpeechBubble}>
                    <Text style={styles.modalDrinkSpeechBubbleText}>{partnerDrinkText}</Text>
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
                  {partnerProfile ? partnerProfile.about : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mr. Mingles Warning Modal */}
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
            <Text style={styles.mingModalText}>Wait for them to answer. Don't be a creep!</Text>
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

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 100 },
  chatContainer: { flex: 1 },
  chatContent: { paddingBottom: 20 },
  chatBubble: {
    maxWidth: "70%",
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    position: "relative",
  },
  userBubble: { backgroundColor: "#e4ddff", alignSelf: "flex-start" },
  partnerBubble: { backgroundColor: "#dde5ff", alignSelf: "flex-end" },
  chatText: { fontSize: 16, color: "#000" },
  timestamp: {
    fontSize: 12,
    color: "#666",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    marginVertical: 10,
    alignItems: "center",
    position: "relative",
    bottom: 100,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#4a0a0f",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: "#ffe3d0",
    fontSize: 16,
    fontFamily: FontNames.MontserratRegular,
  },
  bottomProfiles: {
    position: "absolute",
    bottom: 250,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  profileWithDrink: {
    position: "relative",
  },
  currentUserImage: { width: 110, height: 110, borderRadius: 55 },
  partnerImage: { width: 110, height: 110, borderRadius: 55 },
  drinkOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  drinkIcon: { width: 52, height: 59 },
  myDrink: {
    position: "absolute",
    left: 18,
    bottom: 67,
  },
  otherDrink: {
    position: "absolute",
    right: 123,
    bottom: 67,
  },
  bottomNavbarContainer: { position: "absolute", bottom: 0, width: "100%" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalContainer: {
    width: "90%",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 30,
    right: 40,
    zIndex: 10,
  },
  modalCloseButtonText: { fontSize: 24, color: "#fff" },
  profileCard: {
    backgroundColor: "rgba(69,26,31,0.8)",
    borderColor: "#371015",
    borderWidth: 8,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalImageContainer: { marginBottom: 10 },
  modalProfileImage: { width: 220, height: 220, borderRadius: 110 },
  modalInfoContainer: { alignItems: "flex-start", marginTop: 10 },
  nameText: {
    color: "red",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
    fontFamily: FontNames.MontserratRegular,
  },
  locationText: {
    color: "orange",
    fontSize: 22,
    marginBottom: 10,
    fontFamily: FontNames.MontserratRegular,
  },
  descriptionText: {
    color: "beige",
    fontSize: 23,
    textAlign: "left",
    width: 300,
    fontFamily: FontNames.MontserratRegular,
  },
  // New styles for the modal drink section
  modalDrinkContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  modalDrinkText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: FontNames.MontserratRegular,
  },
  modalDrinkSpeechBubble: {
    position: "absolute",
    bottom: 50,
    left: -10,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 5,
    borderRadius: 10,
  },
  modalDrinkIcon: {
    height: 65,
    width: 50,
    position: "absolute",
    left: 50,
    bottom: -20,
  },
  modalDrinkSpeechBubbleText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FontNames.MontserratRegular,
  },
  // Styles for Mr. Mingles Warning Modal
  mingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mingModalContainer: {
    width: "90%",
    height: 400,
    backgroundColor: "#020621",
    borderWidth: 4,
    borderColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: "center",
    position: "relative",
    bottom: 140,
  },
  mingModalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 100,
  },
  mingModalCloseButtonText: {
    color: "#fff",
    fontSize: 48,
    fontFamily: FontNames.MontserratExtraLight,
  },
  mingModalText: {
    color: "#eceded",
    fontSize: 32,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "400",
    fontFamily: FontNames.MontserratExtraLight,
  },
  mingTriangleContainer: {
    position: "absolute",
    bottom: -24,
    right: 24,
    width: 0,
    height: 0,
  },
  mingOuterTriangle: {
    width: 5,
    height: 5,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderTopWidth: 24,
    position: "absolute",
    left: -44,
    top: -24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
  mingInnerTriangle: {
    position: "absolute",
    top: -25,
    left: -40,
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderTopWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#020621",
  },
  mingMrMingles: {
    width: 350,
    height: 420,
    position: "absolute",
    bottom: -440,
    right: -100,
  },
});

export { ChatScreen };
