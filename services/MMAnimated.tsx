import React, { useEffect } from "react";
import { View, TouchableOpacity, ImageBackground, Image, StyleSheet, Button, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  runOnJS
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
  enterOnMount?: boolean;
};

const MMAnimated: React.FC<MMAnimatedProps> = ({
  showBackground = true,
  showBarFront = false,
  showControls = true,
  leaving = false,
  onEnterComplete,
  onLeaveComplete,
  enterOnMount = true,
  style,
}) => {
  const translateX = useSharedValue(SCREEN_WIDTH);
  const rotate = useSharedValue(0);
  const tapRotate = useSharedValue(0);
  const pivotOffsetY = -150; // rotate around chest-ish

  const slideInMM = (onEnd?: () => void) => {
    translateX.value = SCREEN_WIDTH;
    rotate.value = 0;
    tapRotate.value = 0;

    rotate.value = withTiming(-10, { duration: 800 });
    translateX.value = withSpring(0, { damping: 35, stiffness: 451 });

    // final rotate spring → call onEnd
    rotate.value = withTiming(-30, { duration: 300 }, () => {
      rotate.value = withSpring(
        0,
        { damping: 20, stiffness: 409 },
        (finished) => {
          if (finished && onEnd) runOnJS(onEnd)();
        }
      );
    });
  };

  useEffect(() => {
    if (enterOnMount) {
      slideInMM(onEnterComplete);  
    } else {
      translateX.value = 0;  // show immediately, no animation
      rotate.value = 0;
      tapRotate.value = 0;
    }
  }, []);

  const slideOutMM = (onEnd?: () => void) => {
    rotate.value = withTiming(-10, { duration: 150 });

    translateX.value = withTiming(SCREEN_WIDTH * 1.5, {
      duration: 600,
      easing: Easing.in(Easing.cubic),
    },
    (finished) => {
      if (finished && onEnd) {
        runOnJS(onEnd)();
      }
    });

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
    slideInMM();
  }, []);

  useEffect(() => {
    if (leaving) {
      slideOutMM(onLeaveComplete);
    }
  }, [leaving])

  useEffect(() => {
    if (enterOnMount) {
      slideInMM();
    } else {
      // start already visible with no animation
      translateX.value = 0;
      rotate.value = 0;
      tapRotate.value = 0;
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: -pivotOffsetY },
      { rotate: `${rotate.value + tapRotate.value}deg` },
      { translateY: pivotOffsetY },
    ],
  }));

  const Inner = () => (
    <View style={styles.inner}>
      <TouchableOpacity activeOpacity={0.8} onPress={onImagePress}>
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

  // When showBackground is true, draw the bar as the component background
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
  // This view sizes the scene. Default keeps the same aspect as your bar image.
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
    zIndex: 8
  },
  barFront: {
    position: "absolute",
    bottom: "-5%",
    width: "100%",
    height: 830,
  },
  controls: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
});

export default MMAnimated;
