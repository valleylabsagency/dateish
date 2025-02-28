import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Audio } from "expo-av";

interface ProfileNavbarProps {
  onBack: () => void;
}

export default function ProfileNavbar({ onBack }: ProfileNavbarProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        if (sound) {
          await sound.pauseAsync();
          setIsPlaying(false);
        }
      } else {
        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            require("../assets/videos/music.mp3"),
            { shouldPlay: true, isLooping: true }
          );
          setSound(newSound);
          setIsPlaying(true);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Audio playback error:", error);
    }
  };

  // Set the audio mode on mount.
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Unload the sound when the component unmounts.
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View style={profileNavbarStyles.navbar}>
      <TouchableOpacity onPress={onBack}>
        <Image
          source={require("../assets/images/icons/back-arrow.png")}
          style={profileNavbarStyles.navIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <View style={profileNavbarStyles.navSpacer} />
      <TouchableOpacity onPress={togglePlayback}>
        <Image
          source={require("../assets/images/icons/speaker-icon.png")}
          style={profileNavbarStyles.navIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const profileNavbarStyles = StyleSheet.create({
  navbar: {
    width: "100%",
    height: 120,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 30,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
  navSpacer: {
    flex: 1,
  },
});
