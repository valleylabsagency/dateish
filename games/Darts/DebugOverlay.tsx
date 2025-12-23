// Components/DebugOverlay.tsx
// Drop-in debug overlay for the darts board: grid, rings, spokes, sector highlight, impact text.

import React from "react";
import { View, Text } from "react-native";

type LastInfo = { angTop: number; r: number; sectorIndex: number } | null;
type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const GRID_LINE_THICKNESS = 1;
const GRID_LINE_COLOR = "rgba(0,255,200,0.35)";
const GRID_CENTER_COLOR = "rgba(255,255,255,0.65)";
const GRID_LAST_CELL_COLOR = "rgba(255,255,0,0.28)";
const GRID_BOUNDS_COLOR = "rgba(0,255,200,0.15)";

function Spoke({
  angleDeg,
  length,
  thickness = 2,
  color = "rgba(255,255,255,0.9)",
  cx,
  cy,
}: {
  angleDeg: number;
  length: number;
  thickness?: number;
  color?: string;
  cx: number;
  cy: number;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        width: 0,
        height: 0,
        transform: [{ rotate: `${angleDeg}deg` }],
      }}
      pointerEvents="none"
    >
      <View
        style={{
          position: "absolute",
          left: -thickness / 2,
          top: -length,
          width: thickness,
          height: length,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function DebugOverlay(props: {
  // Toggles
  showGrid?: boolean;
  showCellCenters?: boolean;
  showLastCell?: boolean;
  showLabels?: boolean;
  showRings?: boolean;
  showSpokes?: boolean;
  highlightSector?: boolean;
  showImpact?: boolean;

  // Grid
  GRID_W: number;
  GRID_H: number;
  getTargetRect: () => Rect;
  lastCell: { gx: number; gy: number } | null;

  // Scoring/board geometry
  getScoringCenter: () => { x: number; y: number };
  BOARD_RADIUS: number;
  ringRadii: {
    innerBull: number;
    outerBull: number;
    tripleInner: number;
    tripleOuter: number;
    doubleInner: number;
    doubleOuter: number;
  };
  spokesRotationOffsetDeg?: number;

  // Latest hit info / label
  lastInfo: LastInfo;
  lastScore: number | null;
  lastRing:
    | "MISS"
    | "INNER_BULL"
    | "OUTER_BULL"
    | "DOUBLE"
    | "TRIPLE"
    | "SINGLE"
    | null;
  lastSector: number | null;

  // Optional position to place the impact text (typically below board)
  impactTextY?: number;
}) {
  const {
    showGrid = false,
    showCellCenters = false,
    showLastCell = false,
    showLabels = false,
    showRings = false,
    showSpokes = false,
    highlightSector = false,
    showImpact = false,

    GRID_W,
    GRID_H,
    getTargetRect,
    lastCell,

    getScoringCenter,
    BOARD_RADIUS,
    ringRadii,
    spokesRotationOffsetDeg = 0,

    lastInfo,
    lastScore,
    lastRing,
    lastSector,

    impactTextY = undefined,
  } = props;

  const overlays: JSX.Element[] = [];
  const C = getScoringCenter();

  // --- GRID ---
  if (showGrid) {
    const r = getTargetRect();
    const cellW = r.width / GRID_W;
    const cellH = r.height / GRID_H;

    overlays.push(
      <View
        key="bounds"
        style={{
          position: "absolute",
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          backgroundColor: GRID_BOUNDS_COLOR,
        }}
        pointerEvents="none"
      />
    );

    for (let i = 0; i <= GRID_W; i++) {
      const x = r.left + i * cellW - GRID_LINE_THICKNESS / 2;
      overlays.push(
        <View
          key={`v${i}`}
          style={{
            position: "absolute",
            left: x,
            top: r.top,
            width: GRID_LINE_THICKNESS,
            height: r.height,
            backgroundColor: GRID_LINE_COLOR,
          }}
        />
      );
    }
    for (let j = 0; j <= GRID_H; j++) {
      const y = r.top + j * cellH - GRID_LINE_THICKNESS / 2;
      overlays.push(
        <View
          key={`h${j}`}
          style={{
            position: "absolute",
            left: r.left,
            top: y,
            width: r.width,
            height: GRID_LINE_THICKNESS,
            backgroundColor: GRID_LINE_COLOR,
          }}
        />
      );
    }

    if (showCellCenters) {
      for (let gx = 0; gx < GRID_W; gx++) {
        for (let gy = 0; gy < GRID_H; gy++) {
          const cx = r.left + gx * cellW + cellW / 2;
          const cy = r.top + gy * cellH + cellH / 2;
          overlays.push(
            <View
              key={`dot-${gx}-${gy}`}
              style={{
                position: "absolute",
                left: cx - 2,
                top: cy - 2,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: GRID_CENTER_COLOR,
              }}
            />
          );
        }
      }
    }

    if (showLastCell && lastCell) {
      const { gx, gy } = lastCell;
      overlays.push(
        <View
          key="last"
          style={{
            position: "absolute",
            left: r.left + gx * cellW,
            top: r.top + gy * cellH,
            width: cellW,
            height: cellH,
            backgroundColor: GRID_LAST_CELL_COLOR,
          }}
        />
      );
      if (showLabels) {
        overlays.push(
          <Text
            key="lbl"
            style={{
              position: "absolute",
              left: r.left + gx * cellW + 4,
              top: r.top + gy * cellH + 2,
              color: "#fff",
              fontSize: 10,
            }}
          >
            ({gx},{gy})
          </Text>
        );
      }
    }
  }

  // --- RINGS ---
  if (showRings) {
    const mkCircle = (
      radius: number,
      thickness = 2,
      color = "rgba(255,255,255,0.25)"
    ) => (
      <View
        key={`r-${radius}-${thickness}`}
        style={{
          position: "absolute",
          left: C.x - BOARD_RADIUS * radius,
          top: C.y - BOARD_RADIUS * radius,
          width: BOARD_RADIUS * 2 * radius,
          height: BOARD_RADIUS * 2 * radius,
          borderRadius: BOARD_RADIUS * radius,
          borderWidth: thickness,
          borderColor: color,
        }}
        pointerEvents="none"
      />
    );

    overlays.push(mkCircle(ringRadii.innerBull, 2, "rgba(0,255,0,0.7)"));
    overlays.push(mkCircle(ringRadii.outerBull, 2, "rgba(0,255,0,0.5)"));
    overlays.push(mkCircle(ringRadii.tripleInner, 2, "rgba(255,0,0,0.5)"));
    overlays.push(mkCircle(ringRadii.tripleOuter, 2, "rgba(255,0,0,0.5)"));
    overlays.push(mkCircle(ringRadii.doubleInner, 2, "rgba(0,150,255,0.5)"));
    overlays.push(mkCircle(ringRadii.doubleOuter, 2, "rgba(0,150,255,0.5)"));
  }

  // --- SPOKES ---
  if (showSpokes) {
    for (let i = 0; i < 20; i++) {
      const angleDeg = (i * 18 + (spokesRotationOffsetDeg || 0)) % 360;
      overlays.push(
        <Spoke
          key={`spoke-${i}`}
          angleDeg={angleDeg}
          length={BOARD_RADIUS}
          thickness={2}
          color="rgba(255,255,255,0.9)"
          cx={C.x}
          cy={C.y}
        />
      );
    }
  }

  // --- HIGHLIGHT SELECTED SECTOR ---
  if (highlightSector && lastInfo && lastInfo.sectorIndex >= 0) {
    const highlightDeg = lastInfo.angTop;
    const radial = Math.max(0, Math.min(1, lastInfo.r));
    const lineLen = BOARD_RADIUS * radial;

    overlays.push(
      <Spoke
        key="sel-spoke"
        angleDeg={highlightDeg}
        length={lineLen}
        thickness={3}
        color="rgba(255,215,0,0.95)"
        cx={C.x}
        cy={C.y}
      />
    );
  }

  // --- IMPACT TEXT ---
  if (showImpact && lastScore != null) {
    overlays.push(
      <Text
        key="impact-text"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: impactTextY ?? C.y + 220,
          textAlign: "center",
          color: "#fff",
          fontSize: 18,
          fontWeight: "700",
        }}
      >
        {lastRing === "MISS" ? "MISS" : `${lastRing} ${lastSector}`} —{" "}
        {lastScore} pts
      </Text>
    );
  }

  return <>{overlays}</>;
}

export default DebugOverlay;
