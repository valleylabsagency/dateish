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
import { auth, firestore } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import BottomNavbar from "../components/BottomNavbar";

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
    const q = query(chatsRef, where("users", "array-contains", currentUserId), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const convs = [];
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
        {conversations.map((conv) => {
          // Determine the partner's UID by filtering out the current user's UID.
          const partnerUid = conv.users.filter((uid) => uid !== currentUserId)[0];
          // Use conversation fields if available; otherwise, fall back to the partner's UID.
          const partnerName = conv.partnerName || partnerUid;
          const lastMsg = conv.lastMessage || "";
          // Format updatedAt timestamp if available.
          const timestamp =
            conv.updatedAt && conv.updatedAt.seconds
              ? new Date(conv.updatedAt.seconds * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
          return (
            <TouchableOpacity
              key={conv.id}
              style={chatsStyles.chatPreview}
              onPress={() => router.push(`/chat?partner=${partnerUid}`)}
            >
              <Image
                source={
                  conv.partnerPhotoUri && conv.partnerPhotoUri.trim().length > 0
                    ? { uri: conv.partnerPhotoUri }
                    : require("../assets/images/person1.jpg")
                }
                style={chatsStyles.previewImage}
              />
              <View style={chatsStyles.previewTextContainer}>
                <Text style={chatsStyles.previewName}>{partnerName}</Text>
                <Text style={chatsStyles.previewLastMessage}>
                  {lastMsg.length > 30 ? lastMsg.slice(0, 30) + "..." : lastMsg}
                </Text>
              </View>
              <Text style={chatsStyles.previewTimestamp}>{timestamp}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Navbar */}
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
  chatPreview: {
    backgroundColor: "rgb(89,37,66)",
    opacity: 0.85,
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

export { ChatsScreen };
