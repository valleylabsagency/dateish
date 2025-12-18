import React, { useRef, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import animationData from "../assets/videos/mm-dancing.json";

const withoutBg = {
  ...animationData,
  layers: animationData.layers.filter(
    (layer) => layer.ty !== 1 || layer.nm !== "Dark Blue Solid 1"
  ),
};

export default function EntranceAnimation() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const video = useRef<Video>(null);

  const goNext = () =>
    router.replace({
      pathname: "/bar-2",
      params: { cameFromEntrance: "true" },
    });

  const onPlaybackStatusUpdate = (status: any) => {
    // Defensive: only access props when loaded
    if (status?.isLoaded && status.didJustFinish) {
      goNext();
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        source={require("../assets/images/entrance-animation.mp4")}
        style={StyleSheet.absoluteFill}
        // ✅ Avoid stretch; use COVER for consistent aspect/decoder behavior
        resizeMode={ResizeMode.COVER}
        // ✅ Start only after load; start explicitly on Android
        shouldPlay={false}
        isLooping={false}
        onLoad={async () => {
          setReady(true);
          try {
            // Some Android devices won’t start with shouldPlay; start explicitly
            await video.current?.playAsync();
          } catch (e) {
            // If playback can’t start, don’t stall—move on
            goNext();
          }
        }}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        // ✅ If decode fails, don’t freeze; continue the flow
        onError={() => goNext()}
        // Optional: more frequent status updates
        progressUpdateIntervalMillis={250}
        useNativeControls={false}
      />

      {!ready && (
        <View style={styles.loading}>
          <LottieView
            source={withoutBg}
            autoPlay
            loop
            style={{ width: 600, height: 600, backgroundColor: "transparent" }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
});
