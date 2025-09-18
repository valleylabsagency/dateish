import React, { useRef, useEffect } from "react";
import { Dimensions, Animated, Easing } from "react-native";

/* ========= Screen ========= */
export const { width: W, height: H } = Dimensions.get("window");

/* ========= Geometry & Layout ========= */
export const BOARD_RADIUS = Math.min(W, H) * 0.43;
export const BOARD_CENTER = { x: W / 2, y: BOARD_RADIUS + 64 };
export const AIM_Y = H - 120;
export const BOARD_BACK_RADIUS = Math.min(W, H) * 0.575;

/* ========= Hand/Dart visual tuning ========= */
export const HAND_W = 200;
export const HAND_H = 200;
export const HAND_PIVOT_SHIFT_X = 56;
export const HAND_PIVOT_SHIFT_Y = 0;
export const HAND_VERTICAL_OFFSET = -48;
export const AIM_OFFSET_X = -36;

export const TIP_OFFSET_X = 25;
export const TIP_OFFSET_Y = 32;
export const DART_TRANSLATE_Y = 0;

export const Z_START_SCALE = 1.0;
export const Z_END_SCALE = 0.45;

/* ========= Grid/Target ========= */
export const GRID_W = 30;
export const GRID_H = 30;
const TARGET_INSET_RATIO = 0.06;
const GRID_EXTEND_RATIO = 0.25;
const GRID_EXTEND_PX = 0;
const CLAMP_GRID_TO_SCREEN = true;
export const EXTRA_BOTTOM_ROWS = 3;

/* ========= Power / flight ========= */
export const POWER_CURVE = 1.8;
export const POWER_HOLD_MS = 1800;
export const PULLBACK_MAX_SCALE = 0.35;
export const BASE_FLIGHT_MS = 440;
export const FAST_FLIGHT_MS = 240;
export type EaseMode = "linear" | "easeOut" | "easeInOut";
export const EASE_MODE: EaseMode = "easeOut";

/* ========= Camera wiggle baseline ========= */
export const CAM_WIGGLE_PX = 6;
export const CAM_WIGGLE_DEG = 0.3;

/* ========= Camera Zoom (new) ========= */
export type CameraZoomConfig = {
  enabled: boolean;
  base?: number; // default 1.0
  amp?: number; // ± around base, default 0.03
  periodMs?: number; // full up+down cycle, default 2200ms
  bursts?: {
    everyMs: number; // how often to spike
    amp: number; // spike amplitude (above base)
    durMs: number; // spike duration till release
  } | null;
  stopOnLevelEnd?: boolean; // if true, pulse stops once level is completed
  jitterPct?: number; // 0..0.25 small period randomness
};

export const DEFAULT_CAMERA_ZOOM: CameraZoomConfig = {
  enabled: false,
  base: 1,
  amp: 0.03,
  periodMs: 2200,
  bursts: null,
  stopOnLevelEnd: true,
  jitterPct: 0,
};

export const LEVEL_CAMERA_ZOOM: Record<number, CameraZoomConfig> = {
  // Level 1 — almost no movement
  1: {
    enabled: false,
    base: 1,
    amp: 0.012,
    periodMs: 2600,
    bursts: null,
    stopOnLevelEnd: true,
    jitterPct: 0.05,
  },
  // Level 2 — gentle pulse
  2: {
    enabled: true,
    base: 1,
    amp: 0.2,
    periodMs: 2400,
    bursts: null,
    stopOnLevelEnd: true,
    jitterPct: 0.06,
  },
  // Level 3 — a bit stronger
  3: {
    enabled: true,
    base: 1,
    amp: 0.5,
    periodMs: 2000,
    bursts: { everyMs: 2000, amp: 0.09, durMs: 280 },
    stopOnLevelEnd: true,
    jitterPct: 0.08,
  },
  // Level 4 / bossy feel — strongest
  4: {
    enabled: true,
    base: 1,
    amp: 1.3,
    periodMs: 2800,
    bursts: { everyMs: 3000, amp: 0.25, durMs: 450 },
    stopOnLevelEnd: true,
    jitterPct: 0.1,
  },
};

/* ========= Random helpers ========= */
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clampXToScreen = (x: number) => Math.max(28, Math.min(W - 28, x));
export const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;
export const pickSigned = (max: number) => rand(-max, max);

