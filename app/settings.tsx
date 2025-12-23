// app/settings.tsx
import React, { useState, useContext, useEffect } from "react";
import {
  View,
  ImageBackground,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import PopUp from "../components/PopUp";
import ProfileNavbar from "../components/ProfileNavbar";
import { useRouter } from "expo-router";
import { scale, verticalScale } from "react-native-size-matters";
import { MusicContext } from "../contexts/MusicContext";
import { logout } from "../services/authservice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontNames } from "../constants/fonts";

// NEW: Firebase + email + auth helpers
import { auth, firestore } from "../firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore";
import * as MailComposer from "expo-mail-composer";

const { width, height } = Dimensions.get("window");

const ICONS = [
  {
    key: "contact-us",
    source: require("../assets/images/icons/contact-us.png"),
    position: { top: "26%", left: "50%" },
    wrapperSize: { width: 70, height: 70 },
    iconSize: { width: 150, height: 150 },
  },
  {
    key: "FAQ",
    source: require("../assets/images/icons/FAQ.png"),
    position: { top: "35%", right: "40%" },
    wrapperSize: { width: 60, height: 60 },
    iconSize: { width: 80, height: 80 },
  },
  {
    key: "my-account",
    source: require("../assets/images/icons/my-account.png"),
    position: { top: height * 0.19, left: "30%" },
    wrapperSize: { width: 80, height: 80 },
    iconSize: { width: 150, height: 150 },
  },
  {
    key: "privacy-policy",
    source: require("../assets/images/icons/privacy-policy.png"),
    position: { top: height * 0.4, right: "15%" },
    wrapperSize: { width: 65, height: 65 },
    iconSize: { width: 85, height: 85 },
  },
  {
    key: "terms-conditions",
    source: require("../assets/images/icons/terms-conditions.png"),
    position: { bottom: "48%", left: width * 0.2 },
    wrapperSize: { width: 75, height: 75 },
    iconSize: { width: 80, height: 80 },
  },
];

const TITLE_MAP: Record<string, string> = {
  "contact-us": "Contact Us",
  FAQ: "FAQ",
  "my-account": "My Account",
  "privacy-policy": "Privacy Policy",
  "terms-conditions": "Terms & Conditions",
};

// --- utils (VIP date helpers) ---
function addMonths(date: Date, m: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}
function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// --- link guard ---
const linkRx = /(https?:\/\/|www\.)\S+/gi;

export default function SettingsScreen() {
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupFlag, setPopupFlag] = useState<string | null>(null);
  const { isPlaying, toggleMusic } = useContext(MusicContext);
  const router = useRouter();

  // Account state
  const [isVip, setIsVip] = useState<boolean>(false);
  const [vipSince, setVipSince] = useState<Date | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedOpen, setBlockedOpen] = useState(false);

  // Contact Us + link guard
  const [contactMessage, setContactMessage] = useState("");
  const [noLinksVisible, setNoLinksVisible] = useState(false);
  const [sendingContact, setSendingContact] = useState(false);

  // Subscribe to my user doc for VIP + blocked list
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const userRef = doc(firestore, "users", uid);
    const unsub = onSnapshot(userRef, async (snap) => {
      const data: any = snap.data() || {};
      setIsVip(!!data.isVip);
      setVipSince(data.vipSince?.toDate?.() || null);

      // resolve blocked list into mini-cards
      const ids: string[] = Array.isArray(data.blocked) ? data.blocked : [];
      const arr: any[] = [];
      for (const id of ids) {
        try {
          const s = await getDoc(doc(firestore, "users", id));
          if (s.exists()) arr.push({ id: s.id, ...(s.data() as any) });
        } catch {}
      }
      setBlockedUsers(arr);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    if (isPlaying) toggleMusic();

    try {
      // 1) Sign out
      await logout();

      // 2) Clear any local auth/profile state
      await AsyncStorage.multiRemove([
        "userProfile",
        "bar2Started",
        "bar2ShowPrompt", // if you're using that key in Bar2
      ]);
    } catch (error) {
      console.error("Logout error:", error);
      // Optional: show an alert if you want
       Alert.alert("Error", "Could not log out. Please try again.");
    } finally {
      router.replace("/entrance");
    }
  };


  // --- Account actions ---
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete My Account",
      "Are you sure you want to permanently delete your account and remove all the data related to it? This action cannot be undone…",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              const u = auth.currentUser;
              if (!u) return;
              // remove user doc
              await deleteDoc(doc(firestore, "users", u.uid));
              // delete auth user (may require recent login)
              await u.delete();
              router.replace("/entrance");
            } catch (e: any) {
              console.error(e);
              if (e?.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Please re-login",
                  "For security reasons, please log in again before deleting your account."
                );
              } else {
                Alert.alert("Error", "Could not delete your account.");
              }
            }
          },
        },
      ]
    );
  };

  const handleCancelVip = () => {
    Alert.alert(
      "Cancel VIP Subscription",
      "Are you sure you want to be just a regular boring P?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              const uid = auth.currentUser?.uid;
              if (!uid) return;
              // Estimate next cycle from vipSince (+1 month)
              const next = fmt(addMonths(vipSince || new Date(), 1));
              await updateDoc(doc(firestore, "users", uid), { isVip: false });
              Alert.alert(
                "Subscription Cancelled",
                `You will not be charged on the next billing cycle. ${next}`
              );
            } catch (e) {
              console.error(e);
              Alert.alert("Error", "Could not cancel VIP right now.");
            }
          },
        },
      ]
    );
  };

  const handleBecomeVip = () => {
    // follow your Shop flow
    setPopupVisible(false);
    router.push("/mingles?open=shop");
  };

  const handleUnblock = async (uidToUnblock: string) => {
    const me = auth.currentUser?.uid;
    if (!me) return;
    try {
      await updateDoc(doc(firestore, "users", me), {
        blocked: arrayRemove(uidToUnblock),
      });
      setBlockedUsers((u) => u.filter((x) => x.id !== uidToUnblock));
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not unblock. Try again.");
    }
  };

  // --- Contact Us (with link guard) ---
  const onChangeContact = (t: string) => {
    if (linkRx.test(t)) {
      const cleaned = t.replace(linkRx, "").trim();
      setContactMessage(cleaned);
      setNoLinksVisible(true);
    } else {
      setContactMessage(t);
    }
  };

  const sendContactEmail = async () => {
    if (!contactMessage.trim()) return;
    try {
      setSendingContact(true);
      const can = await MailComposer.isAvailableAsync();
      const subject = "Dateish — Contact";
      const body = contactMessage.trim();
      if (can) {
        await MailComposer.composeAsync({
          recipients: ["dateish.office@gmail.com"],
          subject,
          body,
        });
      } else {
        const mailto = `mailto:dateish.office@gmail.com?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(body)}`;
        Linking.openURL(mailto);
      }
      setContactMessage("");
      setPopupVisible(false);
    } finally {
      setSendingContact(false);
    }
  };

  // --- render helpers ---
  const renderMyAccount = () => (
    <View>
      <TouchableOpacity style={styles.actionBtn} onPress={handleDeleteAccount}>
        <Text style={styles.actionBtnText}>Delete My Account</Text>
      </TouchableOpacity>

      {isVip ? (
        <TouchableOpacity style={styles.actionBtn} onPress={handleCancelVip}>
          <Text style={styles.actionBtnText}>Cancel VIP Subscription</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.actionBtn} onPress={handleBecomeVip}>
          <Text style={styles.actionBtnText}>Become a VIP</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.actionBtn, { marginTop: 12 }]}
        onPress={() => setBlockedOpen(true)}
      >
        <Text style={styles.actionBtnText}>Losers I Blocked</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBlockedPopup = () => (
    <PopUp
      visible={blockedOpen}
      title="Losers I Blocked"
      onClose={() => setBlockedOpen(false)}
    >
      <ScrollView style={{ maxHeight: height * 0.45 }}>
        {blockedUsers.length === 0 ? (
          <Text style={styles.emptyText}>You haven’t blocked anyone.</Text>
        ) : (
          blockedUsers.map((u) => (
            <View key={u.id} style={styles.blockedRow}>
              <Image
                source={{ uri: u.photoUri }}
                style={{ width: 54, height: 54, borderRadius: 27, marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.blockedText}>
                  {u.name}, {u.age}
                </Text>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(u.id)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </PopUp>
  );

  const renderContact = () => (
    <View>
      <Text style={styles.label}>Message</Text>
      <TextInput
        style={styles.input}
        value={contactMessage}
        onChangeText={onChangeContact}
        placeholder="Type your message…"
        placeholderTextColor="#AB83A1"
        multiline
      />
      <TouchableOpacity
        style={[styles.primaryBtn, sendingContact && { opacity: 0.6 }]}
        onPress={sendContactEmail}
        disabled={sendingContact || !contactMessage.trim()}
      >
        <Text style={styles.primaryBtnText}>{sendingContact ? "Sending…" : "Send Email"}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <ImageBackground
          source={require("../assets/images/settings-background.png")}
          style={styles.background}
          resizeMode="stretch"
          imageStyle={{ transform: [{ translateY: height * 0.03 }] }}
        >
          <ProfileNavbar onBack={() => router.back()} />
          {ICONS.map(({ key, source, position, wrapperSize, iconSize }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.iconWrapper,
                position,
                { width: wrapperSize.width, height: wrapperSize.height },
              ]}
              onPress={() => {
                setPopupFlag(key);
                setPopupVisible(true);
              }}
            >
              <Image
                source={source}
                style={{ width: iconSize.width, height: iconSize.height }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </ImageBackground>
      </View>

      {/* Main popup (dynamic content per icon) */}
      <PopUp
        visible={popupVisible}
        flag={popupFlag || undefined}
        title={popupFlag ? TITLE_MAP[popupFlag] : undefined}
        onClose={() => setPopupVisible(false)}
      >
        {popupFlag === "my-account" && renderMyAccount()}
        {popupFlag === "contact-us" && renderContact()}
        {popupFlag === "FAQ" && <Text style={styles.emptyText}>Coming soon.</Text>}
        {popupFlag === "privacy-policy" && <Text style={styles.emptyText}>Coming soon.</Text>}
        {popupFlag === "terms-conditions" && <Text style={styles.emptyText}>Coming soon.</Text>}
      </PopUp>

      {/* Blocked list popup */}
      {renderBlockedPopup()}

      {/* Mr. Mingles “No links allowed” popup */}
      <PopUp
        visible={noLinksVisible}
        title="Mr. Mingles"
        onClose={() => setNoLinksVisible(false)}
      >
        <Text style={styles.minglesWarn}>No links allowed here, take it outside!</Text>
      </PopUp>

      {/* Logout button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>LOG OUT</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: "100%", height: "100%" },
  iconWrapper: {
    position: "absolute",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Buttons / inputs inside popups
  actionBtn: {
    backgroundColor: "#6e1944",
    borderWidth: 3,
    borderColor: "#460b2a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#ffe3d0",
    fontSize: 18,
    fontFamily: FontNames.MontserratRegular,
    textTransform: "uppercase",
  },
  label: {
    color: "#E6B8C7",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  input: {
    width: "90%",
    minHeight: 120,
    borderColor: "#40122E",
    borderWidth: 4,
    borderRadius: 12,
    padding: 12,
    color: "#F5E1C4",
    backgroundColor: "#6E2A48",
    alignSelf: "center",
    textAlignVertical: "top",
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: "#6e1944",
    borderWidth: 3,
    borderColor: "#460b2a",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 18,
    alignSelf: "center",
  },
  primaryBtnText: {
    color: "#ffe3d0",
    fontSize: 18,
    fontFamily: FontNames.MontserratBold,
    textTransform: "uppercase",
  },
  emptyText: {
    color: "#F5E1C4",
    textAlign: "center",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 16,
  },

  // Blocked list rows
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#460b2a",
    borderRadius: 12,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  blockedText: {
    color: "#ffe3d0",
    fontSize: 16,
    fontFamily: FontNames.MontserratRegular,
  },
  unblockBtn: {
    backgroundColor: "#6e1944",
    borderWidth: 2,
    borderColor: "#460b2a",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  unblockText: {
    color: "#ffe3d0",
    fontSize: 14,
    fontFamily: FontNames.MontserratBold,
  },

  logoutContainer: {
    position: "absolute",
    bottom: verticalScale(60),
    width: "100%",
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#D9534F",
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(50),
    borderRadius: 30,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: scale(16),
    fontFamily: FontNames.MontserratBold,
  },

  minglesWarn: {
    color: "#ffe3d0",
    fontSize: 18,
    textAlign: "center",
    fontFamily: FontNames.MontserratRegular,
  },
});
