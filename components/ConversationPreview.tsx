import React, { useState, useEffect } from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { FontNames } from "../constants/fonts";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";

interface ConversationPreviewProps {
  conversation: any;
  currentUserId: string;
  online: boolean;
}

/**
 * Space reserved so text doesn't collide with the trash icon
 * Keep this tight — adjust between 36–48 if needed
 */
const RIGHT_GUTTER_FOR_TRASH = 44;

const ConversationPreview: React.FC<ConversationPreviewProps> = ({
  conversation,
  currentUserId,
  online,
}) => {
  const router = useRouter();
  const partnerUid = conversation.users.filter(
    (uid: string) => uid !== currentUserId
  )[0];

  const [partnerName, setPartnerName] = useState("");
  const lastMsg = conversation.lastMessage || "";

  const timestamp = conversation.updatedAt?.seconds
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
      if (!userDocSnap.exists()) return;

      const data = userDocSnap.data();
      if (typeof data.photoUri === "string" && data.photoUri.trim()) {
        setPhotoUri(data.photoUri);
      }
      if (typeof data.name === "string") {
        setPartnerName(data.name);
      }
    };

    fetchPartnerProfile();
  }, [partnerUid]);

  return (
    <TouchableOpacity
      style={styles.chatPreview}
      onPress={() => {
        if (online) {
          router.push(`/chat?partner=${partnerUid}`);
        }
      }}
      activeOpacity={0.85}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
      ) : (
        <MaterialIcons name="person" size={120} color="white" />
      )}

      <View style={styles.previewTextContainer}>
        <AppText
          style={styles.previewName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {partnerName}
        </AppText>

        <AppText
          style={styles.previewLastMessage}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {lastMsg}
        </AppText>
      </View>

      {!!timestamp && <Text style={styles.previewTimestamp}>{timestamp}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chatPreview: {
    backgroundColor: "rgb(89,37,66)",
    opacity: 0.85,
    borderColor: "#fff",
    borderWidth: 2,
    width: "95%",
    height: 180,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingRight: RIGHT_GUTTER_FOR_TRASH,
    marginVertical: 10,
    position: "relative",
  },
  previewImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  previewTextContainer: {
    flex: 1,
    marginLeft: 6,
    marginRight: 6,
    justifyContent: "center",
  },
  previewName: {
    color: "#e2a350",
    fontSize: 24,
    fontFamily: FontNames.MontserratRegular,
  },
  previewLastMessage: {
    color: "#fff",
    fontSize: 16,
    marginTop: 6,
    fontFamily: FontNames.MontserratRegular,
    lineHeight: 20,
  },
  previewTimestamp: {
    position: "absolute",
    top: 10,
    right: 14,
    color: "#fff",
    fontSize: 14,
  },
});

export default ConversationPreview;
