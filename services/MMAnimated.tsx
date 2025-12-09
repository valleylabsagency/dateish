import React, { useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type MMAnimatedProps = {
  showBackground?: boolean;
  showBarFront?: boolean;
  showControls?: boolean;
  style?: any;
  leaving?: boolean;
  onEnterComplete?: () => void;
  onLeaveComplete?: () => void;
  onPress?: () => void;
  enterOnMount?: boolean;
};

const MMAnimated: React.FC<MMAnimatedProps> = ({
  showBackground = true,
  showBarFront = false,
  showControls = true,
  leaving = false,
  onEnterComplete,
  onLeaveComplete,
  onPress,
  enterOnMount = true,
  style,
}) => {
  const translateX = useSharedValue(SCREEN_WIDTH);
  const rotate = useSharedValue(0);
  const tapRotate = useSharedValue(0);
  const pivotOffsetY = -150;
  const DELAY = 300;

  const slideInMM = (onEnd?: () => void) => {
    translateX.value = SCREEN_WIDTH;
    rotate.value = 30;
    tapRotate.value = 0;

    translateX.value = withDelay(
      DELAY,
      withSpring(0, { damping: 50, stiffness: 451 })
    );

    rotate.value = withDelay(
      DELAY,
      withSequence(
        withTiming(-10, { duration: 150 }),
        withTiming(-28, { duration: 220 }),
        withSpring(0, { damping: 20, stiffness: 600 }, (finished) => {
          if (finished && onEnd) {
            runOnJS(onEnd)();
          }
        })
      )
    );
  };

  const slideOutMM = (onEnd?: () => void) => {
    rotate.value = withTiming(-10, { duration: 150 });

    translateX.value = withTiming(
      SCREEN_WIDTH * 1.5,
      {
        duration: 600,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished && onEnd) {
          runOnJS(onEnd)();
        }
      }
    );

    rotate.value = withTiming(-10, { duration: 300 }, () => {
      rotate.value = withSpring(0, {
        damping: 8,
        stiffness: 110,
      });
    });

    tapRotate.value = 0;
  };

  const onImagePress = () => {
    const randomAngle = () => Math.floor(Math.random() * 6 + 1); // 5–11°
    const randomDuration = () => Math.floor(Math.random() * 80 + 60); // 60–140ms
    const wiggleSequence = [
      withTiming(-randomAngle(), { duration: randomDuration() }),
      withTiming(randomAngle(), { duration: randomDuration() }),
      withTiming(-randomAngle(), { duration: randomDuration() }),
      withTiming(randomAngle(), { duration: randomDuration() }),
      withTiming(-randomAngle(), { duration: randomDuration() }),
      withTiming(randomAngle(), { duration: randomDuration() }),
      withTiming(-randomAngle(), { duration: randomDuration() }),
      withTiming(randomAngle(), { duration: randomDuration() }),
      withTiming(-randomAngle(), { duration: randomDuration() }),
      withTiming(0, { duration: 80 }),
    ];
    tapRotate.value = withSequence(...wiggleSequence);
  };

  useEffect(() => {
    if (enterOnMount) {
      slideInMM(onEnterComplete);
    } else {
      translateX.value = 0;
      rotate.value = 0;
      tapRotate.value = 0;
    }
  }, [enterOnMount, onEnterComplete]);

  useEffect(() => {
    if (leaving) {
      slideOutMM(onLeaveComplete);
    }
  }, [leaving, onLeaveComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: -pivotOffsetY },
      { rotate: `${rotate.value + tapRotate.value}deg` },
      { translateY: pivotOffsetY },
    ],
  }));

  const handleImagePress = () => {
    console.log("MMAnimated: image pressed"); // 🔴 should see this
    onImagePress();
    if (onPress) onPress();
  };

  const Inner = () => (
    <View style={styles.inner}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleImagePress}
        hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }} // bigger tap area
      >
        <Animated.Image
          source={require("../assets/images/mr-mingles.png")}
          style={[styles.mingles, animatedStyle]}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {showBarFront && (
        <Image
          source={require("../assets/images/bar-front.png")}
          resizeMode="stretch"
          style={styles.barFront}
          pointerEvents="none"
        />
      )}
    </View>
  );

  return showBackground ? (
    <ImageBackground
      source={require("../assets/images/bar-back.png")}
      resizeMode="contain"
      style={[styles.bg, style]}
    >
      <Inner />
    </ImageBackground>
  ) : (
    <View style={[styles.bg, style]}>
      <Inner />
    </View>
  );
};

const styles = StyleSheet.create({
  bg: {
    width: "100%",
    aspectRatio: 1125 / 2436,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  inner: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  mingles: {
    width: 400,
    height: 500,
    marginBottom: "50%",
    marginLeft: 100,
    zIndex: 8,
  },
  barFront: {
    position: "absolute",
    bottom: "-5%",
    width: "100%",
    height: 830,
  },
});

export default MMAnimated;