export function ease(t: number, mode: EaseMode) {
  switch (mode) {
    case "easeOut":
      return 1 - Math.pow(1 - t, 3);
    case "easeInOut":
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    default:
      return t;
  }
}

/* ========= Target rects ========= */
export function getBoardRect() {
  const left = BOARD_CENTER.x - BOARD_RADIUS;
  const right = BOARD_CENTER.x + BOARD_RADIUS;
  const top = BOARD_CENTER.y - BOARD_RADIUS;
  const bottom = BOARD_CENTER.y + BOARD_RADIUS;
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}
export function getTargetRect() {
  const base = getBoardRect();
  const padX = base.width * GRID_EXTEND_RATIO + GRID_EXTEND_PX;
  const padY = base.height * GRID_EXTEND_RATIO + GRID_EXTEND_PX;

  let left = base.left - padX;
  let right = base.right + padX;
  let top = base.top - padY;
  let bottomFull = base.bottom + padY;

  if (CLAMP_GRID_TO_SCREEN) {
    left = Math.max(0, left);
    right = Math.min(W, right);
    top = Math.max(0, top);
    bottomFull = Math.min(H, bottomFull);
  }

  const widthPre = Math.max(1, right - left);
  const heightPre = Math.max(1, bottomFull - top);
  const insetX = widthPre * TARGET_INSET_RATIO;
  const insetY = heightPre * TARGET_INSET_RATIO;

  left += insetX;
  right -= insetX;
  top += insetY;
  bottomFull -= insetY;
  const bottom = bottomFull;
  return {
    left,
    right,
    top,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

/* ========= Grid helpers ========= */
export function gridCellCenter(gx: number, gy: number) {
  const r = getTargetRect();
  const cellW = r.width / GRID_W;
  const cellH = r.height / GRID_H;
  const cx = r.left + gx * cellW + cellW / 2;
  const cy = r.top + gy * cellH + cellH / 2;

  // slight pull toward center to avoid edge-sticking visuals
  const nx = BOARD_CENTER.x - cx;
  const ny = BOARD_CENTER.y - cy;
  const nmag = Math.max(Math.hypot(nx, ny), 1);
  return { x: cx + (nx / nmag) * 2, y: cy + (ny / nmag) * 2 };
}

/* ========= Tuning ========= */
export type Tuning = {
  POWER_HOLD_MS: number;
  CAM_WIGGLE_PX: number;
  CAM_WIGGLE_DEG: number;
  BASE_FLIGHT_MS: number;
  FAST_FLIGHT_MS: number;
  EXTRA_BOTTOM_ROWS: number;
  JITTER_ENABLED: boolean;
  JITTER_MAX_COLS: number;
  JITTER_MAX_ROWS: number;
  JITTER_PROBABILITY: number;
  PULLBACK_MAX_SCALE: number;
  EASE_MODE: EaseMode;
};

export const DEFAULT_TUNING: Tuning = {
  POWER_HOLD_MS,
  CAM_WIGGLE_PX,
  CAM_WIGGLE_DEG,
  BASE_FLIGHT_MS,
  FAST_FLIGHT_MS,
  EXTRA_BOTTOM_ROWS,
  JITTER_ENABLED: true,
  JITTER_MAX_COLS: 1,
  JITTER_MAX_ROWS: 1,
  JITTER_PROBABILITY: 0.15,
  PULLBACK_MAX_SCALE,
  EASE_MODE,
};

export const LEVEL_TUNING: Record<number, Partial<Tuning>> = {
  1: { CAM_WIGGLE_PX: 0, CAM_WIGGLE_DEG: 0, POWER_HOLD_MS: 1800 },
  2: {
    CAM_WIGGLE_PX: 14,
    CAM_WIGGLE_DEG: 1.6,
    POWER_HOLD_MS: 1200,
    JITTER_PROBABILITY: 0.2,
  },
  3: {
    CAM_WIGGLE_PX: 40,
    CAM_WIGGLE_DEG: 3.5,
    POWER_HOLD_MS: 700,
    JITTER_PROBABILITY: 0.25,
  },
  4: {
    CAM_WIGGLE_PX: 80,
    CAM_WIGGLE_DEG: 7,
    POWER_HOLD_MS: 400,
    BASE_FLIGHT_MS: 360,
    FAST_FLIGHT_MS: 200,
    JITTER_PROBABILITY: 0.33,
    JITTER_MAX_COLS: 2,
    JITTER_MAX_ROWS: 2,
    PULLBACK_MAX_SCALE: 0.42,
    EASE_MODE: "easeInOut",
  },
};

/* ========= Aim and jitter ========= */
export function chooseGridCellTuned(aimX: number, power: number, T: Tuning) {
  const r = getTargetRect();
  const u = clamp01((aimX - r.left) / Math.max(1, r.width));
  let gx = Math.round(u * (GRID_W - 1));

  const pCurve = Math.pow(clamp01(power), POWER_CURVE);
  const effectiveRows = GRID_H + T.EXTRA_BOTTOM_ROWS;
  let gy = Math.round((1 - pCurve) * (effectiveRows - 1));
  if (gy > GRID_H - 1) gy = GRID_H - 1;

  if (T.JITTER_ENABLED && Math.random() < (T.JITTER_PROBABILITY ?? 0.15)) {
    const jx =
      Math.floor(Math.random() * (2 * (T.JITTER_MAX_COLS ?? 1) + 1)) -
      (T.JITTER_MAX_COLS ?? 1);
    const jy =
      Math.floor(Math.random() * (2 * (T.JITTER_MAX_ROWS ?? 1) + 1)) -
      (T.JITTER_MAX_ROWS ?? 1);
    gx = Math.max(0, Math.min(GRID_W - 1, gx + jx));
    gy = Math.max(0, Math.min(GRID_H - 1, gy + jy));
  }
  return { gx, gy };
}

/* ========= Power oscillator ========= */
export function usePowerOscillator(
  setPower: (p: number) => void,
  isAimingRef: React.MutableRefObject<boolean>,
  holdMsRef: React.MutableRefObject<number>
) {
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const dir = useRef<1 | -1>(1);

  const step = (ts: number) => {
    if (!isAimingRef.current) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
      return;
    }
    if (last.current == null) last.current = ts;
    const dt = Math.min((ts - last.current) / 1000, 0.05);
    last.current = ts;
    const delta = (dt / (Math.max(1, holdMsRef.current) / 1000)) * dir.current;
    setPower((prev) => {
      let p = prev + delta;
      if (p >= 1) {
        p = 1;
        dir.current = -1;
      }
      if (p <= 0) {
        p = 0;
        dir.current = 1;
      }
      return p;
    });
    raf.current = requestAnimationFrame(step);
  };

  return {
    start: () => {
      if (raf.current) return;
      last.current = null;
      dir.current = 1;
      raf.current = requestAnimationFrame(step);
    },
    stop: () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
    },
  };
}

