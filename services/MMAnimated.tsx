import React, { useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
  Pressable,
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

// REAL asset aspect ratio: w753 h1270
const MINGLES_ASPECT = 1270 / 753;

// Size Mingles relative to screen width
const MINGLES_WIDTH = SCREEN_WIDTH * 0.85; // tweak 0.45–0.85 until it feels right
const MINGLES_HEIGHT = MINGLES_WIDTH * MINGLES_ASPECT;

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
  /** How far up from the bottom the inner group sits (percentage) */
  minglesOffsetY?: number;
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
  minglesOffsetY = 15,
}) => {
  const translateX = useSharedValue(SCREEN_WIDTH);
  const rotate = useSharedValue(0);
  const tapRotate = useSharedValue(0);
  const pivotOffsetY = -150;
  const DELAY = 300;

  const slideInMM = (onEnd?: () => void) => {
    console.log("SCREEN:", Dimensions.get("window"));
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
    const randomAngle = () => Math.floor(Math.random() * 6 + 1); // 1–6°
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

    if (onPress) {
      runOnJS(onPress)();
    }
  };

  useEffect(() => {
    if (enterOnMount) {
      slideInMM(onEnterComplete);
    } else {
      translateX.value = 0;
      rotate.value = 0;
      tapRotate.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // console.log("MMAnimated: image pressed");
    onImagePress();
  };

  // Just for sanity checks – logs 753x1270
  useEffect(() => {
    const src = Image.resolveAssetSource(
      require("../assets/images/mr-mingles.png")
    );
    // console.log("REAL MINGLES SIZE:", src.width, src.height);
  }, []);

  // Manual hit-test inside the big wrapper
  const handleTouch = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;

    // Define a smaller "active" rect inside the full 0..MINGLES_WIDTH / 0..MINGLES_HEIGHT
    const minX = MINGLES_WIDTH * 0.2;
    const maxX = MINGLES_WIDTH * 0.8;
    const minY = MINGLES_HEIGHT * 0.1;
    const maxY = MINGLES_HEIGHT * 0.7;

    // console.log("TOUCH:", { locationX, locationY, minX, maxX, minY, maxY });

    if (
      locationX >= minX &&
      locationX <= maxX &&
      locationY >= minY &&
      locationY <= maxY
    ) {
      handleImagePress();
    } else {
      // Tap was in the big box but outside your "cropped" region -> ignore
      // console.log("Tap ignored (outside cropped area)");
    }
  };

  const Inner = () => (
    <View style={[styles.inner, { bottom: `${minglesOffsetY}%` }]}>
      {/* Wrapper defines visual size & position of Mingles AND the coordinate system for hit-testing */}
      <Pressable
        activeOpacity={0.8}
        onPressIn={handleTouch}
        // DO NOT use onPress here – we control it manually via handleTouch
        style={styles.minglesWrapper}
        onLayout={(e) => {}}
      >
        <Animated.Image
          source={require("../assets/images/mr-mingles.png")}
          style={[styles.minglesImage, animatedStyle]}
          resizeMode="contain"
        />
      </Pressable>

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

  // ✅ Back to your original bg layout so he actually shows
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
    // bottom offset is applied via inline style
  },

  // Where Mingles is drawn (full visual size + the touch coordinate system)
  minglesWrapper: {
    width: MINGLES_WIDTH,
    height: MINGLES_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    // if you want to nudge him, do it here (not in hit-test math)
    bottom: "20%",
    left: "20%",
    // DEBUG:
    // backgroundColor: "rgba(255,0,0,0.1)",
  },

  // Image fills wrapper (this is his visual size)
  minglesImage: {
    width: "100%",
    height: "100%",
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
