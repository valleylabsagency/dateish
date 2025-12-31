// app/lyd.tsx
import React, { useContext, useEffect, useRef, useMemo } from "react";
import { View, Pressable, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import LittleYellowDude from "../games/LYD/LittleYellowDude";
import { ProfileContext } from "@/contexts/ProfileContext";
import { submitLeaderboardEntry } from "@/services/highscores";

// Freeze size: YOUR CURRENT “perfect” design canvas
const BASE_W = 360;
const BASE_H = 703;

function FreezeByHeight({
  children,
  backgroundColor = "#000",
}: {
  children: React.ReactNode;
  backgroundColor?: string;
}) {
  const { width: W, height: H } = useWindowDimensions();

  const isBase = Math.abs(W - BASE_W) < 0.5 && Math.abs(H - BASE_H) < 0.5;

  // IMPORTANT: on the base device, return the original layout with ZERO transforms
  if (isBase) {
    return <View style={{ flex: 1, backgroundColor }}>{children}</View>;
  }

  const rawScale = H / BASE_H;

  // never scale DOWN; only scale up
  const scale = Math.max(1, rawScale);

  // top-pin for scale up only
  const translateY = scale > 1 ? -((scale - 1) * BASE_H) / 2 : 0;

  useEffect(() => {
    console.log("[LYD FREEZE]", {
      W,
      H,
      BASE_W,
      BASE_H,
      isBase,
      scale,
      translateY,
    });
  }, [W, H, isBase, scale, translateY]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        overflow: "hidden", // crops sides when scaled width exceeds device width
        alignItems: "center", // letterbox on wide screens
        justifyContent: "flex-start", // top pinned
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: [{ translateY }, { scale }],
        }}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </View>
  );
}

export default function LydScreen() {
  const router = useRouter();
  const { profile } = useContext(ProfileContext);

  const submittedRef = useRef(false);

  useEffect(() => {
    submittedRef.current = false;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FreezeByHeight backgroundColor="#000">
        <LittleYellowDude
          onFinish={async (seconds, formatted, result) => {
            if (result !== "win") return;
            if (submittedRef.current) return;
            submittedRef.current = true;

            try {
              await submitLeaderboardEntry(
                "lyd",
                seconds,
                { name: profile?.name, photoUri: profile?.photoUri },
                formatted
              );
            } catch (e) {
              console.error("Failed to submit LYD leaderboard entry:", e);
            }
          }}
        />
      </FreezeByHeight>

      {/* Back button overlay (NOT scaled) */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          zIndex: 9999,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 10,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.35)",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Back</Text>
      </Pressable>
    </View>
  );
}
