// app/games.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFonts } from "expo-font";
import { FontNames } from "../constants/fonts";
import BottomNavbar from "../components/BottomNavbar";
import PopUp from "../components/PopUp";
import { useRouter } from "expo-router";

import { getTopLeaderboard, LeaderboardRow } from "../services/highscores";

const { width, height } = Dimensions.get("window");

export default function GamesScreen() {
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
  });

  const router = useRouter();

  const [showPopupDarts, setShowPopupDarts] = useState(false);
  const [showPopupArcade, setShowPopupArcade] = useState(false);
  const [paying, setPaying] = useState<"darts" | "arcade" | null>(null);

  // Darts Top-3
  const [dartsTop3, setDartsTop3] = useState<LeaderboardRow[]>([]);
  const [dartsTop3Loading, setDartsTop3Loading] = useState(false);

  // LYD Top-3
  const [lydTop3, setLydTop3] = useState<LeaderboardRow[]>([]);
  const [lydTop3Loading, setLydTop3Loading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!showPopupDarts) return;
      setDartsTop3Loading(true);
      try {
        const rows = await getTopLeaderboard("darts", 3);
        if (alive) setDartsTop3(rows);
      } catch (e) {
        console.error("Failed to load darts leaderboard:", e);
        if (alive) setDartsTop3([]);
      } finally {
        if (alive) setDartsTop3Loading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [showPopupDarts]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!showPopupArcade) return;
      setLydTop3Loading(true);
      try {
        const rows = await getTopLeaderboard("lyd", 3);
        if (alive) setLydTop3(rows);
      } catch (e) {
        console.error("Failed to load LYD leaderboard:", e);
        if (alive) setLydTop3([]);
      } finally {
        if (alive) setLydTop3Loading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [showPopupArcade]);

  if (!fontsLoaded) return null;

  const handlePlay = async (which: "darts" | "arcade") => {
    if (paying) return;
    setPaying(which);
    try {
      if (which === "darts") setShowPopupDarts(false);
      if (which === "arcade") setShowPopupArcade(false);

      router.push(which === "darts" ? "/darts" : "/lyd");
    } catch (e: any) {
      if (
        e?.code === "functions/failed-precondition" ||
        /Insufficient moneys/i.test(e?.message)
      ) {
        Alert.alert(
          "Out of moneys",
          "You don’t have enough moneys to play. Visit the shop to top up."
        );
      } else {
        Alert.alert("Error", "Could not start the game. Please try again.");
        console.error("Play failed:", e);
      }
    } finally {
      setPaying(null);
    }
  };

  const Avatar = ({
    name,
    photoUri,
  }: {
    name: string;
    photoUri?: string | null;
  }) => {
    if (photoUri)
      return <Image source={{ uri: photoUri }} style={styles.leaderAvatar} />;

    return (
      <View style={[styles.leaderAvatar, styles.leaderAvatarFallback]}>
        <Text style={styles.leaderAvatarFallbackText}>
          {(name?.[0] || "P").toUpperCase()}
        </Text>
      </View>
    );
  };

  const formatTime = (row: LeaderboardRow) => {
    if (row.timeText) return row.timeText;
    if (typeof row.seconds === "number") return `${row.seconds.toFixed(2)}s`;
    return "-";
  };

  return (
    <>
      <ImageBackground
        source={require("../assets/images/games-full.png")}
        style={styles.background}
      >
        {/* Darts hotspot */}
        <TouchableOpacity
          style={styles.overlayTouchableDarts}
          onPress={() => setShowPopupDarts(true)}
          activeOpacity={0.6}
        />

        {/* Arcade hotspot */}
        <TouchableOpacity
          style={styles.overlayTouchableArcade}
          onPress={() => setShowPopupArcade(true)}
          activeOpacity={0.6}
        />

        {/* Bottom Navbar */}
        <View style={styles.bottomNavbarContainer}>
          <BottomNavbar selectedTab="Games" />
        </View>
      </ImageBackground>

      {/* Darts Popup */}
      <PopUp
        visible={showPopupDarts}
        title="Darts"
        onClose={() => setShowPopupDarts(false)}
      >
        <View style={styles.popupBody}>
          <Text style={styles.popupLine}>Throw them darts! 🎯</Text>

          <TouchableOpacity
            style={[styles.playButton, paying === "darts" && { opacity: 0.6 }]}
            disabled={paying === "darts"}
            onPress={() => handlePlay("darts")}
          >
            <Text style={styles.playButtonText}>
              {paying === "darts" ? "Starting…" : "Play"}
            </Text>
          </TouchableOpacity>
          <View style={styles.leaderboardBox}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>

            {dartsTop3Loading ? (
              <View style={styles.leaderboardLoading}>
                <ActivityIndicator />
                <Text style={styles.leaderboardLoadingText}>Loading…</Text>
              </View>
            ) : dartsTop3.length === 0 ? (
              <Text style={styles.leaderboardEmpty}>No scores yet.</Text>
            ) : (
              dartsTop3.map((row, idx) => (
                <View key={row.uid} style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>{idx + 1}</Text>
                  <Avatar name={row.name} photoUri={row.photoUri} />
                  <Text numberOfLines={1} style={styles.leaderName}>
                    {row.name}
                  </Text>
                  <Text style={styles.leaderScore}>{row.score ?? "-"}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </PopUp>

      {/* Arcade Popup (LYD) */}
      <PopUp
        visible={showPopupArcade}
        title={"Little Yellow\nDude"}
        titleStyle={{ fontSize: 32, textAlign: "center", lineHeight: 26 }}
        onClose={() => setShowPopupArcade(false)}
      >
        <View style={styles.popupBody}>
          <Text style={styles.popupLine}>Get married! Quick! 🕹️</Text>

          <TouchableOpacity
            style={[styles.playButton, paying === "arcade" && { opacity: 0.6 }]}
            disabled={paying === "arcade"}
            onPress={() => handlePlay("arcade")}
          >
            <Text style={styles.playButtonText}>
              {paying === "arcade" ? "Starting…" : "Play"}
            </Text>
          </TouchableOpacity>
          <View style={styles.leaderboardBox}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>

            {lydTop3Loading ? (
              <View style={styles.leaderboardLoading}>
                <ActivityIndicator />
                <Text style={styles.leaderboardLoadingText}>Loading…</Text>
              </View>
            ) : lydTop3.length === 0 ? (
              <Text style={styles.leaderboardEmpty}>No times yet.</Text>
            ) : (
              lydTop3.map((row, idx) => (
                <View key={row.uid} style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>{idx + 1}</Text>
                  <Avatar name={row.name} photoUri={row.photoUri} />
                  <Text numberOfLines={1} style={styles.leaderName}>
                    {row.name}
                  </Text>
                  <Text style={styles.leaderScore}>{formatTime(row)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </PopUp>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomNavbarContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  overlayTouchableArcade: {
    position: "absolute",
    bottom: height * 0.15,
    left: width * 0.05,
    width: 200,
    height: 400,
  },
  overlayTouchableDarts: {
    position: "absolute",
    bottom: height * 0.4,
    right: width * 0,
    width: 150,
    height: 240,
  },

  popupBody: {
    alignItems: "center",
    paddingTop: 8,
  },
  popupLine: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },

  leaderboardBox: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 2,
    borderColor: "#460b2a",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    marginTop: 14,
  },
  leaderboardTitle: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  leaderboardLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 8,
  },
  leaderboardLoadingText: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
  },
  leaderboardEmpty: {
    color: "#d8bfd8",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 6,
  },

  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  leaderRank: {
    width: 18,
    textAlign: "center",
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
    marginRight: 10,
  },
  leaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ffe3d0",
  },
  leaderAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,227,208,0.12)",
    borderWidth: 1,
    borderColor: "#ffe3d0",
  },
  leaderAvatarFallbackText: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
  },
  leaderName: {
    flex: 1,
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
    marginRight: 10,
  },
  leaderScore: {
    width: 90,
    textAlign: "right",
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 14,
    fontWeight: "bold",
  },

  playButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 10,
    borderColor: "#460b2a",
    paddingVertical: 8,
    paddingHorizontal: 26,
    borderRadius: 24,
  },
  playButtonText: {
    color: "#ffe3d0",
    fontFamily: FontNames.MontserratRegular,
    fontSize: 20,
    textTransform: "uppercase",
  },
});
