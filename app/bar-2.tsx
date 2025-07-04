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
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import { firestore, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getDatabase, ref, onValue } from "firebase/database";
import { useRouter } from 'expo-router';

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

  // 1. fetch all other users
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

  // 2. subscribe to realtime online status
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

  // derive only the online ones
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

  return (
    <ImageBackground
      source={require("../assets/images/bar-back.png")}
      style={styles.background}
    >
      {/* ─── ONLINE USER ROW ────────────────────────── */}
      {onlineProfiles.length > 0 && (
        <View style={styles.onlineRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              alignItems: "center"
            }}
          >
            {onlineProfiles.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.avatarCircle}
                onPress={() => {
                  setSelectedProfile(p);
                  setModalVisible(true);
                }}
              >
                <Image
                  source={{ uri: p.photoUri }}
                  style={styles.avatarImage}
                />
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
                  router.push(`/inbox?partner=${selectedProfile.id}`);
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
  onlineRow: {
    position: "absolute",
    top: "62%",
    width: "100%",
    zIndex: 100,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,         
    overflow: "hidden",
    marginHorizontal: "17%",    
    borderWidth: 2,
    borderColor: "white",
   },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  barFrontContainer: {
    position: "absolute",
    bottom: "-5%",
    width: "100%",
    alignItems: "center",
  },
  barFront: {
    width: "100%",
    height: 730,
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

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
  modalText: {
   width: "100%",
   alignItems: "flex-start",
   paddingHorizontal: 20
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
    alignSelf: "center"
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
    alignSelf: "flex-start"
  },
  modalDescription: {
    color: "#ffe3d0",
    fontSize: 16,
    textAlign: "left",
    alignSelf: "flex-start"
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
