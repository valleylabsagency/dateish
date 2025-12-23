// services/mmPopups/barClosed.tsx
import React, { useEffect, useState } from "react";
import {
  AppState,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScaledSheet } from "react-native-size-matters";
import { FontNames } from "@/constants/fonts";
import MMAnimated from "@/services/MMAnimated";

import closeIcon from "@/assets/images/x.png"; // <-- adjust if needed

// -------------------- BAR CLOSED CONFIG --------------------
// example: 5:00 AM local device time (change to whatever you want)
export const BAR_CLOSED_HOUR = 4;
export const BAR_CLOSED_MINUTE = 59;
export const BAR_CLOSED_STORAGE_KEY = "barClosed_shown_yyyy_mm_dd";

// UI text
export const BAR_CLOSED_TEXT = "Bar is closing in 1 minute.\nGet the fuck out!";

export type BarClosedConfig = {
  enabled: boolean;
  hidden: boolean;
};

function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isInTargetWindow(
  now: Date,
  hour: number,
  minute: number,
  windowMs = 90_000
) {
  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setHours(hour, minute, 0, 0);

  const diff = now.getTime() - start.getTime();
  return diff >= 0 && diff <= windowMs;
}

function msUntilNextTarget(d: Date, hour: number, minute: number) {
  const next = new Date(d);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);
  if (next <= d) next.setDate(next.getDate() + 1);
  return next.getTime() - d.getTime();
}

export const DEBUG_FORCE_BARCLOSED = false;

export function useBarClosedTrigger(cfg: BarClosedConfig) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!cfg.enabled) return;

    let timeoutId: any = null;
    let guardId: any = null;

    const checkAndMaybeShow = async (now = new Date()) => {
      if (cfg.hidden) return;

      const isMatch = isInTargetWindow(now, BAR_CLOSED_HOUR, BAR_CLOSED_MINUTE);
      if (!DEBUG_FORCE_BARCLOSED && !isMatch) return;

      const today = yyyymmdd(now);
      const already = await AsyncStorage.getItem(BAR_CLOSED_STORAGE_KEY);

      console.log("[BarClosed] storage", {
        today,
        already,
        key: BAR_CLOSED_STORAGE_KEY,
      });

      if (!DEBUG_FORCE_BARCLOSED && already === today) {
        console.log("[BarClosed] skip: already shown today");
        return;
      }

      await AsyncStorage.setItem(BAR_CLOSED_STORAGE_KEY, today);
      console.log("[BarClosed] SET visible true");
      setVisible(true);
    };

    const scheduleNext = () => {
      if (timeoutId) clearTimeout(timeoutId);

      const delay = msUntilNextTarget(
        new Date(),
        BAR_CLOSED_HOUR,
        BAR_CLOSED_MINUTE
      );

      timeoutId = setTimeout(async () => {
        await checkAndMaybeShow(new Date());

        const start = Date.now();
        guardId = setInterval(async () => {
          await checkAndMaybeShow(new Date());
          if (Date.now() - start > 65_000) {
            clearInterval(guardId);
            guardId = null;
          }
        }, 1000);

        scheduleNext();
      }, delay);
    };

    checkAndMaybeShow(new Date());
    scheduleNext();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkAndMaybeShow(new Date());
        scheduleNext();
      }
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (guardId) clearInterval(guardId);
      sub.remove();
    };
  }, [cfg.enabled, cfg.hidden]);

  return {
    visible,
    dismiss: () => setVisible(false),
  };
}

export function BarClosedOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <View style={barClosedStyles.mingModalOverlay} pointerEvents="box-none">
        <View style={barClosedStyles.mingModalContainer} pointerEvents="auto">
          <TouchableOpacity
            style={barClosedStyles.mingModalCloseButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image source={closeIcon} style={baseStyles.closeIcon} />
          </TouchableOpacity>

          <Text style={barClosedStyles.mingModalText}>{BAR_CLOSED_TEXT}</Text>

          <View style={barClosedStyles.mingTriangleContainer}>
            <View style={barClosedStyles.mingOuterTriangle} />
            <View style={barClosedStyles.mingInnerTriangle} />
          </View>

          <MMAnimated
            showBackground={false}
            showBarFront={false}
            showControls={false}
            enterOnMount
            minglesOffsetY={-10}
          />
        </View>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: "#F5E1C4",
  },
});

export const barClosedStyles = ScaledSheet.create({
  mingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 9999,
  },
  mingModalContainer: {
    width: "90%",
    height: "400@vs",
    backgroundColor: "#020621",
    borderWidth: "4@ms",
    borderColor: "#fff",
    borderRadius: "20@ms",
    paddingVertical: "50@ms",
    paddingHorizontal: "8@ms",
    alignItems: "center",
    position: "relative",
    bottom: "18%",
  },
  mingModalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  mingModalText: {
    color: "#eceded",
    fontSize: "32@ms",
    textAlign: "center",
    marginBottom: "20@ms",
    fontWeight: "400",
    fontFamily: FontNames.MontserratExtraLight,
  },
  mingTriangleContainer: {
    position: "absolute",
    bottom: "-24@ms",
    right: "24@ms",
    width: 0,
    height: 0,
  },
  mingOuterTriangle: {
    width: 5,
    height: 5,
    borderLeftWidth: "26@ms",
    borderRightWidth: "26@ms",
    borderTopWidth: "24@ms",
    position: "absolute",
    left: "-44@ms",
    top: "-24@ms",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
  mingInnerTriangle: {
    position: "absolute",
    top: "-25@ms",
    left: "-40@ms",
    width: 0,
    height: 0,
    borderLeftWidth: "22@ms",
    borderRightWidth: "22@ms",
    borderTopWidth: "22@ms",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#020621",
  },
});
