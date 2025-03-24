import React, { createContext, useState, useEffect } from "react";
import { Audio } from "expo-av";
import { usePathname } from "expo-router";

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
  const pathname = usePathname();
  // Consider both "/" and "/welcome" as routes where we should NOT play music.
  const shouldPlayMusic = !(pathname === "/welcome" || pathname === "/");

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(shouldPlayMusic);
  const [soundLoading, setSoundLoading] = useState(false);


  useEffect(() => {
    if (!shouldPlayMusic) return;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
  }, [shouldPlayMusic]);

  useEffect(() => {
    if (!shouldPlayMusic) return;
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
  }, [sound, isPlaying, shouldPlayMusic]);

  const toggleMusic = async () => {
    if (!shouldPlayMusic) return;
    if (soundLoading) return;
  
    try {
      // If sound doesn't exist, create & play it.
      if (!sound) {
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
  
      // Always unload and recreate the sound when turning music back on.
      if (isPlaying) {
        // If it's playing, pause and unload.
        await sound.pauseAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      } else {
        // When turning music on, recreate the sound instance.
        setSoundLoading(true);
        if (sound) {
          await sound.unloadAsync();
        }
        const { sound: newSound } = await Audio.Sound.createAsync(
          require("../assets/videos/music.mp3"),
          { shouldPlay: true, isLooping: true }
        );
        setSound(newSound);
        setIsPlaying(true);
        setSoundLoading(false);
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
