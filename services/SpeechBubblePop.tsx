// SpeechBubblePop.tsx
import React, { useEffect, ReactNode } from "react";
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

type Anchor = { x: number; y: number }; // each in [0..1]

type Props = {
  source: ImageSourcePropType;

  /** Explicit width/height in px (we'll always pass them from parent). */
  width: number;
  height: number;

  /** Where the bubble grows from, normalized (0..1). Default bottom center. */
  anchor?: Anchor;

  /** Show/hide the bubble (with animation). */
  visible: boolean;

  /** Extra wrapper style (positioning, margins, etc.). */
  style?: StyleProp<ViewStyle>;

  /** Delay before popping IN (ms). */
  delayTime?: number;

  /** Called after the HIDE animation finishes. */
  onHidden?: () => void;

  /** Optional content rendered on top of the bubble image. */
  children?: ReactNode;
};

const SpeechBubblePop: React.FC<Props> = ({
  source,
  width,
  height,
  anchor = { x: 0.5, y: 1 }, // bottom-center
  visible,
  style,
  delayTime = 0,
  onHidden,
  children,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // POP IN
      scale.value = 0.2;
      opacity.value = 0;

      scale.value = withDelay(
        delayTime,
        withSequence(
          withTiming(1.1, { duration: 130 }),
          withTiming(0.9, { duration: 90 }),
          withTiming(1, { duration: 80 })
        )
      );

      opacity.value = withDelay(delayTime, withTiming(1, { duration: 120 }));
    } else {
      // POP OUT
      scale.value = withTiming(0.8, { duration: 120 }, (finished) => {
        if (finished && onHidden) {
          runOnJS(onHidden)();
        }
      });
      opacity.value = withTiming(0, { duration: 120 });
    }
  }, [visible, delayTime, onHidden, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const ax = anchor.x ?? 0.5;
    const ay = anchor.y ?? 1;

    const sx = scale.value;
    const sy = scale.value;

    const tx = (0.5 - ax) * width * (1 - sx);
    const ty = (0.5 - ay) * height * (1 - sy);

    return {
      opacity: opacity.value,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View style={[{ width, height }, animatedStyle, style]}>
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        resizeMode="stretch"
      />

      {children && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          {children}
        </View>
      )}
    </Animated.View>
  );
};

export default SpeechBubblePop;
