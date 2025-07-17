import React, { useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';

export default function EntranceAnimation() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const video = useRef<Video>(null);

  const onPlaybackStatusUpdate = status => {
    if (status.didJustFinish) {
      router.replace('/bar-2');
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        source={require('../assets/images/entrance-animation.mp4')}
        style={StyleSheet.absoluteFill}
        shouldPlay
        resizeMode="stretch"
        isLooping={false}
        onLoad={() => setReady(true)}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading:   { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
});
