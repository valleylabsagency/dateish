// InAppNotification.tsx
import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  PanResponder, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get("window");

interface InAppNotificationProps {
  visible: boolean;
  message: string;
  chatId: string;
  onDismiss: () => void;
}

export default function InAppNotification({
  visible,
  message,
  chatId,
  onDismiss,
}: InAppNotificationProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const router = useRouter();

  // When 'visible' changes, animate the notification.
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // PanResponder to allow swiping upward to dismiss.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy < -10, // trigger if swiping up
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          // Dismiss if swiped up enough.
          Animated.timing(translateY, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss());
        } else {
          // Otherwise, snap back.
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.notificationContainer, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity onPress={() => router.push(`/chat?chatId=${chatId}`)}>
        <Text style={styles.notificationText}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 0,
    width: width,
    backgroundColor: '#333',
    padding: 15,
    zIndex: 1000,
    elevation: 10,
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 16,
  },
});
