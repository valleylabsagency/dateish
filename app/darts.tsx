import React, { useContext, useRef } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

import Darts from "../games/Darts/Darts";
import { submitHighscore } from "../services/highscores";
import { ProfileContext } from "../contexts/ProfileContext";

export default function DartsScreen() {
  const router = useRouter();
  const { profile } = useContext(ProfileContext);

  // 🔒 prevent double-submit if Darts fires twice
  const submittedRef = useRef(false);

  const handleFinalScore = async (score: number) => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    try {
      await submitHighscore("darts", score, {
        name: profile?.name,
        photoUri: profile?.photoUri,
      });
    } catch (e) {
      console.error("Failed to submit darts highscore:", e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {/* top-left back */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backTxt}>Back</Text>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Darts onFinalScore={handleFinalScore} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: {
    position: "absolute",
    zIndex: 9999,
    left: 12,
    top: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backTxt: {
    color: "#fff",
    fontWeight: "800",
  },
});
