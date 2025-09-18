// app/lyd.tsx
import React from "react";
import { View, Pressable, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import LittleYellowDude from "../games/LYD/LittleYellowDude";

export default function LydScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <LittleYellowDude
        onFinish={(seconds, formatted, result) => {
          // optional: show summary and return to games list
          Alert.alert(
            result === "win" ? "You got married! 🎉" : "Game over 💀",
            `Time: ${formatted}`,
            [{ text: "OK", onPress: () => router.back() }]
          );
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
