// SpeechBubblePop.tsx
import React, { useEffect, ReactNode, useRef } from "react";
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
  cancelAnimation,
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

  /** Animate the POP-IN once on mount if visible is true. */
  animateOnMount?: boolean;
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
  animateOnMount = true,
}) => {
  const scale = useSharedValue(visible ? 1 : 0);
  const opacity = useSharedValue(visible ? 1 : 0);

  const prevVisible = useRef<boolean>(visible);
  const didMount = useRef(false);

  const popIn = () => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

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
  };

  const popOut = () => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

    scale.value = withTiming(0.8, { duration: 120 }, (finished) => {
      if (finished && onHidden) runOnJS(onHidden)();
    });
    opacity.value = withTiming(0, { duration: 120 });
  };

  useEffect(() => {
    // ✅ First mount behavior:
    // If visible=true and animateOnMount=true, run pop-in once.
    if (!didMount.current) {
      didMount.current = true;

      prevVisible.current = visible;

      if (visible && animateOnMount) {
        popIn();
      } else {
        // No animation: just set correct static state
        scale.value = visible ? 1 : 0;
        opacity.value = visible ? 1 : 0;
      }
      return;
    }

    // ✅ After mount: animate ONLY when `visible` actually changes
    const wasVisible = prevVisible.current;
    prevVisible.current = visible;

    if (wasVisible === visible) return; // text/children changes won't retrigger

    if (visible) popIn();
    else popOut();
  }, [visible, delayTime, onHidden, animateOnMount]);

  const animatedStyle = useAnimatedStyle(() => {
    const ax = anchor.x ?? 0.5;
    const ay = anchor.y ?? 1;

    const s = scale.value;

    const tx = (0.5 - ax) * width * (1 - s);
    const ty = (0.5 - ay) * height * (1 - s);

    return {
      opacity: opacity.value,
      transform: [{ translateX: tx }, { translateY: ty }, { scale: s }],
    };
  }, [width, height, anchor.x, anchor.y]);

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
