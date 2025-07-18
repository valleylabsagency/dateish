// bar-2.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getDatabase, ref, onValue } from "firebase/database";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scale } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");
const BUBBLE_HEIGHT = height * 0.18;           // height for the speech bubble
// Spacing for the avatars
const START_OFFSET_RATIO = 0.085;
const SPACING_RATIO      = 0.2;
const AVATAR_SIZE        = 100;

export default function Bar2Screen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  const [profiles, setProfiles] = useState<any[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // NEW: whether we've tapped "Start Chatting"
  const [started, setStarted] = useState(false);

  // load persisted "started" flag
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("bar2Started");
        if (saved === "true") setStarted(true);
      } catch (e) {
        console.error("Load start-chat flag:", e);
      }
    })();
  }, []);

  // 1) fetch all other users
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(firestore, "users"));
        const all = snap.docs
          .filter(d => auth.currentUser && d.id !== auth.currentUser.uid)
          .map(d => ({ id: d.id, ...(d.data() as any) }));
        setProfiles(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) subscribe to realtime online status
  useEffect(() => {
    const db = getDatabase();
    const unsub: (() => void)[] = [];
    profiles.forEach(p => {
      const statusRef = ref(db, `status/${p.id}`);
      const off = onValue(statusRef, snap =>
        setOnlineStatus(prev => ({ ...prev, [p.id]: snap.val()?.online ?? false }))
      );
      unsub.push(off);
    });
    return () => unsub.forEach(f => f());
  }, [profiles]);

  const onlineProfiles = profiles.filter(p => onlineStatus[p.id]);

  if (!fontsLoaded || loading) {
    return (
      <ImageBackground
        source={require("../assets/images/bar-back.png")}
        style={styles.background}
        blurRadius={4}
      >
        <ActivityIndicator size="large" color="gold" />
      </ImageBackground>
    );
  }

  const startOffsetPx = width * START_OFFSET_RATIO;
  const spacingPx     = width * SPACING_RATIO;

  return (
    <ImageBackground
      source={require("../assets/images/bar-back.png")}
      style={styles.background}
    >
      {/* ─── WELCOME MODE: Mr. Mingles + speech bubble + button ───────── */}
      {!started && (
        <>
          {/* Speech bubble (blank for now) */}
          <View style={styles.bubbleContainer}>
            <ImageBackground
              source={require("../assets/images/speech-bubble.png")}
              style={styles.bubble}
              resizeMode="stretch"
            >
              {/* intentionally left blank */}
            </ImageBackground>
          </View>

          <View style={styles.minglesContainer}>
            <Image
              source={require("../assets/images/mr-mingles.png")}
              style={styles.minglesImage}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={async () => {
              setStarted(true);
              try {
                await AsyncStorage.setItem("bar2Started", "true");
              } catch (e) {
                console.error("Save start-chat flag:", e);
              }
            }}
          >
            <Text style={styles.startButtonText}>Start Chatting</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ─── CHAT MODE: avatars appear after "Start Chatting" ─────────── */}
      {started && onlineProfiles.length > 0 && (
        <View style={styles.onlineRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingLeft: startOffsetPx,
              paddingRight: startOffsetPx,
              alignItems: "center",
            }}
          >
            {onlineProfiles.map(p => (
              <TouchableOpacity
                key={p.id}
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  overflow: "hidden",
                  marginRight: spacingPx - 20,
                  borderWidth: 2,
                  borderColor: "white",
                }}
                onPress={() => {
                  setSelectedProfile(p);
                  setModalVisible(true);
                }}
              >
                <Image source={{ uri: p.photoUri }} style={styles.avatarImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── BACK BAR LAYERS ───────────────────────── */}
      <View style={styles.barFrontContainer}>
        <Image
          style={styles.barFront}
          source={require("../assets/images/bar-front.png")}
          resizeMode="contain"
        />
      </View>

      {/* ─── BOTTOM NAV ────────────────────────────── */}
      <View style={styles.bottomNavbarContainer}>
        <BottomNavbar selectedTab="bar-2" />
      </View>

      {/* ─── PROFILE DETAIL MODAL ──────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>

            {selectedProfile && (
              <>
                <Image
                  source={{ uri: selectedProfile.photoUri }}
                  style={styles.modalImage}
                />
                <View style={styles.modalText}>
                  <Text style={styles.modalName}>
                    {selectedProfile.name}, {selectedProfile.age}
                  </Text>
                  <Text style={styles.modalLocation}>
                    {selectedProfile.location}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {selectedProfile.about}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalChatButton}
                  onPress={() => {
                    setModalVisible(false);
                    router.push(`/chat?partner=${selectedProfile.id}`);
                  }}
                >
                  <Text style={styles.modalChatButtonText}>Chat</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    alignItems: "center",
  },
  // ─── BUBBLE ───────────────────────────────────
  bubbleContainer: {
    position: "absolute",
    bottom: height * 0.71,    // sits just above Mr. Mingles
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  bubble: {
    width: width * 0.9,
    height: BUBBLE_HEIGHT,
  },

  // ─── NEW: Mr. Mingles ─────────────────────────
  minglesContainer: {
    position: "absolute",
    bottom: height * 0.06,
    left: width * 0.08,
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  minglesImage: {
    width: width * 0.8,
    height: height * 0.8,
  },
  startButton: {
    position: "absolute",
    bottom: height * 0.17,
    alignSelf: "center",
    backgroundColor: "#6e1944",
    borderWidth: 4,
    borderColor: "#460b2a",
    width: "90%",
    height: 70,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
    paddingTop: 10,
  },
  startButtonText: {
    fontSize: 32,
    fontFamily: FontNames.MontserratRegular,
    textTransform: "uppercase",
    color: "#ffe3d0",
    textAlign: "center",
  },

  // ─── ONLINE ROW ──────────────────────────────
  onlineRow: {
    position: "absolute",
    top: height * 0.55,
    right: 5,
    width: "100%",
    zIndex: 5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },

  // ─── BAR FRONT ───────────────────────────────
  barFrontContainer: {
    position: "absolute",
    bottom: "-5%",
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },
  barFront: {
    width: "100%",
    height: height * 0.78,
    zIndex: 2,
  },

  // ─── NAVBAR ──────────────────────────────────
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    zIndex: 20,
    elevation: 20,
  },

  // ─── PROFILE MODAL ───────────────────────────
  modalOverlay: {
    flex: 1,
    marginBottom: 220,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    height: "70%",
    borderWidth: 8,
    borderColor: "#460b2a",
    backgroundColor: "#592540",
    borderRadius: 16,
    padding: 20,
    alignItems: "flex-start",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  closeText: {
    color: "#fff",
    fontSize: 18,
  },
  modalImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 16,
    alignSelf: "center",
  },
  modalName: {
    color: "white",
    fontSize: 38,
    fontFamily: FontNames.MontserratBold,
  },
  modalLocation: {
    color: "white",
    fontSize: 20,
    marginVertical: 8,
    fontFamily: FontNames.MontserratRegular,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  modalDescription: {
    color: "#ffe3d0",
    fontSize: 16,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  modalChatButton: {
    marginTop: "20%",
    backgroundColor: "#592540",
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 15,
    borderColor: "#460b2a",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: "center",
    shadowColor: "#460b2a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 5,
  },
  modalChatButtonText: {
    color: "white",
    fontSize: 25,
    fontFamily: FontNames.MontserratRegular,
    fontWeight: "600",
  },
});

export { Bar2Screen };
