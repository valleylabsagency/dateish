// components/InAppNotification.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface InAppNotificationProps {
  visible: boolean;
  message: string;
  senderName: string;
  partnerId: string;
  onDismiss: () => void;
}

export default function InAppNotification({
  visible,
  message,
  partnerId,
  senderName,
  onDismiss,
}: InAppNotificationProps) {
  const translateY = useRef(new Animated.Value(-150)).current;
  const router = useRouter();

  // Animate in/out whenever `visible` toggles
  useEffect(() => {
    if (visible) {
      // reset position then spring in
      translateY.setValue(-150);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      // slide back up
      Animated.timing(translateY, {
        toValue: -150,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  // Auto-dismiss after 3s
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible) {
      timer = setTimeout(onDismiss, 3000);
    }
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  // ALWAYS render the container so `translateY` can animate
  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        { transform: [{ translateY }] },
      ]}
    >
      {visible && (
        <TouchableOpacity
          onPress={() => {
            router.push(`/chat?partner=${partnerId}`);
            onDismiss();
          }}
        >
          <Text style={styles.notificationText}>
            {senderName}: {message}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 0,
    width,
    backgroundColor: '#460b2a',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    zIndex: 1000,
    elevation: 10,
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 16,
  },
});
