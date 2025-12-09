// SpeechBubblePop.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

type Anchor = { x: number; y: number }; // each in [0..1]

type Props = {
  source: ImageSourcePropType;
  anchor?: Anchor;
  visible: boolean;
  style?: StyleProp<ViewStyle>;
  popDurationMs?: number;
  overshootScale?: number;
  delayTime?: number;
  onShown?: () => void;
  onHidden?: () => void;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export default function SpeechBubblePop({
  source,
  anchor = { x: 0.5, y: 0.5 },
  visible,
  style,
  popDurationMs = 110,
  overshootScale = 1.08,
  delayTime = 1500,
  onShown,
  onHidden,
}: Props) {
  const [measured, setMeasured] = useState({ w: 0, h: 0 });
  const scale = useSharedValue(0);

  const ax = useMemo(() => clamp01(anchor.x), [anchor.x]);
  const ay = useMemo(() => clamp01(anchor.y), [anchor.y]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      if (w !== measured.w || h !== measured.h) {
        setMeasured({ w, h });
      }
    },
    [measured.w, measured.h]
  );

  useEffect(() => {
    if (visible) {
      scale.value = withDelay(
        delayTime,
        withSequence(
          withTiming(overshootScale, { duration: popDurationMs }),
          withSpring(
            1,
            {
              damping: 6,
              stiffness: 140,
              mass: 0.6,
              overshootClamping: false,
              restDisplacementThreshold: 0.001,
              restSpeedThreshold: 0.001,
            },
            (finished) => {
              "worklet";
              if (finished && onShown) runOnJS(onShown)();
            }
          )
        )
      );
    } else {
      scale.value = withTiming(0, { duration: 120 }, (finished) => {
        "worklet";
        if (finished && onHidden) runOnJS(onHidden)();
      });
    }
  }, [visible, overshootScale, popDurationMs, delayTime, onShown, onHidden]);

  const animatedStyle = useAnimatedStyle(() => {
    const w = measured.w || 0;
    const h = measured.h || 0;

    const tx = -ax * w;
    const ty = -ay * h;

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: scale.value },
        { translateX: -tx },
        { translateY: -ty },
      ],
      opacity: scale.value === 0 ? 0 : 1,
    };
  }, [measured.w, measured.h, ax, ay]);

  return (
    <View style={style} pointerEvents="none">
      <Animated.View
        onLayout={onLayout}
        style={[{ flex: 1 }, animatedStyle]} // ⬅️ this is the key
      >
        <Image
          source={source}
          style={{ width: "100%", height: "100%" }} // fill parent
          resizeMode="stretch"
        />
      </Animated.View>
    </View>
  );
}
