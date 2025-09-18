// Components/Darts.tsx — Slim orchestrator. Heavy math/rendering moved out to gameCore/BoardStage/BossFX.
// Drag stability: input mapped with inverse(camera scale + rotation + translation) around BOARD_CENTER
// No freezing of effects; fully live wiggle + zoom pulse.

import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import {
  PanGestureHandler,
  PanGestureHandlerStateChangeEvent,
  PanGestureHandlerGestureEvent,
  State,
} from "react-native-gesture-handler";
import { Video, ResizeMode } from "expo-av";

// Core logic + hooks + constants
import {
  W,
  H,
  BOARD_CENTER,
  BOARD_RADIUS,
  POWER_HOLD_MS,
  BASE_FLIGHT_MS,
  FAST_FLIGHT_MS,
  Z_START_SCALE,
  Z_END_SCALE,
  AIM_OFFSET_X,
  clamp01,
  lerp,
  clampXToScreen,
  DEFAULT_TUNING,
  LEVEL_TUNING,
  Tuning,
  usePowerOscillator,
  useCameraWiggle,
  useScaleBursts,
  gridCellCenter,
  chooseGridCellTuned,
  scoreAtPoint,
  RingName,
  // Camera zoom pulse
  useCameraZoomPulse,
  LEVEL_CAMERA_ZOOM,
  CameraZoomConfig,
} from "./gameCore";

import BoardStage from "./BoardStage";
import BossFX from "./BossFX";

const CUTSCENE = require("./assets/DartsVid.mp4");
const HAND_L3 = require("./assets/alienHand.png");
const HAND_L3_TOP = require("./assets/alienHandTop.png");

const L3_HAND_OFFSET = { x: -20, y: -60 }; // tweak freely

/* ================================ SHARED ================================ */
type DartRef = {
  x: number;
  y: number;
  angle: number;
  flying: boolean;
  stuck: boolean;
  z: number;
};
type StuckPose = { left: number; top: number; angle: number; scale: number };

// Parent callback for final score
export type DartsProps = {
  onFinalScore?: (score: number) => void;
};

/* ================================ UI BITS ================================ */
const INITIAL_FINGER_X = W / 2;
const INITIAL_AIM_X = clampXToScreen(INITIAL_FINGER_X + AIM_OFFSET_X);
const GESTURE_Y = H - 120;

