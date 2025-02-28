// OfflineNotice.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get("window");

export default function OfflineNotice() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>No Internet Connection</Text>
      <Text style={styles.message}>Please connect to the internet to continue using the app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Montserrat-Bold', // Ensure this font is loaded in your app
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Montserrat-Regular', // Ensure this font is loaded in your app
    textAlign: 'center',
  },
});
