import React, { createContext, useState, useEffect } from "react";
import { Audio } from "expo-av";
import { usePathname } from "expo-router";

interface MusicContextValue {
  isPlaying: boolean;
  soundLoading: boolean;
  toggleMusic: () => void;
}

export const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  soundLoading: false,
  toggleMusic: () => {},
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Consider both "/" and "/welcome" as routes where we should NOT play music.
  const shouldPlayMusic = !(pathname === "/welcome" || pathname === "/");

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(shouldPlayMusic);
  const [soundLoading, setSoundLoading] = useState(false);

  // Set the audio mode if we intend to play music.
  useEffect(() => {
    if (shouldPlayMusic) {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
    }
  }, [shouldPlayMusic]);

  // Single effect to manage sound creation and unloading based on isPlaying.
  useEffect(() => {
    if (!shouldPlayMusic) return;

    (async () => {
      if (isPlaying && !sound) {
        // Create and start playing the sound.
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
      } else if (!isPlaying && sound) {
        // Pause and unload sound when turning off.
        try {
          await sound.pauseAsync();
          await sound.unloadAsync();
        } catch (err) {
          console.error("Audio unload error:", err);
        } finally {
          setSound(null);
        }
      }
    })();
  }, [isPlaying, shouldPlayMusic]);

  useEffect(() => {
    if (!shouldPlayMusic && sound) {
      (async () => {
        try {
          await sound.pauseAsync();
          await sound.unloadAsync();
        } catch (err) {
          console.error("Audio unload error on route change:", err);
        } finally {
          setSound(null);
          setIsPlaying(false);
        }
      })();
    }
  }, [shouldPlayMusic, sound]);

  // The toggle function simply flips the isPlaying state.
  const toggleMusic = () => {
    if (!shouldPlayMusic || soundLoading) return;
    setIsPlaying((prev) => !prev);
  };

  return (
    <MusicContext.Provider value={{ isPlaying, soundLoading, toggleMusic }}>
      {children}
    </MusicContext.Provider>
  );
}
