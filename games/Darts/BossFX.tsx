// Components/BossFX.tsx — rainbow beams + donuts GIF + multi pop-ins (front-most, non-interactive)
import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

export type PopInSpec = {
  /** Master gate per item (also gated by BossFX.active) */
  visible?: boolean;
  /** Image source (require() or { uri }) */
  source: ImageSourcePropType;

  /** Where it slides in from */
  from?: "left" | "right" | "top" | "bottom";

  /** When visible, where should it sit? (like absolute style anchors) */
  anchor?: Partial<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;

  /** Box size in px (square) */
  size?: number;

  /** Extra spacing from edge when visible */
  margin?: number;

  /** Timings */
  delayMs?: number; // wait before sliding in
  showMs?: number; // stay visible before sliding back out
  inDurMs?: number; // slide-in duration
  outDurMs?: number; // slide-out duration

  /** Visual */
  opacity?: number;
  rotationDeg?: number; // small tilt if you want (optional)
  zIndex?: number; // stacking relative to others (rainbow/donuts use 10/20/30/40)
};

export type BossFXProps = {
  active?: boolean; // master gate — set true only on boss level

  // Rainbow beams
  rainbowVisible?: boolean;
  rainbowOpacity?: number;
  rainbowAngleDeg?: number;
  stripeWidth?: number;
  stripeGap?: number;
  rainbowSpeed?: number; // px/sec
  colors?: string[];
  rainbowOnTop?: boolean; // draw rainbow above donuts

  // Donuts GIF
  donutsVisible?: boolean;
  donutsOpacity?: number;

  // Pop-ins (SpongeBob + friends)
  popIns?: PopInSpec[];
};

const { width: W, height: H } = Dimensions.get("window");

/* ----------------------------- Reusable Pop-in ----------------------------- */
const PopInGif: React.FC<{
  active: boolean;
  spec: PopInSpec;
}> = ({ active, spec }) => {
  const {
    visible = true,
    source,
    from = "bottom",
    anchor = { left: 8, bottom: 8 },
    size = 170,
    margin = 8,
    delayMs = 3000,
    showMs = 5000,
    inDurMs = 1200,
    outDurMs = 1200,
    opacity = 1,
    rotationDeg = 0,
    zIndex = 40,
  } = spec;

  const on = active && visible;
  const trans = useRef(new Animated.Value(0)).current; // 0 visible; +d hidden

  // Compute hidden distance along the slide axis
  const hiddenDist =
    from === "left" || from === "right"
      ? size + margin + 24
      : size + margin + 24;

  useEffect(() => {
    if (!on) return;
    // Initialize in hidden state depending on direction
    trans.setValue(hiddenDist);
    const seq = Animated.sequence([
      Animated.delay(Math.max(0, delayMs)),
      Animated.timing(trans, {
        toValue: 0,
        duration: Math.max(80, inDurMs),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(Math.max(0, showMs)),
      Animated.timing(trans, {
        toValue: hiddenDist,
        duration: Math.max(80, outDurMs),
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    seq.start();
    return () => {
      // @ts-ignore – Animated.CompositeAnimation has stop()
      seq.stop && seq.stop();
    };
  }, [on, delayMs, showMs, inDurMs, outDurMs, hiddenDist, trans]);

  if (!on) return null;

  const transform =
    from === "left"
      ? [{ translateX: Animated.multiply(trans, -1) }]
      : from === "right"
      ? [{ translateX: trans }]
      : from === "top"
      ? [{ translateY: Animated.multiply(trans, -1) }]
      : [{ translateY: trans }]; // bottom

  const baseStyle = {
    position: "absolute" as const,
    width: size,
    height: size,
    opacity,
    zIndex,
    transform: [...transform, { rotate: `${rotationDeg}deg` }],
  };

  return (
    <Animated.View style={[baseStyle, anchor]}>
      <ExpoImage
        source={source}
        contentFit="contain"
        style={{ width: "100%", height: "100%" }}
      />
    </Animated.View>
  );
};

/* --------------------------------- Boss FX --------------------------------- */
const BossFX: React.FC<BossFXProps> = ({
  active = false,

  // rainbow
  rainbowVisible = false,
  rainbowOpacity = 0.7,
  rainbowAngleDeg = -18,
  stripeWidth = 72,
  stripeGap = 12,
  rainbowSpeed = 220,
  colors = [
    "#ff004c",
    "#ff7a00",
    "#ffd400",
    "#37ef00",
    "#00c6ff",
    "#0055ff",
    "#b100ff",
  ],
  rainbowOnTop = true,

  // donuts
  donutsVisible = false,
  donutsOpacity = 0.75,

  // pop-ins
  popIns = [],
}) => {
  const rainbowOn = !!(rainbowVisible && active);
  const donutsOn = !!(donutsVisible && active);
  const anyPopInOn = active && popIns.some((p) => p.visible !== false);
  const show = rainbowOn || donutsOn || anyPopInOn;

  // Always compute hooks (stable order)
  const period = useMemo(
    () => stripeWidth + stripeGap,
    [stripeWidth, stripeGap]
  );

  // Rainbow scroll driver
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!rainbowOn || rainbowSpeed <= 0) return;
    const duration = Math.max(120, (period / rainbowSpeed) * 1000);
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: period,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rainbowOn, rainbowSpeed, period, x]);

  // Non-hook calcs
  const diag = Math.sqrt(W * W + H * H);
  const size = Math.ceil(diag * 1.6);
  const left = (W - size) / 2;
  const top = (H - size) / 2;
  const needed = Math.ceil((size * 2) / period) + 6;
  const translateX: any = Animated.multiply(x, -1);

  const renderRainbow = () => {
    if (!rainbowOn) return null;
    return (
      <View
        style={[
          styles.abs,
          {
            left,
            top,
            width: size,
            height: size,
            opacity: rainbowOpacity,
            zIndex: rainbowOnTop ? 30 : 10,
          },
        ]}
      >
        <View
          style={{ flex: 1, transform: [{ rotate: `${rainbowAngleDeg}deg` }] }}
        >
          <Animated.View style={{ transform: [{ translateX }] }}>
            <View style={{ flexDirection: "row" }}>
              {Array.from({ length: needed }).map((_, i) => (
                <View
                  key={`stripe-${i}`}
                  style={{
                    width: stripeWidth,
                    height: size,
                    backgroundColor: colors[i % colors.length],
                    marginRight: stripeGap,
                  }}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      </View>
    );
  };

  if (!show) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Behind layer order: Rainbow then Donuts (unless rainbowOnTop) */}
      {!rainbowOnTop && renderRainbow()}

      {donutsOn && (
        <ExpoImage
          source={require("./assets/Boss/Donuts.gif")}
          contentFit="cover"
          style={[
            StyleSheet.absoluteFill,
            { opacity: donutsOpacity, zIndex: 20 },
          ]}
        />
      )}

      {rainbowOnTop && renderRainbow()}

      {/* Multi pop-ins */}
      {popIns.map((spec, idx) => (
        <PopInGif
          key={spec?.source ? `pop-${idx}` : `pop-${idx}`}
          active={active}
          spec={spec}
        />
      ))}
    </View>
  );
};

export default BossFX;

const styles = StyleSheet.create({
  abs: { position: "absolute" },
});
