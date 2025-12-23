// contexts/MusicContext.tsx
import React, {
  createContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Audio } from "expo-av";
import { usePathname } from "expo-router";

interface MusicContextValue {
  isPlaying: boolean;
  soundLoading: boolean;
  toggleMusic: () => void;

  // NEW
  beginEntranceTransition: () => void; // call when entrance animation starts
  setBar2Visible: (v: boolean) => void; // call from bar-2 when it becomes visible
}

export const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  soundLoading: false,
  toggleMusic: () => {},
  beginEntranceTransition: () => {},
  setBar2Visible: () => {},
});

const ENTRANCE_FADE_IN_MS = 6500;
const ENTRANCE_FADE_IN_STEPS = 26;

const ENTRANCE_FADE_OUT_MS = 5000;
const ENTRANCE_FADE_OUT_STEPS = 32;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Treat entrance + entranceAnimation as the "entrance flow"
  const isEntranceFlow =
    pathname === "/entrance" || pathname === "/entranceAnimation";
  const isHome = pathname === "/";

  const ENTRANCE_SOURCE = require("../assets/videos/outside sound fx.wav");
  const WELCOME_SOURCE = require("../assets/videos/music.mp3");

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentKeyRef = useRef<"entrance" | "welcome" | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [soundLoading, setSoundLoading] = useState(false);

  // Gate: block welcome music until bar-2 is visible
  const [bar2Visible, _setBar2Visible] = useState(false);

  // Ref gate so it survives quick route switches
  const blockWelcomeRef = useRef(false);

  // NEW: protect fade-out from being instantly paused by the core effect
  const fadingOutRef = useRef(false);

  // NEW: track current volume so fade-out starts from actual current volume
  const lastVolumeRef = useRef(1);

  const setBar2Visible = useCallback((v: boolean) => {
    _setBar2Visible(v);
    if (v) blockWelcomeRef.current = false; // allow welcome music now
  }, []);

  // audio mode once
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const fadeInEntrance = useCallback(
    async (sound: Audio.Sound, cancelled: () => boolean) => {
      const stepTime = ENTRANCE_FADE_IN_MS / ENTRANCE_FADE_IN_STEPS;
      for (let i = 1; i <= ENTRANCE_FADE_IN_STEPS; i++) {
        if (cancelled()) return;

        const vol = i / ENTRANCE_FADE_IN_STEPS;
        try {
          await sound.setVolumeAsync(vol);
          lastVolumeRef.current = vol;
        } catch {}

        await sleep(stepTime);
      }
    },
    []
  );

  const fadeOutEntrance = useCallback(async (sound: Audio.Sound) => {
    const stepTime = ENTRANCE_FADE_OUT_MS / ENTRANCE_FADE_OUT_STEPS;

    // Start from the current real volume (even if fade-in isn't finished yet)
    const start = Math.max(0, Math.min(1, lastVolumeRef.current ?? 1));

    for (let i = ENTRANCE_FADE_OUT_STEPS; i >= 0; i--) {
      const t = i / ENTRANCE_FADE_OUT_STEPS; // 1..0
      const vol = start * t; // start..0
      try {
        await sound.setVolumeAsync(vol);
        lastVolumeRef.current = vol;
      } catch {}
      await sleep(stepTime);
    }
  }, []);

  /**
   * Call this when the entrance animation starts.
   * It will:
   * 1) block welcome music immediately (survives route switch)
   * 2) fade out entrance ambience if it's currently loaded
   * 3) pause it AFTER fade finishes
   */
  const beginEntranceTransition = useCallback(() => {
    // prevent double trigger
    if (fadingOutRef.current) return;

    blockWelcomeRef.current = true;

    const sound = soundRef.current;
    if (!sound) return;

    if (currentKeyRef.current === "entrance") {
      fadingOutRef.current = true;

      // fire-and-forget fade
      (async () => {
        try {
          await fadeOutEntrance(sound);
        } catch {}
        try {
          await sound.pauseAsync();
        } catch {}
        fadingOutRef.current = false;
      })();
    }
  }, [fadeOutEntrance]);

  // Decide what SHOULD be playing now
  const desiredKey: "entrance" | "welcome" | null = (() => {
    if (isHome) return null;
    if (!isPlaying) return null;

    // During entrance flow, play entrance ambience.
    // If we're fading out, keep "entrance" so the core effect won't pause it mid-fade.
    if (isEntranceFlow) {
      if (fadingOutRef.current) return "entrance";
      if (blockWelcomeRef.current) return null; // after fade-out request, we want silence
      return "entrance";
    }

    // Any non-entrance route:
    // Do not allow welcome music until bar-2 says it's visible.
    if (blockWelcomeRef.current) return null;
    return bar2Visible ? "welcome" : null;
  })();

  // Core player: load/unload based on desiredKey
  useEffect(() => {
    let cancelledFlag = false;
    const cancelled = () => cancelledFlag;

    (async () => {
      // If nothing should play: pause current (don't unload) so toggle can resume
      if (desiredKey === null) {
        // IMPORTANT: don't pause here if fade-out is running; fade-out will pause when done
        if (fadingOutRef.current) return;

        if (soundRef.current) {
          try {
            await soundRef.current.pauseAsync();
          } catch {}
        }
        return;
      }

      // Already correct sound loaded
      if (soundRef.current && currentKeyRef.current === desiredKey) {
        try {
          await soundRef.current.playAsync();
        } catch {}
        return;
      }

      // Switching tracks: unload previous
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
        } catch {}
        try {
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
        currentKeyRef.current = null;
      }

      setSoundLoading(true);
      try {
        const source =
          desiredKey === "entrance" ? ENTRANCE_SOURCE : WELCOME_SOURCE;

        // Set initial volume for entrance based on last known volume.
        // If you returned to entrance after a fade-out, this avoids starting at 0 unexpectedly.
        const initialEntranceVol = Math.max(
          0,
          Math.min(1, lastVolumeRef.current ?? 1)
        );

        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
          isLooping: true,
          volume: desiredKey === "entrance" ? initialEntranceVol : 1,
        });

        if (cancelled()) {
          try {
            await sound.unloadAsync();
          } catch {}
          return;
        }

        soundRef.current = sound;
        currentKeyRef.current = desiredKey;

        // Fade-in only for entrance ambience (from current volume → 1)
        if (desiredKey === "entrance") {
          // If we came here after a fade-out (volume near 0), reset to 0 then fade up.
          try {
            await sound.setVolumeAsync(0);
            lastVolumeRef.current = 0;
          } catch {}
          fadeInEntrance(sound, cancelled);
        } else {
          lastVolumeRef.current = 1;
        }
      } catch (e) {
        console.error("Audio creation error:", e);
      } finally {
        if (!cancelled()) setSoundLoading(false);
      }
    })();

    return () => {
      cancelledFlag = true;
    };
  }, [desiredKey, fadeInEntrance]);

  // Toggle (pause/resume same position)
  const toggleMusic = useCallback(async () => {
    if (soundLoading) return;

    const sound = soundRef.current;

    if (!sound) {
      setIsPlaying((p) => !p);
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        // If welcome is blocked, don't resume anything
        if (blockWelcomeRef.current && currentKeyRef.current !== "entrance")
          return;
        await sound.playAsync();
      }
      setIsPlaying((p) => !p);
    } catch (e) {
      console.error("toggleMusic error:", e);
    }
  }, [isPlaying, soundLoading]);

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        soundLoading,
        toggleMusic,
        beginEntranceTransition,
        setBar2Visible,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}
