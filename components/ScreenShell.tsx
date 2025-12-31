// components/ScreenShell.tsx
import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { ImageBackground } from "expo-image";

type Props = {
  backgroundSource: any;
  bgTransform?: any[];

  top?: React.ReactNode;
  hud?: React.ReactNode;
  children: React.ReactNode; // main content (flex:1)
  bottom?: React.ReactNode;

  style?: StyleProp<ViewStyle>;
  contentOverflowHidden?: boolean; // default true
};

export function ScreenShell({
  backgroundSource,
  bgTransform,
  top,
  hud,
  children,
  bottom,
  style,
  contentOverflowHidden,
}: Props) {
  return (
    <View style={[styles.screen, style]}>
      {/* Background (absolute) */}
      <View style={styles.bgWrap} pointerEvents="none">
        <ImageBackground
          source={backgroundSource}
          style={[
            styles.bgImage,
            bgTransform ? { transform: bgTransform } : null,
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Foreground column */}
      <View style={styles.foreground}>
        {top ? <View style={styles.top}>{top}</View> : null}
        {hud ? <View style={styles.hud}>{hud}</View> : null}

        {/* Content gets the remaining space */}
        <View
          style={[
            styles.content,
            contentOverflowHidden === false ? { overflow: "visible" } : null,
          ]}
        >
          {children}
        </View>

        {bottom ? <View style={styles.bottom}>{bottom}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050816" },

  bgWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bgImage: { width: "100%", height: "100%" },

  foreground: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 16,
  },

  // Keep these consistent across the app (your “feel” lives here)
  top: {
    marginTop: 30,
    marginBottom: 8,
    alignItems: "center",
  },
  hud: {
    marginTop: 25,
    marginBottom: 10,
  },
  content: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  bottom: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 18,
  },
});