/* ========= Camera wiggle as a hook (now exposes live numeric refs) ========= */
export function useCameraWiggle(
  T: Tuning,
  enabled: boolean
): {
  transform: any[];
  angleRef: React.MutableRefObject<number>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
} {
  const camX = useRef(new Animated.Value(0)).current; // px
  const camY = useRef(new Animated.Value(0)).current; // px
  const camR = useRef(new Animated.Value(0)).current; // -1..1 normalized

  // Exposed numeric refs (deg for angle, px for translations)
  const angleRef = useRef(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  // Keep refs in sync with animated values
  useEffect(() => {
    const idX = camX.addListener?.(({ value }) => {
      if (typeof value === "number") txRef.current = value;
    });
    const idY = camY.addListener?.(({ value }) => {
      if (typeof value === "number") tyRef.current = value;
    });
    const idR = camR.addListener?.(({ value }) => {
      if (typeof value === "number")
        angleRef.current = value * (T.CAM_WIGGLE_DEG ?? CAM_WIGGLE_DEG);
    });
    return () => {
      camX.removeListener?.(idX as any);
      camY.removeListener?.(idY as any);
      camR.removeListener?.(idR as any);
    };
  }, [camX, camY, camR, T.CAM_WIGGLE_DEG]);

  const running = useRef(false);
  const tick = useRef<Animated.CompositeAnimation | null>(null);

  function schedule() {
    if (!running.current) return;
    const toX = pickSigned(T.CAM_WIGGLE_PX ?? CAM_WIGGLE_PX);
    const toY = pickSigned((T.CAM_WIGGLE_PX ?? CAM_WIGGLE_PX) * 0.6);
    const toR = pickSigned(1); // normalized -1..1 that we'll map to deg in rotate()
    const dur = Math.floor(rand(550, 1300));
    const ez = [
      Easing.inOut(Easing.quad),
      Easing.inOut(Easing.cubic),
      Easing.inOut(Easing.sin),
    ][Math.floor(rand(0, 3))];

    tick.current = Animated.parallel(
      [
        Animated.timing(camX, {
          toValue: toX,
          duration: dur,
          easing: ez,
          useNativeDriver: true,
        }),
        Animated.timing(camY, {
          toValue: toY,
          duration: dur,
          easing: ez,
          useNativeDriver: true,
        }),
        Animated.timing(camR, {
          toValue: toR,
          duration: dur,
          easing: ez,
          useNativeDriver: true,
        }),
      ],
      { stopTogether: false }
    );

    tick.current.start(() => {
      if (!running.current) return;
      schedule();
    });
  }

  useEffect(() => {
    if (!enabled || (T.CAM_WIGGLE_PX ?? 0) <= 0) {
      running.current = false;
      tick.current?.stop?.();
      Animated.parallel([
        Animated.timing(camX, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(camY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(camR, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (running.current) return;
    running.current = true;
    schedule();
    return () => {
      running.current = false;
      tick.current?.stop?.();
    };
  }, [enabled, T.CAM_WIGGLE_PX]);

  const transform = [
    { translateX: camX },
    { translateY: camY },
    {
      rotate: camR.interpolate({
        inputRange: [-1, 1],
        outputRange: [
          `-${T.CAM_WIGGLE_DEG ?? CAM_WIGGLE_DEG}deg`,
          `${T.CAM_WIGGLE_DEG ?? CAM_WIGGLE_DEG}deg`,
        ],
      }),
    },
  ] as const;

  return { transform: transform as any[], angleRef, txRef, tyRef };
}

/* ========= Scale bursts hook (level-wide annoyance) ========= */
export function useScaleBursts(
  active: boolean,
  amount = 1.1,
  lengthMs = 2200,
  chance = 0.6,
  intervalMs = 1600
) {
  const scale = useRef(new Animated.Value(1)).current;
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }
  function schedule() {
    clearTimer();
    timer.current = setTimeout(run, intervalMs);
  }
  function run() {
    if (!running.current) return;
    const actions: Animated.CompositeAnimation[] = [];
    if (Math.random() < chance) {
      const up = Animated.timing(scale, {
        toValue: amount,
        duration: lengthMs / 2,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      });
      const dn = Animated.timing(scale, {
        toValue: 1,
        duration: lengthMs / 2,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      });
      actions.push(Animated.sequence([up, dn]));
    }
    if (actions.length)
      Animated.parallel(actions).start(() => {
        if (!running.current) return;
        schedule();
      });
    else schedule();
  }
  useEffect(() => {
    if (active) {
      running.current = true;
      schedule();
    } else {
      running.current = false;
      clearTimer();
      scale.stopAnimation(() => scale.setValue(1));
    }
    return () => {
      running.current = false;
      clearTimer();
    };
  }, [active, amount, lengthMs, chance, intervalMs]);
  return scale;
}

/* ========= Camera Zoom Pulse (new hook) ========= */
export function useCameraZoomPulse(cfg?: CameraZoomConfig, disabled?: boolean) {
  const scaleCam = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const burstTimerRef = useRef<NodeJS.Timer | null>(null);
  const running = useRef(false);

  function stop() {
    running.current = false;
    loopRef.current?.stop?.();
    loopRef.current = null;
    if (burstTimerRef.current) {
      clearInterval(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    Animated.timing(scaleCam, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  function start(config: CameraZoomConfig) {
    running.current = true;

    const base = config.base ?? 1;
    const amp = config.amp ?? 0.03;
    const defPeriod = Math.max(400, config.periodMs ?? 2200);
    const jitterPct = Math.min(Math.max(config.jitterPct ?? 0, 0), 0.25);

    const periodWithJitter = () => {
      if (!jitterPct) return defPeriod;
      const j = (Math.random() * 2 - 1) * jitterPct;
      return Math.max(400, Math.floor(defPeriod * (1 + j)));
    };

    scaleCam.stopAnimation(() => scaleCam.setValue(base));

    const runLoop = () => {
      if (!running.current) return;
      const p = periodWithJitter();
      const half = Math.floor(p / 2);

      const up = Animated.timing(scaleCam, {
        toValue: base + amp,
        duration: half,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
      const down = Animated.timing(scaleCam, {
        toValue: base - amp,
        duration: half,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });

      const seq = Animated.sequence([up, down]);
      loopRef.current = seq;
      seq.start(({ finished }) => {
        if (finished && running.current) runLoop();
      });
    };

    runLoop();

    if (config.bursts) {
      const { everyMs, amp: bAmp, durMs } = config.bursts;
      burstTimerRef.current = setInterval(() => {
        if (!running.current) return;
        Animated.sequence([
          Animated.timing(scaleCam, {
            toValue: base + bAmp,
            duration: Math.max(60, Math.floor((durMs ?? 240) / 2)),
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scaleCam, {
            toValue: base,
            stiffness: 120,
            damping: 14,
            mass: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }, Math.max(1500, everyMs));
    }
  }

  useEffect(() => {
    const c = cfg && cfg.enabled && !disabled ? cfg : undefined;
    if (!c) {
      stop();
      return;
    }
    start(c);
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cfg?.enabled,
    cfg?.base,
    cfg?.amp,
    cfg?.periodMs,
    cfg?.bursts?.everyMs,
    cfg?.bursts?.amp,
    cfg?.bursts?.durMs,
    cfg?.jitterPct,
    disabled,
  ]);

  return scaleCam; // Animated.Value (use in transform: [{ scale: scaleCam }])
}

/* ========= Scoring ========= */
export type RingName =
  | "MISS"
  | "INNER_BULL"
  | "OUTER_BULL"
  | "DOUBLE"
  | "TRIPLE"
  | "SINGLE";
export const SECTORS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];
export const R_INNER_BULL = 0.055;
export const R_OUTER_BULL = 0.12;
export const R_TRIPLE_INNER = 0.458;
export const R_TRIPLE_OUTER = 0.506;
export const R_DOUBLE_INNER = 0.71;
export const R_DOUBLE_OUTER = 0.78;
export const SECTOR_ROTATION_DEG = 0;

const CENTER_DX = 0;
const CENTER_DY = 0;
export function getScoringCenter() {
  return { x: BOARD_CENTER.x + CENTER_DX, y: BOARD_CENTER.y + CENTER_DY };
}

export function scoreAtPoint(px: number, py: number) {
  const C = getScoringCenter();
  const dx = px - C.x;
  const dy = py - C.y;
  const dist = Math.hypot(dx, dy);
  const r = dist / BOARD_RADIUS;

  if (r > R_DOUBLE_OUTER)
    return {
      score: 0,
      ring: "MISS" as const,
      sector: 0,
      r,
      angTop: 0,
      sectorIndex: -1,
    };

  if (r <= R_INNER_BULL)
    return {
      score: 50,
      ring: "INNER_BULL" as const,
      sector: 25,
      r,
      angTop: 0,
      sectorIndex: -1,
    };

  if (r <= R_OUTER_BULL)
    return {
      score: 25,
      ring: "OUTER_BULL" as const,
      sector: 25,
      r,
      angTop: 0,
      sectorIndex: -1,
    };

  // angle: 0 at top, clockwise
  const thetaDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  let angTopCW = (thetaDeg + 90) % 360;
  if (angTopCW < 0) angTopCW += 360;

  const sectorAngle = (angTopCW - SECTOR_ROTATION_DEG + 360) % 360;
  const sectorIndex = Math.round(sectorAngle / 18) % 20;
  const sectorVal = SECTORS[sectorIndex];

  if (r >= R_DOUBLE_INNER && r <= R_DOUBLE_OUTER)
    return {
      score: sectorVal * 2,
      ring: "DOUBLE" as const,
      sector: sectorVal,
      r,
      angTop: angTopCW,
      sectorIndex,
    };

  if (r >= R_TRIPLE_INNER && r <= R_TRIPLE_OUTER)
    return {
      score: sectorVal * 3,
      ring: "TRIPLE" as const,
      sector: sectorVal,
      r,
      angTop: angTopCW,
      sectorIndex,
    };

  return {
    score: sectorVal,
    ring: "SINGLE" as const,
    sector: sectorVal,
    r,
    angTop: angTopCW,
    sectorIndex,
  };
}

/* ========= Misc Types ========= */
export type DartRef = {
  x: number;
  y: number;
  angle: number;
  flying: boolean;
  stuck: boolean;
  z: number;
};
export type StuckPose = {
  left: number;
  top: number;
  angle: number;
  scale: number;
};
