import React, { useContext } from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MusicContext } from "../contexts/MusicContext";

export default function MusicToggleButton() {
  const { isPlaying, toggleMusic, soundLoading } = useContext(MusicContext);

  return (
    <Pressable
      onPress={toggleMusic}
      disabled={soundLoading}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
    >
      <MaterialIcons
        name={isPlaying ? "volume-up" : "volume-off"}
        size={18}
        color="#fff"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
