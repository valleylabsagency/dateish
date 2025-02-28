import React, { createContext, useState, useEffect } from "react";
import { Audio } from "expo-av";

interface MusicContextValue {
  isPlaying: boolean;
  soundLoading: boolean;
  toggleMusic: () => Promise<void>;
}

export const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  soundLoading: false,
  toggleMusic: async () => {},
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundLoading, setSoundLoading] = useState(true);

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

  useEffect(() => {
    (async () => {
      if (!sound && isPlaying) {
        setSoundLoading(true);
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(
            require("../assets/videos/music.mp3"),
            { shouldPlay: true, isLooping: true }
          );
          setSound(newSound);
        } catch (err) {
          console.error("Audio creation error:", err);
        } finally {
          setSoundLoading(false);
        }
      }
    })();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound, isPlaying]);

  const toggleMusic = async () => {
    if (soundLoading) return;

    try {
      if (!sound) {
        // If there's no sound yet, create & play
        setSoundLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          require("../assets/videos/music.mp3"),
          { shouldPlay: true, isLooping: true }
        );
        setSound(newSound);
        setIsPlaying(true);
        setSoundLoading(false);
        return;
      }

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        // forcibly reload
        setSoundLoading(true);
        await sound.unloadAsync();
        const { sound: newSound } = await Audio.Sound.createAsync(
          require("../assets/videos/music.mp3"),
          { shouldPlay: !isPlaying, isLooping: true }
        );
        setSound(newSound);
        setIsPlaying(!isPlaying);
        setSoundLoading(false);
        return;
      }

      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  return (
    <MusicContext.Provider value={{ isPlaying, soundLoading, toggleMusic }}>
      {children}
    </MusicContext.Provider>
  );
}
