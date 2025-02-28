import React, { useState, useEffect } from "react";
import {
  View,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import { useRouter } from "expo-router";
import { auth, firestore } from "../firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import BottomNavbar from "../components/BottomNavbar";
import ConversationPreview from "../components/ConversationPreview";

const { width } = Dimensions.get("window");

export default function ChatsScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  // Query Firestore for chat conversations where the current user is a participant.
  useEffect(() => {
    if (!currentUserId) return;
    const chatsRef = collection(firestore, "chats");
    // Query chat documents that contain the current user in the "users" array.
    const q = query(
      chatsRef,
      where("users", "array-contains", currentUserId),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const convs: any[] = [];
        querySnapshot.forEach((doc) => {
          convs.push({ id: doc.id, ...doc.data() });
        });
        setConversations(convs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching conversations:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUserId]);

  if (!fontsLoaded || loading) {
    return (
      <View style={chatsStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/chat-background.png")}
      style={chatsStyles.background}
      blurRadius={5}
    >
      <ScrollView contentContainerStyle={chatsStyles.scrollContent}>
        {conversations.map((conv) => (
          <ConversationPreview
            key={conv.id}
            conversation={conv}
            currentUserId={currentUserId}
          />
        ))}
      </ScrollView>

      <View style={chatsStyles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Chats" />
      </View>
    </ImageBackground>
  );
}

const chatsStyles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingVertical: 20,
    alignItems: "center",
    width: "100%",
  },
  bottomNavbarContainer: { position: "absolute", bottom: 0, width: "100%" },
});

export { ChatsScreen };
