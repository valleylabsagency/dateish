// inbox.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
} from "react-native";
import { useFonts } from "expo-font";
import { useRouter, useLocalSearchParams } from "expo-router";
import { auth, firestore } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { getDatabase, ref, onValue } from "firebase/database";
import BottomNavbar from "../components/BottomNavbar";
import ConversationPreview from "../components/ConversationPreview";
import { MaterialIcons } from "@expo/vector-icons";
import ChatScreen from "./chat";
import { FontNames } from "../constants/fonts";

export default function InboxScreen() {
  const router = useRouter();
  const { partner } = useLocalSearchParams<{ partner?: string }>();
  const isChatMode = Boolean(partner);

  const currentUserId = auth.currentUser?.uid ?? "";

  // List mode state
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [partnerStatus, setPartnerStatus] = useState<Record<string, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null);

  // Load custom font
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  // Fetch conversations when not in chat mode
  useEffect(() => {
    if (isChatMode || !currentUserId) {
      setLoadingConvs(false);
      return;
    }
    const chatsRef = collection(firestore, "chats");
    const q = query(
      chatsRef,
      where("visibleFor", "array-contains", currentUserId),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const convs: any[] = [];
        snap.forEach(docSnap => {
          convs.push({ id: docSnap.id, ...docSnap.data() });
        });
        setConversations(convs);
        setLoadingConvs(false);
      },
      (err) => {
        console.error("Error fetching conversations:", err);
        setLoadingConvs(false);
      }
    );
    return () => unsub();
  }, [isChatMode, currentUserId]);

  // Subscribe to partner online status
  useEffect(() => {
    if (isChatMode || !currentUserId || conversations.length === 0) return;
    const db = getDatabase();
    const unsubFns: (() => void)[] = [];
    conversations.forEach(conv => {
      const partnerUid = conv.users.find((u: string) => u !== currentUserId);
      if (!partnerUid) return;
      const statusRef = ref(db, `status/${partnerUid}`);
      const unsub = onValue(statusRef, snap => {
        setPartnerStatus(prev => ({
          ...prev,
          [partnerUid]: snap.val()?.online ?? false,
        }));
      });
      unsubFns.push(unsub);
    });
    return () => unsubFns.forEach(fn => fn());
  }, [isChatMode, currentUserId, conversations]);

  // Deletion handlers
  const handleTrashPress = (chatId: string) => {
    setPendingDeleteChatId(chatId);
    setShowConfirmModal(true);
  };
  const confirmDelete = async () => {
    if (!pendingDeleteChatId) return;
    try {
      const chatDocRef = doc(firestore, "chats", pendingDeleteChatId);
      await updateDoc(chatDocRef, {
        visibleFor: arrayRemove(currentUserId),
      });
    } catch (err) {
      console.error("Error removing chat:", err);
    }
    setShowConfirmModal(false);
    setPendingDeleteChatId(null);
  };
  const cancelDelete = () => {
    setShowConfirmModal(false);
    setPendingDeleteChatId(null);
  };

  if (!fontsLoaded || (loadingConvs && !isChatMode)) {
    return (
      <View style={modalStyles.loadingContainer}>
        <ActivityIndicator size="large" color="gold" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/chat-full.png")}
      style={listStyles.background}
      blurRadius={isChatMode ? 0 : 5}
    >
      {isChatMode ? (
        <ChatScreen partner={partner!} />
      ) : (
        <ScrollView contentContainerStyle={listStyles.scrollContent}>
          {conversations.map(conv => {
            const partnerUid = conv.users.find((u: string) => u !== currentUserId)!;
            const online = partnerStatus[partnerUid];
            return (
              <TouchableOpacity
                key={conv.id}
                style={
                  online
                    ? listStyles.conversationContainer
                    : listStyles.disabledConversation
                }
                onPress={() => router.push(`/inbox?partner=${partnerUid}`)}
              >
                <ConversationPreview
                  conversation={conv}
                  online={online}
                  currentUserId={currentUserId}
                />
                <TouchableOpacity
                  style={online ? listStyles.trashOnline : listStyles.trashOffline}
                  onPress={() => handleTrashPress(conv.id)}
                >
                  <MaterialIcons name="delete" size={32} color="red" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalText}>
              Are you sure you want to delete this chat?
            </Text>
            <View style={modalStyles.modalButtonRow}>
              <TouchableOpacity style={modalStyles.modalButton} onPress={confirmDelete}>
                <Text style={modalStyles.modalButtonText}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.modalButton} onPress={cancelDelete}>
                <Text style={modalStyles.modalButtonText}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={listStyles.bottomNavbar}>
        <BottomNavbar selectedTab="Inbox" />
      </View>
    </ImageBackground>
  );
}

const listStyles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    paddingVertical: 50,
    alignItems: "center",
  },
  conversationContainer: {
    width: "100%",
    position: "relative",
    marginBottom: 20,
  },
  disabledConversation: {
    width: "100%",
    opacity: 0.5,
    position: "relative",
    marginBottom: 20,
  },
  trashOnline: {
    position: "absolute",
    top: 20,
    right: 10,
  },
  trashOffline: {
    position: "absolute",
    top: 20,
    right: 10,
  },
  bottomNavbar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});

const modalStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  modalButton: {
    backgroundColor: "red",
    borderRadius: 5,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
