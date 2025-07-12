import React from 'react';
import { FontNames } from "../constants/fonts";
import { useFonts } from "expo-font";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions
} from 'react-native';

interface PopUpProps {
  visible: boolean;
  flag?: string;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function PopUp({
  visible,
  flag,
  title,
  onClose,
  children,
}: PopUpProps) {
    const [fontsLoaded] = useFonts({
        [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
      });
      if (!fontsLoaded) return null;
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>

          {title && <Text style={styles.title}>{title}</Text>}

          {children}
        </View>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    //backgroundColor: '"#6e1944"',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    height: height * 0.75,
    backgroundColor: '#6e1944',
    borderRadius: 30,
    padding: 16,
    paddingTop: 30,
    borderColor: "#460b2a",
    borderWidth: 10
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 12,
    zIndex: 10,
  },
  closeText: {
    fontSize: 42,
    color: '#ffe3d0',
  },
  title: {
    fontSize: 46,
    fontFamily: FontNames.MontserratBold,
    alignSelf: 'center',
    marginBottom: 12,
    color: "#e2a350"
  },
});
