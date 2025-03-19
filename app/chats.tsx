import React, { useState, useEffect } from "react";
import {
  View,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Modal,                // ADDED
  StyleSheet            // ADDED
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
  doc, 
  updateDoc, 
  arrayRemove 
} from "firebase/firestore";
import BottomNavbar from "../components/BottomNavbar";
import ConversationPreview from "../components/ConversationPreview";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ScaledSheet,
  moderateScale,
  scale,
  verticalScale,
} from "react-native-size-matters";

export default function ChatsScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // partnerStatus maps partnerUid => online (boolean)
  const [partnerStatus, setPartnerStatus] = useState<{ [uid: string]: boolean }>({});

  // ADDED / CHANGED: For the confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  // Query Firestore for chat conversations where the current user is a participant.
  useEffect(() => {
    if (!currentUserId) return;
    const chatsRef = collection(firestore, "chats");
    // Query chat documents that contain the current user in the "visibleFor" array.
    const q = query(
      chatsRef,
      where("visibleFor", "array-contains", currentUserId),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const convs: any[] = [];
        querySnapshot.forEach((docSnap) => {
          convs.push({ id: docSnap.id, ...docSnap.data() });
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

  // For each conversation, subscribe to the partner's online status.
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    if (currentUserId && conversations.length > 0) {
      conversations.forEach((conv) => {
        const partnerUid = conv.users.filter((uid: string) => uid !== currentUserId)[0];
        const partnerDocRef = doc(firestore, "users", partnerUid);
        const unsub = onSnapshot(partnerDocRef, (docSnap) => {
          setPartnerStatus((prev) => ({
            ...prev,
            [partnerUid]: docSnap.data()?.online,
          }));
        });
        unsubscribes.push(unsub);
      });
    }
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [conversations, currentUserId]);

  // ADDED / CHANGED: Handler to confirm deletion
  const handleTrashPress = (chatId: string) => {
    // Store which chat we intend to delete, show modal
    setPendingDeleteChatId(chatId);
    setShowConfirmModal(true);
  };

  // ADDED / CHANGED: Actually delete from "visibleFor"
  const confirmDelete = async () => {
    if (!pendingDeleteChatId || !currentUserId) return;

    try {
      const chatDocRef = doc(firestore, "chats", pendingDeleteChatId);
      await updateDoc(chatDocRef, {
        visibleFor: arrayRemove(currentUserId)
      });
    } catch (error) {
      console.error("Error removing from visibleFor:", error);
    }
    setShowConfirmModal(false);
    setPendingDeleteChatId(null);
  };

  // ADDED / CHANGED: Cancel deletion
  const cancelDelete = () => {
    setShowConfirmModal(false);
    setPendingDeleteChatId(null);
  };

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
          const partnerUid = conv.users.filter((uid: string) => uid !== currentUserId)[0];
          const isOnline = partnerStatus[partnerUid];
          
          if (isOnline === false) {
            // Partner offline: conversation is disabled, plus a trash icon
            return (
              <View key={conv.id} style={{ width: "100%" /* ensure key on root */ }}>
                <View
                  style={[
                    chatsStyles.conversationContainer,
                    chatsStyles.disabledConversation,
                  ]}
                >
                  <ConversationPreview
                    conversation={conv}
                    online={false}
                    currentUserId={currentUserId}
                  />
                </View>
                <Text style={chatsStyles.offlineText}>Offline</Text>
                <TouchableOpacity
                  onPress={() => handleTrashPress(conv.id)} // ADDED / CHANGED
                  style={[chatsStyles.trashIconContainer, chatsStyles.trashIconContainerOffline]}
                >
                  <MaterialIcons name="delete" size={32} color="red" />
                </TouchableOpacity>
              </View>
            );
          } else {
            // Partner online: clickable conversation + trash icon
            return (
              <TouchableOpacity
                key={conv.id}
                style={chatsStyles.conversationContainer}
                onPress={() => router.push(`/chat?partner=${partnerUid}`)}
              >
                <ConversationPreview
                  conversation={conv}
                  online={true}
                  currentUserId={currentUserId}
                />
                <TouchableOpacity
                  onPress={() => handleTrashPress(conv.id)} // ADDED / CHANGED
                  style={[chatsStyles.trashIconContainer, chatsStyles.trashIconContainerOnline]}
                >
                  <MaterialIcons name="delete" size={32} color="red" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }
        })}
      </ScrollView>

      {/* ADDED / CHANGED: Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>Are you sure you want to delete this chat?</Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalButton} onPress={confirmDelete}>
                <Text style={styles.modalButtonText}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={cancelDelete}>
                <Text style={styles.modalButtonText}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End of confirmation Modal */}

      <View style={chatsStyles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="Chats" />
      </View>
    </ImageBackground>
  );
}

const chatsStyles = ScaledSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingVertical: "50@ms", // replaced 20 with moderateScale(20)
    alignItems: "center",
    width: "100%",
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  conversationContainer: {
    width: "100%",
    height: "100@ms", // replaced scale(100) with a moderate scale
    justifyContent: "center", // keep conversation preview centered
    paddingVertical: 0,
    marginBottom: moderateScale(100),
  },
  disabledConversation: {
    opacity: 0.5, // greyed out look
  },
  offlineText: {
    fontFamily: FontNames.MontSerratSemiBold,
    fontSize: 62,
    position: "absolute",
    bottom: "55%",
    color: "#000",
    zIndex: 2000,
    left: "20%",
    opacity: 10,
  },
  trashIconContainerOnline: {
    position: "absolute",
    top: "40%",
    right: "5%",
  },
  trashIconContainerOffline: {
    position: "absolute",
    top: "20%",
    right: "5%",
  },
});

// ADDED / CHANGED: Basic modal styles outside ScaledSheet
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalText: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  modalButton: {
    backgroundColor: "red",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
  },
});
