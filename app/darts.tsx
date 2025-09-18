import React from "react";
import { View, SafeAreaView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Darts from "../games/Darts/Darts";

export default function DartsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {/* top-left back */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backTxt}>Back</Text>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Darts
          onFinalScore={(score) => {
            // optional: reward / record score here
            // e.g., console.log("Final darts score:", score);
          }}
        />
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
  backTxt: { color: "#fff", fontWeight: "800" },
});
