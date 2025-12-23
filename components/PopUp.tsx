import React from "react";
import { FontNames } from "../constants/fonts";
import { useFonts } from "expo-font";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import closeIcon from "../assets/images/x.png";

interface PopUpProps {
  visible: boolean;
  flag?: string;
  title?: string;
  titleStyle?: any;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function PopUp({
  visible,
  flag,
  title,
  titleStyle,
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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={closeIcon} style={styles.closeIcon} />
          </TouchableOpacity>

          {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}

          {children}
        </View>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    //backgroundColor: '"#6e1944"',
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: width * 0.9,
    // height: height * 0.75,
    minHeight: 140, // small popups don't look tiny
    maxHeight: height * 0.85, // long text / content won't go off screen
    backgroundColor: "#6e1944",
    borderRadius: 30,
    padding: 16,
    paddingTop: 30,
    borderColor: "#460b2a",
    borderWidth: 10,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  closeIcon: {
    width: 20,
    height: 20,
    tintColor: "#F5E1C4",
  },

  title: {
    fontSize: 46,
    fontFamily: FontNames.MontserratBold,
    alignSelf: "center",
    marginBottom: 12,
    color: "#e2a350",
  },
});
