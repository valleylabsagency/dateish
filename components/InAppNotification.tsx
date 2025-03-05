import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  PanResponder, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get("window");

interface InAppNotificationProps {
  visible: boolean;
  message: string;
  chatId: string;
  senderName: string;
  onDismiss: () => void;
}

export default function InAppNotification({
  visible,
  message,
  chatId,
  senderName,
  onDismiss,
}: InAppNotificationProps) {
  const translateY = useRef(new Animated.Value(-150)).current;
  const router = useRouter();

  // Auto dismiss notification after 3 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible) {
      timer = setTimeout(() => {
        onDismiss();
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  // Animate notification in/out when 'visible' changes.
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -150,
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
          Animated.timing(translateY, {
            toValue: -150,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss());
        } else {
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
      style={[
        styles.notificationContainer, 
        { transform: [{ translateY }], height: Platform.OS === 'ios' ? 100 : 70 }
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        onPress={() => {
          router.push(`/chat?chatId=${chatId}`);
          onDismiss();
        }}
      >
        <Text style={styles.notificationText}>
          {senderName}: {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 0,
    width: width,
    backgroundColor: '#460b2a',
    padding: 20,
    // Increase top padding for iOS to push the text lower so it's not hidden behind the camera view
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
