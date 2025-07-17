import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  Animated
} from "react-native";
import { MusicContext } from "../contexts/MusicContext";
import PopUp from "../components/PopUp";

interface ProfileNavbarProps {
  onBack: () => void;
}

export default function ProfileNavbar({ onBack }: ProfileNavbarProps) {
  // Access the music context so we can toggle music or show loading
  const { isPlaying, soundLoading, toggleMusic } = useContext(MusicContext);

  // We'll animate the speaker-lines bigger/smaller for 5s whenever music toggles on
  // but we do NOT hide them in between loops. Instead we let them remain at the last scale value
  const linesAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // We track whether lines are actually visible on screen at all
  const [linesVisible, setLinesVisible] = useState(false);
   const [showPopup, setShowPopup] = useState(false);
    const [popupFlag, setPopupFlag] = useState<string | null>(null);

  useEffect(() => {
    if (isPlaying) {
      setLinesVisible(true); // ensure lines are on top of the base speaker
      // Start repeating scale 1 -> 1.2 -> 1
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(linesAnim, {
            toValue: 1.2,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(linesAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();

      // Stop the loop after 5s, but keep lines shown at the last scale factor
      const timer = setTimeout(() => {
        if (loopRef.current) loopRef.current.stop();
        linesAnim.stopAnimation((currentValue) => {
          // Freeze at the final scale, or pick a stable value
          linesAnim.setValue(1.2);
        });
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // If not playing, hide lines entirely & reset scale
      if (loopRef.current) {
        loopRef.current.stop();
      }
      linesAnim.setValue(1);
      setLinesVisible(false);
    }
  }, [isPlaying]);

  return (
    <>
    <View style={profileNavbarStyles.navbar}>
      <TouchableOpacity onPress={onBack}>
        <Image
          source={require("../assets/images/icons/back-arrow.png")}
          style={profileNavbarStyles.navIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={profileNavbarStyles.navSpacer} />

      <TouchableOpacity 
        style={profileNavbarStyles.moneysBar}
        onPress={() => {
          setPopupFlag("moneys");
          setShowPopup(true);
        }}>
              <Text style={profileNavbarStyles.moneysAmount}>10</Text>
              <Image style={profileNavbarStyles.moneysImage} source={require("../assets/images/moneys.png")} />
            </TouchableOpacity>

      {/* Speaker icon area */}
      {soundLoading ? (
        <ActivityIndicator color="#fff" style={{ width: 50, height: 50 }} />
      ) : (
        <TouchableOpacity onPress={toggleMusic} style={profileNavbarStyles.speakerWrapper}>
          {/* speaker-no-lines is always there */}
          <Image
            source={require("../assets/images/icons/speaker-no-lines.png")}
            style={profileNavbarStyles.speakerBase}
            resizeMode="contain"
          />
          {linesVisible && (
            <Animated.Image
              source={require("../assets/images/icons/speaker-lines.png")}
              style={[
                profileNavbarStyles.speakerLines,
                {
                  transform: [{ scale: linesAnim }],
                },
              ]}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      )}
    </View>
    <PopUp
           visible={showPopup}
           flag={popupFlag || undefined}
           onClose={() => setShowPopup(false)}
         >
           
       </PopUp>
       </>
  );
}

const profileNavbarStyles = StyleSheet.create({
  navbar: {
    width: "100%",
    height: Platform.OS === "ios" ? 85 : 65,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 0,
    paddingTop: Platform.OS === "ios" ? 0 : 0,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
  navSpacer: {
    flex: 1,
  },
  moneysBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    height: "55%",
    width: "30%",
    paddingHorizontal: 10,
    marginRight: 20,
    backgroundColor: "#d8bfd8"
  },
  moneysAmount: {
    color: "#460b2a",
    fontSize: 30,
    letterSpacing: 3,
  },
  moneysImage: {
    width: "65%",
    height: "80%"
  },
  speakerWrapper: {
    width: 50,
    height: 50,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  speakerBase: {
    width: 45,
    height: 45,
    position: "absolute",
  },
  speakerLines: {
    width: 55,
    height: 40,
    position: "absolute",
  },
});
