// app/entrance.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
} from "react-native";
import { Video } from "expo-av";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");
const MESSAGE = "Happy Hour daily! ";

export default function EntranceScreen() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  // scrolling banner animation
  const [textWidth, setTextWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // load custom arcade font
  const [fontsLoaded] = useFonts({
    ArcadePixel: require("../assets/fonts/ArcadePixel-Regular.otf"),
  });

  // make the marquee scroll forever
  useEffect(() => {
    if (!textWidth) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollX, {
          toValue: -textWidth,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scrollX, {
          toValue: width,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scrollX, textWidth]);


  if (!fontsLoaded) return null;

  // when sign pressed, play video then navigate
  if (showAnimation) {
    return (
      <Video
        source={require("../assets/images/entrance-animation.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={status => {
          if (status.didJustFinish) {
            router.replace("/bar-2");
          }
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* full-screen background */}
      <ImageBackground
        source={require("../assets/images/entrance.png")}
        style={styles.background}
      >
        {/* top “entrance sign” graphic */}
        <Image
          source={require("../assets/images/entrance-sign.png")}
          style={styles.entranceSign}
          resizeMode="contain"
        />

        {/* LED marquee */}
        <View style={styles.bannerContainer}>
        <ImageBackground
          source={require("../assets/images/led-banner.png")}
          style={styles.bannerBackground}
          resizeMode="stretch"
        >
          <View style={styles.bannerMask}>
  
          <Animated.View
            style={{ transform: [{ translateX: scrollX }] }}
        >
          <Text
            style={styles.bannerText}
            numberOfLines={1}
            onLayout={e => {
              const w = e.nativeEvent.layout.width;
              if (w !== textWidth) setTextWidth(w);
            }}
          >
            {/* pad a few spaces so "day!" isn’t jammed at the very end */}
            {MESSAGE.repeat(3) + "   "}
          </Text>
        </Animated.View>
      </View>
        </ImageBackground>
      </View>

        {/* door “open” / “closed” sign */}
        <TouchableOpacity
          onPress={() => setShowAnimation(true)}
          activeOpacity={0.8}
        >
          <Image
            source={
              isOpen
                ? require("../assets/images/open-sign.png")
                : require("../assets/images/closed-sign.png")
            }
            style={styles.doorSign}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
  },

  entranceSign: {
    position: "absolute",
    top: "-17%",
    width: width * .5,
    height: height * .5,
  },

  bannerContainer: {
    position: "absolute",
    top: height * 0.19,
    width: width * 0.8,
    height: height * 0.07,
  },
  bannerBackground: {
    flex: 1,
    justifyContent: "center",
  },
  bannerMask: {
    overflow: "hidden",
    width: "100%",
  },
  bannerText: {
    fontFamily: "ArcadePixel",
    fontSize: 32,
    color: "red",
    fontWeight: "bold",
  },

  doorSign: {
    position: "absolute",
    top: height * .435,
    width: width * 0.9,
    height: height * 0.20,
    alignSelf: "center"
  },
});
