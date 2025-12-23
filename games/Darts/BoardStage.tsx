import React from "react";
import {
  View,
  Image,
  Animated,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import {
  W,
  H,
  BOARD_BACK_RADIUS,
  BOARD_CENTER,
  BOARD_RADIUS,
  HAND_W,
  HAND_H,
  HAND_PIVOT_SHIFT_X,
  HAND_PIVOT_SHIFT_Y,
  HAND_VERTICAL_OFFSET,
  DART_TRANSLATE_Y,
  Z_START_SCALE,
  Z_END_SCALE,
} from "./gameCore";
import type { StuckPose, DartRef } from "./gameCore";

// Local assets (kept here so Darts.tsx stays small)
const BG = require("./assets/Background.png");
const BOARD = require("./assets/Asset 1.png");
const DART = require("./assets/Asset 2.png");
const HAND = require("./assets/Asset 2aaa.png");
const HAND2 = require("./assets/handNoThumb.png");
const BOARDBACK = require("./assets/boardBack.png");

function poseFromState(x: number, y: number, angle: number, scale: number) {
  const left = x - 25; // TIP_OFFSET_X
  const top = y - 32; // TIP_OFFSET_Y
  return { left, top, angle, scale };
}

export type BoardStageProps = {
  cameraTransform: any;
  power: number;
  isAiming: boolean;
  handScale: number;

  /** World-space hand pivot X so hand + dart move together under camera */
  handXWorld: number;

  dart: DartRef;
  stuckDarts: StuckPose[];
  dartsInRack: number;
  turnComplete: boolean;
  showCutscene: boolean;

  // allow overriding the hand images (e.g., level 3 alien hand)
  handUnderSrc?: ImageSourcePropType;
  handOverSrc?: ImageSourcePropType;

  // tweakable offsets (px) applied AFTER scale so they’re screen-accurate
  handUnderOffset?: { x?: number; y?: number };
  handOverOffset?: { x?: number; y?: number };
};

export default function BoardStage(props: BoardStageProps) {
  const {
    cameraTransform,
    power,
    isAiming,
    handScale,
    handXWorld, // ← use world-space pivot, not finger screen X
    dart,
    stuckDarts,
    dartsInRack,
    turnComplete,
    showCutscene,
    handUnderSrc,
    handOverSrc,
    handUnderOffset,
    handOverOffset,
  } = props;

  const uOffX = handUnderOffset?.x ?? 0;
  const uOffY = handUnderOffset?.y ?? 0;
  const oOffX = handOverOffset?.x ?? 0;
  const oOffY = handOverOffset?.y ?? 0;

  const DartsRack = () => {
    if (turnComplete || showCutscene) return null;
    const rackY = BOARD_CENTER.y + BOARD_RADIUS + 14;
    const sizeW = 32,
      sizeH = 70,
      gap = 10;
    const totalW = 3 * sizeW + 2 * gap;
    const startX = BOARD_CENTER.x - totalW / 2 - 80;
    const nodes: JSX.Element[] = [];
    for (let i = 0; i < dartsInRack; i++) {
      const left = startX + i * (sizeW + gap);
      const rot = i === 0 ? -8 : i === 1 ? 0 : 8;
      nodes.push(
        <Image
          key={`rack-${i}`}
          source={DART}
          resizeMode="contain"
          style={{
            position: "absolute",
            width: sizeW,
            height: sizeH,
            left,
            top: rackY,
            opacity: 0.95,
            transform: [
              { perspective: 700 },
              { scale: 0.85 },
              { rotate: `${rot}deg` },
            ],
          }}
        />
      );
    }
    return <>{nodes}</>;
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, { transform: cameraTransform }]}
    >
      {/* Background overscan */}
      {(() => {
        const bgOverscan = 40;
        return (
          <Image
            source={BG}
            style={{
              position: "absolute",
              left: -bgOverscan,
              top: -bgOverscan,
              width: W + bgOverscan * 3,
              height: H + 200 + bgOverscan * 3,
            }}
          />
        );
      })()}

      {/* Board back */}
      <Image
        source={BOARDBACK}
        style={{
          position: "absolute",
          width: BOARD_BACK_RADIUS * 2,
          height: BOARD_BACK_RADIUS * 2,
          left: BOARD_CENTER.x - BOARD_BACK_RADIUS,
          top: BOARD_CENTER.y - BOARD_BACK_RADIUS + 35,
        }}
        resizeMode="contain"
      />

      {/* Board */}
      <Image
        source={BOARD}
        style={{
          position: "absolute",
          width: BOARD_RADIUS * 2,
          height: BOARD_RADIUS * 2,
          left: BOARD_CENTER.x - BOARD_RADIUS,
          top: BOARD_CENTER.y - BOARD_RADIUS,
        }}
        resizeMode="contain"
      />

      {/* Rack */}
      <DartsRack />

      {/* Landed darts */}
      {stuckDarts.map((p, i) => (
        <Image
          key={`stuck-${i}`}
          source={DART}
          resizeMode="contain"
          style={{
            position: "absolute",
            width: 50,
            height: 110,
            left: p.left,
            top: p.top,
            transform: [
              { perspective: 700 },
              { scale: p.scale },
              { rotate: `${p.angle + 270}deg` },
              { translateY: +DART_TRANSLATE_Y },
            ],
          }}
        />
      ))}

      {/* Hand under */}
      {!showCutscene && (
        <Image
          source={handUnderSrc ?? HAND}
          resizeMode="contain"
          pointerEvents="none"
          style={{
            position: "absolute",
            width: HAND_W,
            height: HAND_H,
            left: handXWorld - HAND_PIVOT_SHIFT_X, // ← world pivot
            top: AIM_Y() + HAND_VERTICAL_OFFSET - HAND_PIVOT_SHIFT_Y + 35,
            opacity: 0.9,
            transform: [
              { translateX: -HAND_PIVOT_SHIFT_X },
              { translateY: -HAND_PIVOT_SHIFT_Y },
              { scale: handScale },
              { translateX: HAND_PIVOT_SHIFT_X },
              { translateY: HAND_PIVOT_SHIFT_Y },
              // final, screen-pixel offsets for level-specific tweaks
              { translateX: uOffX },
              { translateY: uOffY },
            ],
          }}
        />
      )}

      {/* Live dart */}
      {!turnComplete &&
        !showCutscene &&
        (dart.flying || true) &&
        (() => {
          const scale = isAiming
            ? Z_START_SCALE * handScale
            : Z_START_SCALE + (Z_END_SCALE - Z_START_SCALE) * (dart.z || 0);
          const pose = poseFromState(dart.x, dart.y, dart.angle, scale);
          return (
            <Image
              source={DART}
              resizeMode="contain"
              style={{
                position: "absolute",
                width: 50,
                height: 110,
                left: pose.left,
                top: pose.top,
                transform: [
                  { perspective: 700 },
                  { scale: pose.scale },
                  { rotate: `${pose.angle + 270}deg` },
                  { translateY: +DART_TRANSLATE_Y },
                ],
              }}
            />
          );
        })()}

      {/* Hand over */}
      {!showCutscene && (
        <Image
          source={handOverSrc ?? HAND2}
          resizeMode="contain"
          pointerEvents="none"
          style={{
            position: "absolute",
            width: HAND_W,
            height: HAND_H,
            left: handXWorld - HAND_PIVOT_SHIFT_X, // ← world pivot
            top: AIM_Y() + HAND_VERTICAL_OFFSET - HAND_PIVOT_SHIFT_Y + 35,
            opacity: 0.9,
            transform: [
              { translateX: -HAND_PIVOT_SHIFT_X },
              { translateY: -HAND_PIVOT_SHIFT_Y },
              { scale: handScale },
              { translateX: HAND_PIVOT_SHIFT_X },
              { translateY: HAND_PIVOT_SHIFT_Y },
              { translateX: oOffX },
              { translateY: oOffY },
            ],
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({});

// inline so we don't re-export AIM_Y separately here
function AIM_Y() {
  return H - 120;
}
