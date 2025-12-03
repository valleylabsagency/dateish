import { useEffect, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export const useNeonFlicker = () => {
  const intensity = useSharedValue(1); // opacity/intensity

  // const opacity = useSharedValue(1);
  // const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intensity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),

        // --- NEON BURST (fast, sporadic, chaotic) ---
        withTiming(1, { duration: 40 }),
        withTiming(0.4, { duration: 60 }),
        withTiming(0.7, { duration: 30 }),
        withTiming(0.3, { duration: 80 }),
        withTiming(0.5, { duration: 45 }),
        withTiming(0.2, { duration: 50 }),
        withTiming(1, { duration: 35 }),
        withTiming(0.3, { duration: 40 }),
        withTiming(0.4, { duration: 60 }),
        withTiming(0.8, { duration: 30 }),
        withTiming(0.2, { duration: 80 }),
        withTiming(0.6, { duration: 45 }),
        withTiming(0.4, { duration: 50 }),
        withTiming(1, { duration: 35 }),

        // --- CALM PERIOD (~3 seconds) ---
        withTiming(1, { duration: 4500 })
      ),
      -1,
      false // no reverse; bursts shouldn’t play backwards
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: intensity.value,
    // optional glow flicker via scale
    transform: [{ scale: 0.98 + 0.02 * intensity.value }],
  }));

  return style;
};
