// ConversationPreview.tsx
import React, { useState, useEffect } from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { FontNames } from "../constants/fonts";

interface ConversationPreviewProps {
  conversation: any;
  currentUserId: string;
}

const ConversationPreview: React.FC<ConversationPreviewProps> = ({ conversation, currentUserId }) => {
  const router = useRouter();
  const partnerUid = conversation.users.filter((uid: string) => uid !== currentUserId)[0];
  const partnerName = conversation.partnerName || partnerUid;
  const lastMsg = conversation.lastMessage || "";
  const timestamp =
    conversation.updatedAt && conversation.updatedAt.seconds
      ? new Date(conversation.updatedAt.seconds * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  
  const [photoUri, setPhotoUri] = useState<string>("");

  useEffect(() => {
    const fetchPartnerProfile = async () => {
      const userDocRef = doc(firestore, "users", partnerUid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.photoUri && typeof data.photoUri === "string" && data.photoUri.trim().length > 0) {
          setPhotoUri(data.photoUri);
        }
      }
    };
    fetchPartnerProfile();
  }, [partnerUid]);

  return (
    <TouchableOpacity
      style={conversationStyles.chatPreview}
      onPress={() => router.push(`/chat?partner=${partnerUid}`)}
    >
      <Image
        source={photoUri ? { uri: photoUri } : require("../assets/images/person1.jpg")}
        style={conversationStyles.previewImage}
      />
      <View style={conversationStyles.previewTextContainer}>
        <Text style={conversationStyles.previewName}>{partnerName}</Text>
        <Text style={conversationStyles.previewLastMessage}>
          {lastMsg.length > 30 ? lastMsg.slice(0, 30) + "..." : lastMsg}
        </Text>
      </View>
      <Text style={conversationStyles.previewTimestamp}>{timestamp}</Text>
    </TouchableOpacity>
  );
};

const conversationStyles = StyleSheet.create({
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
});

export default ConversationPreview;
