// app/lyd.tsx
import React, { useContext, useEffect, useRef } from "react";
import { View, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import LittleYellowDude from "../games/LYD/LittleYellowDude";
import { ProfileContext } from "@/contexts/ProfileContext";
import { submitLeaderboardEntry } from "@/services/highscores";

export default function LydScreen() {
  const router = useRouter();
  const { profile } = useContext(ProfileContext);

  // prevent double submit per run
  const submittedRef = useRef(false);

  // reset guard when screen mounts (new session)
  useEffect(() => {
    submittedRef.current = false;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <LittleYellowDude
        onFinish={async (seconds, formatted, result) => {
          if (result !== "win") return; // only count wins
          if (submittedRef.current) return;
          submittedRef.current = true;

          try {
            await submitLeaderboardEntry(
              "lyd",
              seconds,
              {
                name: profile?.name,
                photoUri: profile?.photoUri,
              },
              formatted
            );
          } catch (e) {
            console.error("Failed to submit LYD leaderboard entry:", e);
            // optional: set submittedRef.current = false; if you want to retry on failure
          }
        }}
      />

      {/* Back button overlay */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          zIndex: 9999,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 10,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.35)",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Back</Text>
      </Pressable>
    </View>
  );
}
