// contexts/MusicContext.tsx
import React, { createContext, useEffect, useRef, useState } from "react";
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

const FADE_IN_DURATION_MS = 5000;
const FADE_STEPS = 25;

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const shouldPlayMusic = !(pathname === "/" || pathname === "/welcome");
  const isEntrance = pathname === "/entrance";

  const MUSIC_SOURCE = isEntrance
    ? require("../assets/videos/outside sound fx.wav")
    : require("../assets/videos/music.mp3");

  const soundRef = useRef<Audio.Sound | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [soundLoading, setSoundLoading] = useState(false);

  // Set audio mode once
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Main sound lifecycle
  useEffect(() => {
    let cancelled = false;

    const fadeIn = async (sound: Audio.Sound) => {
      const stepTime = FADE_IN_DURATION_MS / FADE_STEPS;

      for (let i = 1; i <= FADE_STEPS; i++) {
        if (cancelled) return;
        const vol = i / FADE_STEPS;
        try {
          await sound.setVolumeAsync(vol);
        } catch {}
        await new Promise((r) => setTimeout(r, stepTime));
      }
    };

    (async () => {
      if (!shouldPlayMusic) {
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch {}
          soundRef.current = null;
        }
        return;
      }

      // Always unload when switching route / source
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      if (!isPlaying) return;

      setSoundLoading(true);
      try {
        const { sound } = await Audio.Sound.createAsync(MUSIC_SOURCE, {
          shouldPlay: true,
          isLooping: true,
          volume: isEntrance ? 0 : 1, // 👈 key line
        });

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;

        // 👇 Fade in ONLY for outside ambience
        if (isEntrance) {
          fadeIn(sound);
        }
      } catch (err) {
        console.error("Audio creation error:", err);
      } finally {
        if (!cancelled) setSoundLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldPlayMusic, isPlaying, MUSIC_SOURCE, isEntrance]);

  // Toggle
  const toggleMusic = () => {
    if (!shouldPlayMusic || soundLoading) return;
    setIsPlaying((p) => !p);
  };

  return (
    <MusicContext.Provider value={{ isPlaying, soundLoading, toggleMusic }}>
      {children}
    </MusicContext.Provider>
  );
}