function PowerBar({ power, isAiming }: { power: number; isAiming: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: W * 0.1,
        right: W * 0.1,
        bottom: 40,
        height: 8,
        borderRadius: 6,
        backgroundColor: "rgba(255,255,255,0.15)",
        overflow: "hidden",
        zIndex: 3000, // above stage
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${Math.round(power * 100)}%`,
          backgroundColor: "#ffd166",
          opacity: isAiming ? 1 : 0.35,
        }}
      />
    </View>
  );
}

/* ========================== OUTER: SESSION WRAPPER ========================== */
/**
 * Darts: wraps a single playable session in a keyed <GameSession/>.
 * Bumping sessionKey forces a full remount—no stale Animated loops/listeners.
 */
export default function Darts({ onFinalScore }: DartsProps) {
  const [sessionKey, setSessionKey] = useState(0);
  return (
    <GameSession
      key={`session-${sessionKey}`}
      onFinalScore={onFinalScore}
      onRequestRestart={() => setSessionKey((k) => k + 1)}
    />
  );
}

/* ============================ INNER: GAME SESSION ============================ */
function GameSession({
  onFinalScore,
  onRequestRestart,
}: {
  onFinalScore?: (score: number) => void;
  onRequestRestart: () => void;
}) {
  const [isAiming, _setIsAiming] = useState(false);
  const isAimingRef = useRef(false);
  const setIsAiming = (v: boolean) => {
    isAimingRef.current = v;
    _setIsAiming(v);
  };

  const [fingerX, setFingerX] = useState(INITIAL_FINGER_X);
  const [aimX, setAimX] = useState(INITIAL_AIM_X);
  const [power, setPower] = useState(0);

  // world-space pivot for the hand so hand + dart move together
  const [handXWorld, setHandXWorld] = useState(W / 2);

  const [sessionScore, setSessionScore] = useState(0);
  const [turn, setTurn] = useState(1); // 1..4

  const [dartsInRack, setDartsInRack] = useState<number>(3);
  const [hasDartInHand, _setHasDartInHand] = useState<boolean>(false);
  const hasDartInHandRef = useRef(false);
  const setHasDartInHand = (v: boolean) => {
    hasDartInHandRef.current = v;
    _setHasDartInHand(v);
  };

  // Last hit toast
  const hitOpacity = useRef(new Animated.Value(0)).current;
  const hitTranslateY = useRef(new Animated.Value(12)).current;

  const [showCutscene, setShowCutscene] = useState(false);
  const [showLevelBanner, setShowLevelBanner] = useState(true);
  const levelOpacity = useRef(new Animated.Value(1)).current;
  const didShowIntroOnce = useRef(false);

  function useCutsceneOrComplete() {
    return showCutscene || turnComplete;
  }

  // Visual scale bursts (lv2+)
  const burstScale = useScaleBursts(turn >= 2 && !useCutsceneOrComplete());

  // Level tuning
  const T = useMemo<Tuning>(
    () => ({ ...DEFAULT_TUNING, ...(LEVEL_TUNING[turn] || {}) }),
    [turn]
  );

  // Power oscillator
  const holdMsRef = useRef<number>(T.POWER_HOLD_MS);
  useEffect(() => {
    holdMsRef.current = T.POWER_HOLD_MS;
  }, [T.POWER_HOLD_MS]);
  const powerOsc = usePowerOscillator(setPower, isAimingRef, holdMsRef);

  // Camera wiggle (we’ll also read its numeric tx/ty/angle if available)
  const wiggleRaw = useCameraWiggle(
    T,
    !useCutsceneOrComplete() && T.CAM_WIGGLE_PX > 0
  );

  // Normalize wiggle return shape
  let wiggleTransform: any[] = [];
  let wiggleAngleDegRef: React.MutableRefObject<number> | undefined;
  let wiggleTxRef: React.MutableRefObject<number> | undefined;
  let wiggleTyRef: React.MutableRefObject<number> | undefined;

  if (Array.isArray(wiggleRaw)) {
    wiggleTransform = wiggleRaw as any[];
  } else if (wiggleRaw && typeof wiggleRaw === "object") {
    if (Array.isArray((wiggleRaw as any).transform)) {
      wiggleTransform = (wiggleRaw as any).transform;
    }
    if ((wiggleRaw as any).angleRef)
      wiggleAngleDegRef = (wiggleRaw as any).angleRef;
    if ((wiggleRaw as any).txRef) wiggleTxRef = (wiggleRaw as any).txRef;
    if ((wiggleRaw as any).tyRef) wiggleTyRef = (wiggleRaw as any).tyRef;
  }

  // If refs aren’t provided, try to attach listeners to Animated.Values found in the transform
  const txLive = useRef(0);
  const tyLive = useRef(0);
  const angLiveDeg = useRef(0);

  useEffect(() => {
    const subs: Array<() => void> = [];
    const attach = (val: any, assign: (n: number) => void) => {
      if (val && typeof (val as any).addListener === "function") {
        const id = (val as any).addListener(({ value }: any) => {
          if (typeof value === "number") assign(value);
          else if (typeof value === "string" && value.endsWith("deg")) {
            const n = parseFloat(value);
            if (!Number.isNaN(n)) assign(n);
          }
        });
        subs.push(() => (val as any).removeListener?.(id));
      } else if (typeof val === "number") {
        assign(val);
      } else if (typeof val === "string" && val.endsWith("deg")) {
        const n = parseFloat(val);
        if (!Number.isNaN(n)) assign(n);
      }
    };

    (wiggleTransform || []).forEach((item) => {
      if (item && typeof item === "object") {
        if ("translateX" in item)
          attach(item.translateX, (n) => (txLive.current = n));
        if ("translateY" in item)
          attach(item.translateY, (n) => (tyLive.current = n));
        if ("rotate" in item)
          attach(item.rotate, (n) => (angLiveDeg.current = n));
      }
    });

    return () => {
      subs.forEach((fn) => fn());
    };
  }, [JSON.stringify(wiggleTransform)]);

  // ===== Level 3 overlay FX (dark pulses + rare white shocks) =====
  const l3Dark = useRef(new Animated.Value(0)).current; // 0..~0.5
  const l3Light = useRef(new Animated.Value(0)).current; // 0..~0.25
  const l3RunningRef = useRef(false);

  const l3Active = turn === 3 && !showCutscene && !turnComplete;

  useEffect(() => {
    l3RunningRef.current = l3Active;

    if (!l3Active) {
      // reset instantly when disabled
      l3Dark.stopAnimation();
      l3Light.stopAnimation();
      l3Dark.setValue(0);
      l3Light.setValue(0);
      return;
    }

    // Dark pulse loop
    const runDark = () => {
      if (!l3RunningRef.current) return;
      const peak = 0.15 + Math.random() * 0.35; // 0.15–0.50
      const up = 80 + Math.random() * 120;
      const hold = 40 + Math.random() * 160;
      const down = 180 + Math.random() * 260;
      const gap = 120 + Math.random() * 900;

      Animated.sequence([
        Animated.timing(l3Dark, {
          toValue: peak,
          duration: up,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(hold),
        Animated.timing(l3Dark, {
          toValue: 0.05,
          duration: down,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(gap),
      ]).start(({ finished }) => {
        if (finished && l3RunningRef.current) runDark();
      });
    };

    // Rare white shocks
    const runLight = () => {
      if (!l3RunningRef.current) return;
      const wait = 1200 + Math.random() * 2800;
      const peak = 0.08 + Math.random() * 0.18;
      const rise = 40 + Math.random() * 70;
      const fall = 90 + Math.random() * 140;

      Animated.sequence([
        Animated.delay(wait),
        Animated.timing(l3Light, {
          toValue: peak,
          duration: rise,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(l3Light, {
          toValue: 0,
          duration: fall,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && l3RunningRef.current) runLight();
      });
    };

    runDark();
    runLight();

    return () => {
      l3RunningRef.current = false;
      l3Dark.stopAnimation();
      l3Light.stopAnimation();
    };
  }, [l3Active, l3Dark, l3Light]);

  // ===== Camera Zoom Pulse (per level) =====
  const zoomCfg: CameraZoomConfig | undefined = LEVEL_CAMERA_ZOOM[turn];
  const scaleCam = useCameraZoomPulse(
    zoomCfg?.enabled ? zoomCfg : undefined,
    (!!zoomCfg?.stopOnLevelEnd && turn === 4 && turnComplete) ||
      useCutsceneOrComplete()
  );

  // Animated product used for rendering (camera transform)
  const combinedScaleAnimated =
    turn === 4 && turnComplete
      ? (new Animated.Value(1) as Animated.Value)
      : (Animated as any).multiply(burstScale as any, scaleCam as any);

  // ---- Track live numeric scale to unscale input (screen -> world) ----
  const burstNumRef = useRef(1);
  const zoomNumRef = useRef(1);

  useEffect(() => {
    const bId = (burstScale as any)?.addListener?.(({ value }: any) => {
      burstNumRef.current = typeof value === "number" ? value : 1;
    });
    const zId = (scaleCam as any)?.addListener?.(({ value }: any) => {
      zoomNumRef.current = typeof value === "number" ? value : 1;
    });
    try {
      burstNumRef.current = (burstScale as any)?._value ?? burstNumRef.current;
      zoomNumRef.current = (scaleCam as any)?._value ?? zoomNumRef.current;
    } catch {}
    return () => {
      if ((burstScale as any)?.removeListener && bId)
        (burstScale as any).removeListener(bId);
      if ((scaleCam as any)?.removeListener && zId)
        (scaleCam as any).removeListener(zId);
    };
  }, [burstScale, scaleCam]);

  // ===== Rotation/translation-aware screen<->world converters (anchored at board center) =====
  const deg2rad = (d: number) => (d * Math.PI) / 180;
  const identity = [
    { translateX: 0 },
    { translateY: 0 },
    { rotate: "0deg" },
    { scale: 1 },
  ] as const;

  const getScaleNow = () =>
    Math.max(0.0001, burstNumRef.current * zoomNumRef.current);

  const getAngleNowRad = () => {
    const deg = wiggleAngleDegRef?.current ?? angLiveDeg.current ?? 0;
    return deg2rad(deg || 0);
  };

  const getTransNow = () => {
    return {
      tx: (wiggleTxRef?.current ?? txLive.current ?? 0) as number,
      ty: (wiggleTyRef?.current ?? tyLive.current ?? 0) as number,
    };
  };

  const rotate = (x: number, y: number, theta: number) => {
    const c = Math.cos(theta),
      s = Math.sin(theta);
    return { x: c * x - s * y, y: s * x + c * y };
  };

  const screenToWorld = (sx: number, sy: number) => {
    const s = getScaleNow();
    const th = getAngleNowRad();
    const { tx, ty } = getTransNow();
    const ax = BOARD_CENTER.x;
    const ay = BOARD_CENTER.y;

    // camera forward: p' = translate(tx,ty) ∘ translate(ax,ay) ∘ rotate(th) ∘ scale(s) ∘ translate(-ax,-ay) (p)
    // invert that: translate(-tx,-ty) ∘ translate(-ax,-ay) ∘ rotate(-th) ∘ scale(1/s) ∘ translate(ax,ay)
    const dx1 = sx - tx - ax;
    const dy1 = sy - ty - ay;
    const unrot = rotate(dx1, dy1, -th);
    return { x: ax + unrot.x / s, y: ay + unrot.y / s };
  };

  const worldToScreen = (wx: number, wy: number) => {
    const s = getScaleNow();
    const th = getAngleNowRad();
    const { tx, ty } = getTransNow();
    const ax = BOARD_CENTER.x;
    const ay = BOARD_CENTER.y;

    const dx = (wx - ax) * s;
    const dy = (wy - ay) * s;
    const rot = rotate(dx, dy, th);
    return { x: ax + rot.x + tx, y: ay + rot.y + ty };
  };

  const screenToWorldXAtY = (sx: number, sy: number) => screenToWorld(sx, sy).x;
  const worldToScreenXAtY = (wx: number, wy: number) => worldToScreen(wx, wy).x;

  // Clamp a WORLD x by clamping its SCREEN projection at a given Y
  const clampWorldXByScreenAtY = (wx: number, wy: number) => {
    const sx = worldToScreenXAtY(wx, wy);
    const sxClamped = clampXToScreen(sx);
    return screenToWorldXAtY(sxClamped, wy);
  };

  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastRing, setLastRing] = useState<RingName | null>(null);
  const [lastSector, setLastSector] = useState<number | null>(null);
  const lastInfo = useRef<{
    angTop: number;
    r: number;
    sectorIndex: number;
  } | null>(null);

  const [dartsThisTurn, setDartsThisTurn] = useState<
    Array<{ score: number; ring: RingName; sector: number }>
  >([]);
  const [stuckDarts, setStuckDarts] = useState<StuckPose[]>([]);
  const [turnComplete, setTurnComplete] = useState(false);

  // Dart state
  const dart = useRef<DartRef>({
    x: INITIAL_AIM_X,
    y: GESTURE_Y,
    angle: -90,
    flying: false,
    stuck: false,
    z: 0,
  });
  const targetPx = useRef<{ x: number; y: number } | null>(null);
  const flightStart = useRef<number | null>(null);
  const flightDurMs = useRef<number>(BASE_FLIGHT_MS);
  const lastCell = useRef<{ gx: number; gy: number } | null>(null);
  const [, forceRender] = useState(0);
  const render = () => forceRender((n) => n + 1);
  const raf = useRef<number | null>(null);

  // Initialize handXWorld once we can invert the camera
  useEffect(() => {
    const initWX = screenToWorldXAtY(INITIAL_FINGER_X, GESTURE_Y);
    setHandXWorld(initWX);
  }, []);

  /* ===================== Level intro ===================== */
  useEffect(() => {
    levelOpacity.setValue(1);
    const hide = () => {
      didShowIntroOnce.current = true;
      setShowLevelBanner(false);
    };
    if (Platform.OS === "android") setTimeout(hide, 1400);
    else
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(levelOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(hide);
  }, []);

  useEffect(() => {
    if (!didShowIntroOnce.current) return;
    setShowLevelBanner(true);
    levelOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(levelOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(levelOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowLevelBanner(false));
  }, [turn]);

  /* ===================== Gesture ===================== */
  const onHandlerStateChange = (e: PanGestureHandlerStateChangeEvent) => {
    const { state, x, absoluteX } = (e as any).nativeEvent; // <-- FIXED
    const blocked =
      showLevelBanner ||
      showCutscene ||
      turnComplete ||
      dart.current.flying ||
      (dartsInRack <= 0 && !hasDartInHandRef.current);

    if (state === State.BEGAN && !blocked) {
      if (!hasDartInHandRef.current) {
        setHasDartInHand(true);
        setDartsInRack((n) => Math.max(0, n - 1));
      }
      const fingerRaw = absoluteX ?? x ?? INITIAL_FINGER_X;
      const fingerScreen = clampXToScreen(fingerRaw);

      setIsAiming(true);
      setFingerX(fingerScreen);

      const fingerWorldX = screenToWorldXAtY(fingerScreen, GESTURE_Y);
      const offsetWorld = AIM_OFFSET_X / getScaleNow();
      const candidateWorldX = fingerWorldX + offsetWorld;
      const axWorld = clampWorldXByScreenAtY(candidateWorldX, GESTURE_Y);

      // drive the hand from world space so hand+dart move together
      setHandXWorld(fingerWorldX);

      setAimX(axWorld);
      setPower(0);
      powerOsc.start();
      cancelAnim();
      dart.current = {
        x: axWorld,
        y: GESTURE_Y,
        angle: -90,
        flying: false,
        stuck: false,
        z: 0,
      };
      targetPx.current = null;
      render();
    } else if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      handleRelease();
    }
  };

  const onGestureEvent = (e: PanGestureHandlerGestureEvent) => {
    if (
      !isAimingRef.current ||
      turnComplete ||
      showCutscene ||
      showLevelBanner ||
      dart.current.flying
    )
      return;

    const { x, absoluteX } = (e as any).nativeEvent; // <-- ensure nativeEvent here too
    const fingerRaw = absoluteX ?? x ?? INITIAL_FINGER_X;
    const fingerScreen = clampXToScreen(fingerRaw);
    setFingerX(fingerScreen);

    const fingerWorldX = screenToWorldXAtY(fingerScreen, GESTURE_Y);
    const offsetWorld = AIM_OFFSET_X / getScaleNow();
    const candidateWorldX = fingerWorldX + offsetWorld;
    const axWorld = clampWorldXByScreenAtY(candidateWorldX, GESTURE_Y);

    // keep hand in world space while aiming
    setHandXWorld(fingerWorldX);

    setAimX(axWorld);
    dart.current.x = axWorld;
    dart.current.y = GESTURE_Y;
    render();
  };

  /* ===================== Throw / Flight ===================== */
  function handleRelease() {
    if (
      !isAimingRef.current ||
      turnComplete ||
      showCutscene ||
      showLevelBanner ||
      dart.current.flying
    )
      return;
    setIsAiming(false);
    powerOsc.stop();
    const { gx, gy } = chooseGridCellTuned(aimX, power, T);
    lastCell.current = { gx, gy };
    targetPx.current = gridCellCenter(gx, gy);
    flightDurMs.current = lerp(
      T.BASE_FLIGHT_MS ?? BASE_FLIGHT_MS,
      T.FAST_FLIGHT_MS ?? FAST_FLIGHT_MS,
      clamp01(power)
    );
    startLinearFlight();
  }

  function startLinearFlight() {
    flightStart.current = null;
    dart.current.flying = true;
    dart.current.stuck = false;
    dart.current.angle = -90;
    setHasDartInHand(false);
    render();
    raf.current = requestAnimationFrame(step);
  }
  function cancelAnim() {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }

  function spawnIdleDartNearHand() {
    const fingerWorldX = screenToWorldXAtY(fingerX, GESTURE_Y);
    const offsetWorld = AIM_OFFSET_X / getScaleNow();
    const axWorld = clampWorldXByScreenAtY(
      fingerWorldX + offsetWorld,
      GESTURE_Y
    );

    // keep the hand pivot in sync for the next dart
    setHandXWorld(fingerWorldX);

    setAimX(axWorld);
    dart.current = {
      x: axWorld,
      y: GESTURE_Y,
      angle: -90,
      flying: false,
      stuck: false,
      z: 0,
    };
  }

  function commitScore(score: number, ring: RingName, sector: number) {
    setSessionScore((s) => s + score);
    const willBeCount = dartsThisTurn.length + 1;
    setDartsThisTurn((prev) => [...prev, { score, ring, sector }]);
    if (willBeCount >= 3) setTurnComplete(true);
  }

  function animateHitToast() {
    hitOpacity.stopAnimation();
    hitTranslateY.stopAnimation();
    hitOpacity.setValue(0);
    hitTranslateY.setValue(12);
    Animated.parallel([
      Animated.timing(hitOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(hitTranslateY, {
        toValue: 0,
        duration: 160,
        easing: Easing.cubic,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(hitOpacity, {
          toValue: 0,
          delay: 900,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(hitTranslateY, {
          toValue: -10,
          delay: 900,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  function stickNow() {
    const frozen = poseFromState(
      dart.current.x,
      dart.current.y,
      dart.current.angle,
      1,
      false
    );
    setStuckDarts((prev) => [...prev, frozen]);
    const { score, ring, sector, angTop, r, sectorIndex } = scoreAtPoint(
      dart.current.x,
      dart.current.y
    );
    setLastScore(score);
    setLastRing(ring as RingName);
    setLastSector(sector);
    lastInfo.current = { angTop, r, sectorIndex };
    const willBeCount = dartsThisTurn.length + 1;
    commitScore(score, ring as RingName, sector);
    animateHitToast();
    dart.current.flying = false;
    if (willBeCount < 3) {
      spawnIdleDartNearHand();
    }
    render();
    cancelAnim();
  }

  function step(ts: number) {
    if (!targetPx.current) return cancelAnim();
    if (flightStart.current == null) flightStart.current = ts;
    const t0 = flightStart.current!;
    const dur = Math.max(60, flightDurMs.current);
    const raw = clamp01((ts - t0) / dur);
    const t = ease(raw, T.EASE_MODE ?? "easeOut");
    const sx = dart.current.x;
    const sy = dart.current.y;
    const { x: tx, y: ty } = targetPx.current!;
    const nx = lerp(sx, tx, t);
    const ny = lerp(sy, ty, t);
    const totalDist = Math.max(1, Math.hypot(tx - sx, ty - sy));
    const nowDist = Math.max(0, Math.hypot(tx - nx, ty - ny));
    const z = clamp01(1 - nowDist / totalDist);
    dart.current.x = nx;
    dart.current.y = ny;
    dart.current.z = z;
    render();
    if (t >= 1) {
      dart.current.x = tx;
      dart.current.y = ty;
      stickNow();
      return;
    }
    raf.current = requestAnimationFrame(step);
  }

  function ease(t: number, mode: "linear" | "easeOut" | "easeInOut") {
    switch (mode) {
      case "easeOut":
        return 1 - Math.pow(1 - t, 3);
      case "easeInOut":
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      default:
        return t;
    }
  }

  function poseFromState(
    x: number,
    y: number,
    angle: number,
    z: number,
    aimingNow: boolean
  ) {
    const scale = aimingNow
      ? Z_START_SCALE * (1 + (T.PULLBACK_MAX_SCALE ?? 0.35) * power)
      : lerp(Z_START_SCALE, Z_END_SCALE, z || 0);
    const left = x - 25;
    const top = y - 32;
    return { left, top, angle, scale } as StuckPose;
  }

  /* ===================== Turn flow ===================== */
  function advanceToNextTurn() {
    setDartsThisTurn([]);
    setStuckDarts([]);
    setTurnComplete(false);
    setShowCutscene(false);
    setDartsInRack(3);
    setHasDartInHand(false);
    setTurn((t) => Math.min(4, t + 1));
    spawnIdleDartNearHand();
    render();
  }

  // We *don't* manually reset everything for a new run.
  // Instead, request the outer wrapper to remount the whole session.
  function restartGame() {
    onRequestRestart();
  }

  function skipToBoss() {
    setTurn(4);
    setDartsThisTurn([]);
    setStuckDarts([]);
    setTurnComplete(false);
    setShowCutscene(false);
    setDartsInRack(3);
    setHasDartInHand(false);
    spawnIdleDartNearHand();
    render();
  }

  const scoreTopY = Math.max(10, BOARD_CENTER.y - BOARD_RADIUS - 36);
  const levelTitle = turn === 4 ? "BOSS LEVEL" : `Level ${turn}`;

  const ringLabel =
    lastRing === "TRIPLE"
      ? `TRIPLE ${lastSector ?? ""}`
      : lastRing === "DOUBLE"
      ? `DOUBLE ${lastSector ?? ""}`
      : lastRing === "INNER_BULL"
      ? "INNER BULL"
      : lastRing === "OUTER_BULL"
      ? "OUTER BULL"
      : lastRing === "MISS"
      ? "MISS"
      : `SINGLE ${lastSector ?? ""}`;

  const hitText = `${ringLabel}\n${lastScore} pts`;

  const handScale = isAiming ? 1 + (T.PULLBACK_MAX_SCALE ?? 0.35) * power : 1;

  // ===== Build anchored camera transform (applied inside BoardStage)
  const wiggleArr = Array.isArray(wiggleTransform)
    ? wiggleTransform
    : Array.isArray((wiggleTransform as any)?.transform)
    ? (wiggleTransform as any).transform
    : (identity as unknown as any[]);

  const cameraTransformForStage = useMemo(() => {
    const ax = BOARD_CENTER.x;
    const ay = BOARD_CENTER.y;

    if (turn === 4 && turnComplete) return identity as unknown as any[];

    return [
      { translateX: -ax },
      { translateY: -ay },
      ...wiggleArr, // rotation + translation kept
      { scale: combinedScaleAnimated as any },
      { translateX: ax },
      { translateY: ay },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wiggleArr, combinedScaleAnimated, turn, turnComplete]);

  // ==== FINAL SCORE EMIT (fires once when boss is over) ====
  const didEmitFinalRef = useRef(false);
  useEffect(() => {
    const bossOver = turn === 4 && turnComplete && !showCutscene;
    if (bossOver && !didEmitFinalRef.current) {
      didEmitFinalRef.current = true;
      onFinalScore?.(sessionScore);
    }
  }, [turn, turnComplete, showCutscene, sessionScore, onFinalScore]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.root}>
        {/* Input wrapper — NOT scaled (touch math stable); we invert camera for mapping */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          minDist={0}
          shouldCancelWhenOutside={false}
        >
          <View style={{ flex: 1 }}>
            {/* Board & actors with camera inside stage */}
            <BoardStage
              cameraTransform={cameraTransformForStage}
              power={power}
              isAiming={isAiming}
              handScale={handScale}
              handXWorld={handXWorld} // ✅ world-space pivot for hand
              dart={dart.current}
              stuckDarts={stuckDarts}
              dartsInRack={dartsInRack}
              turnComplete={turnComplete}
              showCutscene={showCutscene}
              handUnderSrc={turn === 3 ? HAND_L3 : undefined}
              handOverSrc={turn === 3 ? HAND_L3_TOP : undefined}
              handUnderOffset={turn === 3 ? L3_HAND_OFFSET : undefined}
              handOverOffset={turn === 3 ? L3_HAND_OFFSET : undefined}
            />
          </View>
        </PanGestureHandler>

        {/* Level 3 distortion overlay — over stage, under HUD */}
        {l3Active && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* Dark pulses */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "#000", opacity: l3Dark, zIndex: 1500 },
              ]}
            />
            {/* Rare white shocks */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "#fff", opacity: l3Light, zIndex: 1501 },
              ]}
            />
          </View>
        )}

        {/* Boss FX (rainbow + donuts + multi pop-ins) — FRONT-MOST */}
        <BossFX
          active={turn === 4 && !showCutscene && !turnComplete}
          rainbowVisible
          donutsVisible
          rainbowOnTop
          rainbowOpacity={0.3}
          donutsOpacity={0.75}
          stripeWidth={72}
          stripeGap={12}
          rainbowAngleDeg={-18}
          rainbowSpeed={220}
          popIns={[
            // SpongeBob (bottom-left)
            {
              visible: true,
              source: require("./assets/Boss/Spongebob.gif"),
              from: "bottom",
              anchor: { left: 8, bottom: -40 },
              size: 350,
              margin: 8,
              delayMs: 2500,
              showMs: 3500,
              zIndex: 44,
            },
            // Banana cheer
            {
              source: require("./assets/Boss/Banana.gif"),
              from: "right",
              anchor: { right: 12, top: 22 },
              size: 160,
              delayMs: 5000,
              showMs: 2000,
              rotationDeg: -6,
              zIndex: 45,
            },
            // DanceKid
            {
              source: require("./assets/Boss/DanceKid.gif"),
              from: "left",
              anchor: { left: 10, top: 250 },
              size: 170,
              delayMs: 8000,
              showMs: 4000,
              zIndex: 46,
            },
            // Squidward
            {
              source: require("./assets/Boss/Squidward.gif"),
              from: "right",
              anchor: { right: 12, top: 18 },
              size: 190,
              delayMs: 12000,
              showMs: 3200,
              zIndex: 47,
            },
            // Duck
            {
              source: require("./assets/Boss/Duck.gif"),
              from: "bottom",
              anchor: { left: 50, bottom: 46 },
              size: 200,
              delayMs: 11000,
              showMs: 4500,
              rotationDeg: 3,
              zIndex: 48,
            },
            // Homer — big finish
            {
              source: require("./assets/Boss/Homer.gif"),
              from: "right",
              anchor: { right: 50, top: 200 },
              size: 400,
              delayMs: 19000,
              showMs: 2000,
              zIndex: 49,
            },
          ]}
        />

        {/* UI overlays */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scoreTopY,
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          {!showCutscene && (
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "900",
                fontSize: 26,
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowRadius: 8,
              }}
            >
              Score: {sessionScore}
            </Text>
          )}
        </View>
        {isAiming && <PowerBar power={power} isAiming={isAiming} />}

        {/* skip to boss button (dev only) */}
        {/* {turn === 1 && !showCutscene && !turnComplete && !showLevelBanner && (
          <Pressable onPress={skipToBoss} style={styles.skipBoss}>
            <Text style={styles.skipBossText}>Skip to Boss</Text>
          </Pressable>
        )} */}

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: BOARD_CENTER.y + BOARD_RADIUS - 4,
            alignItems: "center",
            zIndex: 2000,
            opacity: hitOpacity,
            transform: [{ translateY: hitTranslateY }],
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "800",
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowRadius: 6,
              textAlign: "center",
            }}
          >
            {hitText}
          </Text>
        </Animated.View>

        {/* Level 1–3 end CTA (boss uses center overlay below) */}
        {turnComplete && !showCutscene && turn < 4 && (
          <View
            style={{
              position: "absolute",
              left: W * 0.1,
              right: W * 0.1,
              bottom: 40,
              alignItems: "center",
            }}
          >
            <Pressable onPress={() => setShowCutscene(true)} style={styles.cta}>
              <Text style={styles.ctaText}>Next Level</Text>
            </Pressable>
          </View>
        )}

        {/* Boss end overlay — centered final score + message + Start Again */}
        {turn === 4 && turnComplete && !showCutscene && (
          <View style={styles.bossEndOverlay}>
            <View style={styles.bossEndScoreBg}>
              <Text style={styles.bossEndScore}>
                Final Score: {sessionScore}
              </Text>
              <Text style={styles.bossEndSub}>
                Good job!{"\n"}You're not driving home tonight...
              </Text>
            </View>
            <Pressable
              onPress={restartGame}
              style={[styles.cta, { marginTop: 18 }]}
            >
              <Text style={styles.ctaText}>Start Again</Text>
            </Pressable>
          </View>
        )}

        {showCutscene && (
          <View style={styles.videoOverlay}>
            <Video
              source={CUTSCENE}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping={false}
              onPlaybackStatusUpdate={(s) => {
                if ((s as any).isLoaded && (s as any).didJustFinish)
                  advanceToNextTurn();
                else if (!(s as any).isLoaded && (s as any).error) {
                  console.warn("Video error:", (s as any).error);
                  advanceToNextTurn();
                }
              }}
            />
          </View>
        )}

        {showLevelBanner && !showCutscene && (
          <Animated.View
            pointerEvents="auto"
            style={[styles.levelOverlay, { opacity: levelOpacity }]}
          >
            <Text style={styles.levelText}>{levelTitle}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/* ================================== STYLES ================================== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  videoOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  video: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  levelOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 3000,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    elevation: 1000,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 8,
  },
  cta: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#ffd256ff",
    borderWidth: 1,
    borderColor: "rgba(84, 41, 6, 0.46)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaText: { color: "#001421", fontWeight: "900", fontSize: 18 },
  skipBoss: {
    position: "absolute",
    right: 16,
    top: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#a044ff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    zIndex: 5000,
  },
  skipBossText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.3,
  },

  // Boss end overlay styles
  bossEndOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 5000,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  bossEndScoreBg: {
    backgroundColor: "rgba(0,0,0,0.5)", // 50% black behind final score text
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 8,
  },
  bossEndScore: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 8,
    textAlign: "center",
  },
  bossEndSub: {
    color: "#ffd3e6",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 6,
    marginBottom: 6,
    lineHeight: 24,
  },
});
