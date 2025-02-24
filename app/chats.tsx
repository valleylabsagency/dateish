// chats.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomNavbar from "../components/BottomNavbar";

const { width } = Dimensions.get("window");

export default function ChatsScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  const loadConversations = async () => {
    try {
      // Assuming dummy conversation keys for partner indices 0, 1, and 2
      const keys = ["chat_0", "chat_1", "chat_2"];
      const stores = await AsyncStorage.multiGet(keys);
      const convs = stores
        .map(([key, value]) => (value ? JSON.parse(value) : null))
        .filter(Boolean);
      setConversations(convs);
    } catch (error) {
      console.error("Error loading conversations", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  if (!fontsLoaded || loading) {
    return (
      <View style={chatsStyles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={chatsStyles.background}
      blurRadius={5} // Slight blur effect
    >
      <ScrollView contentContainerStyle={chatsStyles.scrollContent}>
        {conversations.map((conv) => (
          <TouchableOpacity
            key={conv.partnerIndex}
            style={chatsStyles.chatPreview}
            onPress={() => router.push(`/chat?partner=${conv.partnerIndex}`)}
          >
            <Image
              source={
                conv.partnerIndex === 0
                  ? require("../assets/images/person1.jpg")
                  : conv.partnerIndex === 1
                  ? require("../assets/images/person2.jpg")
                  : require("../assets/images/person3.jpg")
              }
              style={chatsStyles.previewImage}
            />
            <View style={chatsStyles.previewTextContainer}>
              <Text style={chatsStyles.previewName}>
                {conv.partnerIndex === 0
                  ? "Alice"
                  : conv.partnerIndex === 1
                  ? "Bob"
                  : "Carmen"}
              </Text>
              <Text style={chatsStyles.previewLastMessage}>
                {conv.fromUser ? "You: " : ""}
                {conv.lastMessage}
              </Text>
            </View>
            <Text style={chatsStyles.previewTimestamp}>
              {new Date(conv.timestamp).toLocaleTimeString()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Navbar */}
      <View style={chatsStyles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Chats" />
      </View>
    </ImageBackground>
  );
}

const chatsStyles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover", justifyContent: "center", alignItems: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingVertical: 20, alignItems: "center", width: "100%" },
  chatPreview: {
    backgroundColor: "rgb(89 37 66)",
    opacity: .85,
    borderColor: "#fff",
    borderWidth: 2,
    width: "95%",
    height: 150,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginVertical: 10,
  },
  previewImage: { width: 100, height: 100, borderRadius: 50 },
  previewTextContainer: { flex: 1, marginHorizontal: 10 },
  previewName: {
    color: "#fff",
    fontSize: 24,
    fontFamily: FontNames.MontserratRegular,
  },
  previewLastMessage: {
    color: "#fff",
    fontSize: 16,
    marginTop: 5,
    fontFamily: FontNames.MontserratRegular,
  },
  previewTimestamp: {
    color: "#fff",
    fontSize: 14,
    alignSelf: "flex-end",
  },
  bottomNavbarContainer: { position: "absolute", bottom: 0, width: "100%" },
});
