// chat.tsx
import React, { useState, useEffect, useContext } from "react";
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
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProfileContext } from "../contexts/ProfileContext";
import BottomNavbar from "../components/BottomNavbar";
import ProfileNavbar from "../components/ProfileNavbar";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

// Dummy partner profiles (extended with age, location, description)
const partnerProfiles = [
  {
    id: 1,
    name: "Alice",
    age: "28",
    location: "New York, USA",
    description: "Loves art, coffee, and long walks in Central Park.",
    image: require("../assets/images/person1.jpg"),
  },
  {
    id: 2,
    name: "Bob",
    age: "32",
    location: "San Francisco, USA",
    description:
      "Tech enthusiast, surfer, and foodie who enjoys exploring new places.",
    image: require("../assets/images/person2.jpg"),
  },
  {
    id: 3,
    name: "Carmen",
    age: "25",
    location: "Austin, USA",
    description:
      "Musician and creative spirit, always looking for a new adventure.",
    image: require("../assets/images/person3.jpg"),
  },
];

export default function ChatScreen() {
  const router = useRouter();
  // Get partner index from route search params (e.g. /chat?partner=1)
  const { partner } = useLocalSearchParams();
  const partnerIndex = partner ? parseInt(partner) : 0;
  const chatPartner = partnerProfiles[partnerIndex] || partnerProfiles[0];

  // Get current user profile from context.
  const { profile } = useContext(ProfileContext);
  const currentUserImage = profile?.photoUri
    ? { uri: profile.photoUri }
    : require("../assets/images/tyler.jpeg");

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  // State for controlling the partner profile modal pop-up
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  // Save the current conversation locally so it can be used in the Chats page.
  const updateConversation = async () => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const conversation = {
        partnerIndex,
        lastMessage:
          lastMsg.text.length > 30
            ? lastMsg.text.slice(0, 30) + "..."
            : lastMsg.text,
        fromUser: lastMsg.sender === "user",
        timestamp: new Date().toISOString(),
        messages,
      };
      try {
        await AsyncStorage.setItem(`chat_${partnerIndex}`, JSON.stringify(conversation));
      } catch (error) {
        console.error("Failed to update conversation", error);
      }
    }
  };

  useEffect(() => {
    updateConversation();
  }, [messages]);

  // When the user sends a message, add it and schedule an auto reply.
  const sendMessage = () => {
    if (inputMessage.trim() === "") return;
    const newMessage = { sender: "user", text: inputMessage };
    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setTimeout(() => {
      const autoResponse = {
        sender: "partner",
        text: "You need to moisturize, you lookin' wrinkly",
      };
      setMessages((prev) => [...prev, autoResponse]);
    }, 5000);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={styles.background}
    >
      {/* Top Navbar using standard ProfileNavbar */}
      <ProfileNavbar />

      {/* Chat area */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.chatBubble,
                msg.sender === "user" ? styles.userBubble : styles.partnerBubble,
              ]}
            >
              <Text style={styles.chatText}>{msg.text}</Text>
            </View>
          ))}
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

      {/* Bottom profile pictures with navigation */}
      <View style={styles.bottomProfiles}>
        <TouchableOpacity onPress={() => router.push("/profile?self=true")}>
          <Image source={currentUserImage} style={styles.currentUserImage} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPartnerModal(true)}>
          <Image source={chatPartner.image} style={styles.partnerImage} />
        </TouchableOpacity>
      </View>

      {/* Modal pop-up for chat partner profile */}
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
                <Image source={chatPartner.image} style={styles.modalProfileImage} />
              </View>
              <View style={styles.modalInfoContainer}>
                <Text style={styles.nameText}>
                  {chatPartner.name}, {chatPartner.age}
                </Text>
                <Text style={styles.locationText}>{chatPartner.location}</Text>
                <Text style={styles.descriptionText}>{chatPartner.description}</Text>
              </View>
            </View>
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
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  chatContainer: { flex: 1 },
  chatContent: { paddingBottom: 20 },
  chatBubble: {
    maxWidth: "70%",
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  userBubble: { backgroundColor: "#e4ddff", alignSelf: "flex-start" },
  partnerBubble: { backgroundColor: "#dde5ff", alignSelf: "flex-end" },
  chatText: { fontSize: 16, color: "#000" },
  inputContainer: { flexDirection: "row", marginVertical: 10, alignItems: "center", position: "relative", bottom: 100 },
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
  sendButtonText: { color: "#ffe3d0", fontSize: 16, fontFamily: FontNames.MontserratRegular },
  bottomProfiles: {
    position: "absolute",
    bottom: 250,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  currentUserImage: { width: 110, height: 110, borderRadius: 55 },
  partnerImage: { width: 110, height: 110, borderRadius: 55 },
  bottomNavbarContainer: { position: "absolute", bottom: 0, width: "100%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "90%", borderRadius: 20, padding: 20, alignItems: "center" },
  modalCloseButton: { position: "absolute", top: 30, right: 40, zIndex: 10 },
  modalCloseButtonText: { fontSize: 24, color: "#fff" },
  profileCard: {
    backgroundColor: "rgba(69,26,31,0.8)",
    borderColor: "#371015",
    borderWidth: 8,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalImageContainer: { marginBottom: 20 },
  modalProfileImage: { width: 220, height: 220, borderRadius: 110 },
  modalInfoContainer: { alignItems: "flex-start" },
  nameText: { color: "red", fontSize: 32, fontWeight: "bold", marginBottom: 5, fontFamily: FontNames.MontserratRegular },
  locationText: { color: "orange", fontSize: 22, marginBottom: 10, fontFamily: FontNames.MontserratRegular },
  descriptionText: { color: "beige", fontSize: 23, textAlign: "left", width: 300, fontFamily: FontNames.MontserratRegular },
});
