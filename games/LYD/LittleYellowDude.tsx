// LittleYellowDude.tsx — Skia — D-pad + knives + fastest-marriage timer + scalable game & bg
// - D-pad controls (tap/hold to steer), styled yellow with centered big arrows.
// - Enemies can't use portals; player can.
// - Timer centered (goal: marry fastest); win overlay shows time; restart on win/lose.
// - Knives: 4 pickups. On pickup, knife attaches, kills enemies, lasts 5s + flashes 2s.
// - Knife rotation is IN-PLACE via KNIFE_ORIENT_DEGREES.
// - Background image with scale/offset knobs.
// - Whole game (maze + sprites) scalable via GAME_SCALE and SHIFT.
// - Ready? -> Go! intro; gameplay & timer start on "Go!" end.
// - Exposes onFinish(seconds, formatted, result) via props when run ends.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
} from "react-native";
import {
  Canvas,
  Group,
  Rect,
  Circle,
  BlurMask,
  Skia,
  Path,
  CornerPathEffect,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";

/** Left half (mirrored per row). Row 9 fix kept (last '0' removed). */
export const LEFT_HALF_ROWS_RAW: string[] = [
  "0000000000xx",
  "011111111000",
  "010010001111",
  "010010000010",
  "010011111110",
  "011110000010",
  "001000000010",
  "x01111111110",
  "x01000000010",
  "001011110010",
  "011010010010",
  "010011111111",
  "010000000000",
  "011111011111",
  "000001010000",
  "000001110000",
  "011111011110",
  "010000000010",
  "011101111010",
  "010101001010",
  "010111011010",
  "010001010010",
  "01111101111x",
  "00000000000x",
];
const mirrorRow = (left: string) => {
  const n = left.replace(/X/g, "x");
  return n + n.split("").reverse().join("");
};

const DESIGN_WIDTH = 360; // S24 logical width you logged
const DESIGN_HEIGHT = 703; // S24 logical height you logged

const UI_CONFIG = { MAZE_Y_OFFSET: -68 };

/* ==== global background size/position controls ==== */
const BG_SCALE = 1.28; // 1 = fit; >1 bigger
const BG_SHIFT_X = 0; // px
const BG_SHIFT_Y = 48; // px

/* ==== global game size/position controls ==== */
const GAME_SCALE = 0.85; // 1 = fit screen; <1 smaller; >1 larger (may crop)
const GAME_SHIFT_X = 0; // px shift after centering
const GAME_SHIFT_Y = 30; // px shift after centering

/* ===================== TYPES + DIRS ===================== */
type Edge = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  dx: number;
  dy: number;
  id: string;
};
type Dir = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };
const DIRS = {
  Up: { dx: 0, dy: -1 } as Dir,
  Down: { dx: 0, dy: 1 } as Dir,
  Left: { dx: -1, dy: 0 } as Dir,
  Right: { dx: 1, dy: 0 } as Dir,
};
const isOpposite = (a: Dir, b: Dir) => a.dx === -b.dx && a.dy === -b.dy;

/* ===================== QUEST ITEMS ===================== */
type ItemDef = { id: string; src: any; size?: number };
const ITEMS: ItemDef[] = [
  { id: "ROSES", src: require("./lyd/ROSES.png"), size: 1.8 },
  {
    id: "GIRLY_FRIENDSTON",
    src: require("./lyd/GIRLY_FRIENDSTON.png"),
    size: 2.8,
  },
  { id: "DATE", src: require("./lyd/DATE.png"), size: 2.3 },
  { id: "RING", src: require("./lyd/RING.png"), size: 1.8 },
  { id: "WEDDING", src: require("./lyd/WEDDING.png"), size: 2.5 },
];

/* ===================== PORTALS ===================== */
type PortalEndpoint = { r: number; c: number; color: string };
type PortalPair = { a: PortalEndpoint; b: PortalEndpoint };
const PORTALS: PortalPair[] = [
  {
    a: { r: 16, c: 10, color: "#a855f7" },
    b: { r: 9, c: 7, color: "#a855f7" },
  },
  {
    a: { r: 16, c: 13, color: "#22c55e" },
    b: { r: 9, c: 16, color: "#22c55e" },
  },
];

/* ===================== PROPS ===================== */
type LittleYellowDudeProps = {
  /** Called once when the run ends (win or lose). */
  onFinish?: (
    seconds: number,
    formatted: string,
    result: "win" | "lose"
  ) => void;
};

export default function LittleYellowDude({ onFinish }: LittleYellowDudeProps) {
  // keep onFinish fresh for async callbacks
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Grid & sizing
  const FULL = useMemo(() => LEFT_HALF_ROWS_RAW.map(mirrorRow), []);
  const rows = FULL.length;
  const cols = FULL.reduce((m, r) => Math.max(m, r.length), 0);

  // We still know the real device, but we don't use it for layout,
  // only for the outer background / centering if you ever want it.
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  // === use the fixed S24 design size for all layout numbers ===
  const width = DESIGN_WIDTH;
  const height = DESIGN_HEIGHT;

  const BASE_MARGIN = 16;
  const BASE_CELL = Math.max(
    10,
    Math.min(
      Math.floor((width - BASE_MARGIN * 2) / cols),
      Math.floor((height - BASE_MARGIN * 2) / rows)
    )
  );

  const CELL_BASE = Math.min(width / cols, height / rows);
  const CELL = CELL_BASE * GAME_SCALE; // scale the whole game
  const STAGE_W = cols * CELL;
  const STAGE_H = rows * CELL;
  const PADX = (width - STAGE_W) / 2 + GAME_SHIFT_X;
  const PADY = (height - STAGE_H) / 2 + GAME_SHIFT_Y;

  // Inventory thumbs
  const INV_ITEM_SIZE = Math.max(24, CELL * 0.9) * 1.5;
  const INV_GAP = Math.max(4, CELL * 0.15) - 10;
  const INV_X0 = PADX + 8;
  const INV_Y_BASE = Math.max(
    8,
    PADY + UI_CONFIG.MAZE_Y_OFFSET - INV_ITEM_SIZE - 8
  );

  // Walls
  const WALL_FILL = "#051433ff";
  const CORE_COLOR = "#8ecaff",
    MID_COLOR = "rgba(142,202,255,0.45)",
    OUTER_COLOR = "rgba(70,150,255,0.28)";
  const WALL = {
    core: 0.04,
    mid: 0.08,
    outer: 0.14,
    midBlur: 0.16,
    outerBlur: 0.36,
  } as const;
  const CORE_W = Math.max(0.5, CELL * WALL.core);
  const MID_W = Math.max(CORE_W + 0.5, CELL * WALL.mid);
  const OUTER_W = Math.max(MID_W + 0.5, CELL * WALL.outer);
  const MID_BLUR = CELL * WALL.midBlur,
    OUTER_BLUR = CELL * WALL.outerBlur;
  const CORNER_R = 20;

  const wallAt = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && FULL[r][c] === "0";
  const walkableAt = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && FULL[r][c] !== "0";

  // Outline paths
  type EdgeMap = Map<string, Edge[]>;
  const edges = useMemo(() => {
    const list: Edge[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (!wallAt(r, c)) continue;
        if (!wallAt(r - 1, c))
          list.push({
            x0: c + 1,
            y0: r,
            x1: c,
            y1: r,
            dx: -1,
            dy: 0,
            id: `${c + 1},${r}->${c},${r}`,
          });
        if (!wallAt(r, c + 1))
          list.push({
            x0: c + 1,
            y0: r + 1,
            x1: c + 1,
            y1: r,
            dx: 0,
            dy: -1,
            id: `${c + 1},${r + 1}->${c + 1},${r}`,
          });
        if (!wallAt(r + 1, c))
          list.push({
            x0: c,
            y0: r + 1,
            x1: c + 1,
            y1: r + 1,
            dx: 1,
            dy: 0,
            id: `${c},${r + 1}->${c + 1},${r + 1}`,
          });
        if (!wallAt(r, c - 1))
          list.push({
            x0: c,
            y0: r,
            x1: c,
            y1: r + 1,
            dx: 0,
            dy: 1,
            id: `${c},${r}->${c},${r + 1}`,
          });
      }
    return list;
  }, [rows, cols, FULL]);

  const wallPaths = useMemo(() => {
    const startMap: EdgeMap = new Map();
    edges.forEach((e) => {
      const k = `${e.x0},${e.y0}`;
      const arr = startMap.get(k) ?? [];
      arr.push(e);
      startMap.set(k, arr);
    });
    const rotL = (dx: number, dy: number) => ({ dx: dy, dy: -dx });
    const rotR = (dx: number, dy: number) => ({ dx: -dy, dy: dx });
    const visited = new Set<string>(),
      out: any[] = [];
    for (const e0 of edges) {
      if (visited.has(e0.id)) continue;
      const p = Skia.Path.Make();
      let start = { x: e0.x0, y: e0.y0 },
        dir = { dx: e0.dx, dy: e0.dy },
        cur = e0;
      p.moveTo(start.x * CELL, start.y * CELL);
      p.lineTo(cur.x1 * CELL, cur.y1 * CELL);
      visited.add(cur.id);
      const startKey = `${start.x},${start.y}`;
      let curEndKey = `${cur.x1},${cur.y1}`,
        guard = 0;
      while (guard++ < edges.length * 6) {
        if (curEndKey === startKey) break;
        const candidates = (startMap.get(curEndKey) || []).filter(
          (ed) => !visited.has(ed.id)
        );
        if (!candidates.length) break;
        const left = rotL(dir.dx, dir.dy),
          straight = dir,
          right = rotR(dir.dx, dir.dy);
        const pick = (dx: number, dy: number) =>
          candidates.find((ed) => ed.dx === dx && ed.dy === dy);
        const next =
          pick(left.dx, left.dy) ||
          pick(straight.dx, straight.dy) ||
          pick(right.dx, right.dy) ||
          null;
        if (!next) break;
        p.lineTo(next.x1 * CELL, next.y1 * CELL);
        visited.add(next.id);
        dir = { dx: next.dx, dy: next.dy };
        cur = next;
        curEndKey = `${cur.x1},${cur.y1}`;
      }
      p.close();
      out.push(p);
    }
    return out;
  }, [edges, CELL]);

  // Portals (player-only)
  const portalMap = useMemo(() => {
    const m = new Map<
      string,
      { to: { r: number; c: number }; color: string }
    >();
    for (const p of PORTALS) {
      m.set(`${p.a.r}:${p.a.c}`, {
        to: { r: p.b.r, c: p.b.c },
        color: p.a.color,
      });
      m.set(`${p.b.r}:${p.b.c}`, {
        to: { r: p.a.r, c: p.a.c },
        color: p.b.color,
      });
    }
    return m;
  }, []);

  /* ===================== LYD (player) ===================== */
  const spawn = useMemo(() => {
    for (let r = 1; r < rows - 1; r++)
      for (let c = 1; c < cols - 1; c++) if (walkableAt(r, c)) return { r, c };
    return { r: 1, c: 1 };
  }, [rows, cols, FULL]);

  const desiredDirRef = useRef<Dir>(DIRS.Right);
  const dirRef = useRef<Dir>({ dx: 0, dy: 0 });
  const cellRef = useRef({ r: spawn.r, c: spawn.c });
  const targetRef = useRef<{ r: number; c: number } | null>(null);
  const posRef = useRef({
    x: spawn.c * CELL + CELL / 2,
    y: spawn.r * CELL + CELL / 2,
  });
  const headingRef = useRef(0);
  const [tick, setTick] = useState(0);

  // Movement speeds follow game scale
  const SPEED_PX_PER_S = CELL * 5.5;

  // Sprite (2-frame)
  const LYD_SIZE = Math.max(28, CELL * 1.6);
  const LYD_COLLISION_R = LYD_SIZE * 0.35;
  const WALK_FPS = 7,
    WALK_PERIOD = 1 / WALK_FPS;
  const lydStand = useImage(require("./lyd/LITTLE_YELLOW_GUY_STAND.png"));
  const lydWalk = useImage(require("./lyd/LITTLE_YELLOW_GUY_WALK.png"));
  const curFrameRef = useRef<"stand" | "walk">("stand");
  const walkAccRef = useRef(0);

  const centerOf = (r: number, c: number) => ({
    x: c * CELL + CELL / 2,
    y: r * CELL + CELL / 2,
  });
  const angleFor = (d: Dir) =>
    d.dx === 1
      ? 0
      : d.dx === -1
      ? Math.PI
      : d.dy === -1
      ? -Math.PI / 2
      : d.dy === 1
      ? Math.PI / 2
      : headingRef.current;
  const canMove = (r: number, c: number, d: Dir) =>
    walkableAt(r + d.dy, c + d.dx);

  // Quest item spawn overrides
  const ITEM_SPAWN_BY_ID: Partial<Record<string, { r: number; c: number }>> = {
    ROSES: { r: 1, c: cols - 2 },
    GIRLY_FRIENDSTON: { r: 22, c: 1 },
    DATE: { r: 11, c: 12 },
    RING: { r: 22, c: 22 },
    WEDDING: { r: 13, c: 12 },
  };

  const setDesired = (d: Dir) => {
    if (isOpposite(dirRef.current, d)) {
      const { r, c } = cellRef.current;
      if (canMove(r, c, d)) {
        dirRef.current = d;
        headingRef.current = angleFor(d);
        targetRef.current = { r: r + d.dy, c: c + d.dx };
      }
    }
    desiredDirRef.current = d;
  };

  useEffect(() => {
    const { r, c } = cellRef.current;
    const order = [
      desiredDirRef.current,
      DIRS.Right,
      DIRS.Left,
      DIRS.Down,
      DIRS.Up,
    ];
    for (const d of order)
      if (canMove(r, c, d)) {
        dirRef.current = d;
        headingRef.current = angleFor(d);
        targetRef.current = { r: r + d.dy, c: c + d.dx };
        break;
      }
  }, [CELL]);

  /* ===================== QUEST ITEMS (queue) ===================== */
  const [itemIndex, setItemIndex] = useState(0);
  const curItem: ItemDef | null = ITEMS[itemIndex] ?? null;
  const [itemPos, setItemPos] = useState<{ r: number; c: number } | null>(null);
  const itemPosRef = useRef<{ r: number; c: number } | null>(null);
  useEffect(() => {
    itemPosRef.current = itemPos;
  }, [itemPos]);

  const itemImages = ITEMS.map((it) => useImage(it.src));
  const currentItemImage = curItem ? itemImages[itemIndex] : null;
  const itemPixelSize = (it: ItemDef | null) =>
    Math.max(12, (it?.size ?? 1.8) * CELL);

  useEffect(() => {
    if (!curItem) {
      setItemPos(null);
      return;
    }
    let pos: { r: number; c: number } | null = null;
    const o = ITEM_SPAWN_BY_ID[curItem.id];
    if (o && walkableAt(o.r, o.c)) pos = o;
    else {
      outer: for (let r = 0; r < rows; r++)
        for (let c = cols - 1; c >= 0; c--)
          if (walkableAt(r, c)) {
            pos = { r, c };
            break outer;
          }
      if (!pos) pos = { r: 1, c: cols - 2 };
    }
    setItemPos(pos);
  }, [curItem, rows, cols, FULL]);

  const collectedCount = Math.min(itemIndex, ITEMS.length);

  /* ===================== ENEMIES ===================== */
  type EnemyBehavior = "chase" | "random";
  type EnemyDef = {
    id: string;
    src: any;
    size?: number;
    behavior?: EnemyBehavior;
    speedMult?: number;
  };
  const ENEMIES: EnemyDef[] = [
    {
      id: "CABBAGE",
      src: require("./lyd/enemies/CABBAGE.png"),
      size: 1.8,
      behavior: "random",
      speedMult: 1.0,
    },
    {
      id: "CARROT",
      src: require("./lyd/enemies/CARROT.png"),
      size: 2,
      behavior: "random",
      speedMult: 1.3,
    },
    {
      id: "CUCUMBER",
      src: require("./lyd/enemies/CUCUMBER.png"),
      size: 1.8,
      behavior: "chase",
      speedMult: 1.2,
    },
    {
      id: "EGGPLANT",
      src: require("./lyd/enemies/EGGPLANT.png"),
      size: 2,
      behavior: "random",
      speedMult: 0.95,
    },
    {
      id: "ONION",
      src: require("./lyd/enemies/ONION.png"),
      size: 1.9,
      behavior: "chase",
      speedMult: 1.3,
    },
    {
      id: "PEPPER",
      src: require("./lyd/enemies/PEPPER.png"),
      size: 1.6,
      behavior: "chase",
      speedMult: 1.0,
    },
    {
      id: "PUMPKIN",
      src: require("./lyd/enemies/PUMPKIN.png"),
      size: 1.9,
      behavior: "random",
      speedMult: 1.1,
    },
    {
      id: "TOMATO",
      src: require("./lyd/enemies/TOMATO.png"),
      size: 1.2,
      behavior: "random",
      speedMult: 1.0,
    },
  ];
  const ENEMY_SPAWN_POINTS = [
    { r: 23, c: 11 },
    { r: 23, c: 12 },
  ];
  const ENEMY_SPAWN_EVERY_MS = 6000;

  // Enemy speed follows game scale
  const ENEMY_BASE_SPEED = CELL * 3.6;

  const enemyImages = ENEMIES.map((e) => useImage(e.src));
  const enemyPixelSize = (e: EnemyDef) => Math.max(12, (e.size ?? 1.6) * CELL);
  const enemyCollisionRadius = (e: EnemyDef) => (enemyPixelSize(e) / 2) * 0.8;

  const enemyOrder = useMemo(() => {
    const a = ENEMIES.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);
  type ActiveEnemy = {
    idx: number;
    r: number;
    c: number;
    dir: Dir;
    target: { r: number; c: number } | null;
    x: number;
    y: number;
    speed: number;
    behavior: EnemyBehavior;
  };
  const activeEnemiesRef = useRef<ActiveEnemy[]>([]);
  const nextSpawnIndexRef = useRef(0);
  const spawnPointCursorRef = useRef(0);
  const enemySpawnAccumRef = useRef(0);

  const trySpawnEnemy = () => {
    if (nextSpawnIndexRef.current >= enemyOrder.length) return;
    const sp =
      ENEMY_SPAWN_POINTS[
        spawnPointCursorRef.current % ENEMY_SPAWN_POINTS.length
      ];
    spawnPointCursorRef.current++;
    let { r, c } = sp;
    if (!walkableAt(r, c)) {
      let found: null | { r: number; c: number } = null;
      for (let rad = 1; rad <= 3 && !found; rad++) {
        for (let dr = -rad; dr <= rad; dr++)
          for (let dc = -rad; dc <= rad; dc++) {
            const rr = r + dr,
              cc = c + dc;
            if (walkableAt(rr, cc)) {
              found = { r: rr, c: cc };
              break;
            }
          }
      }
      if (found) {
        r = found.r;
        c = found.c;
      }
    }
    const idx = enemyOrder[nextSpawnIndexRef.current++],
      def = ENEMIES[idx],
      ctr = centerOf(r, c);
    activeEnemiesRef.current.push({
      idx,
      r,
      c,
      dir: { dx: 0, dy: 0 },
      target: null,
      x: ctr.x,
      y: ctr.y,
      speed: ENEMY_BASE_SPEED * (def.speedMult ?? 1),
      behavior: def.behavior ?? "random",
    });
  };

  /* ===================== GAME STATE & TIMER ===================== */
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  // Intro phase: 'ready' -> 'go' -> 'play'
  type Phase = "ready" | "go" | "play";
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const gameOverRef = useRef(false);
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);
  const wonRef = useRef(false);
  useEffect(() => {
    wonRef.current = won;
  }, [won]);

  const [elapsed, setElapsed] = useState(0);
  const formatTime = (s: number) => {
    const ms = Math.max(0, Math.floor(s * 1000));
    const m = Math.floor(ms / 60000),
      sec = Math.floor((ms % 60000) / 1000),
      t = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${t}`;
  };

  // Report final time exactly once
  const reportedRef = useRef(false);
  useEffect(() => {
    if (!reportedRef.current && (won || gameOver)) {
      reportedRef.current = true;
      const result: "win" | "lose" = won ? "win" : "lose";
      onFinishRef.current?.(elapsed, formatTime(elapsed), result);
    }
  }, [won, gameOver, elapsed]);

  /* ===================== KNIVES ===================== */
  const KNIFE_IMG = useImage(require("./lyd/KNIFE.png"));
  const KNIFE_SIZE = Math.max(24, CELL * 1.4);
  const KNIFE_OFFSET = LYD_SIZE * 0.7; // center-to-center
  const KNIFE_KILL_RADIUS = Math.max(CELL * 0.55, KNIFE_SIZE * 0.45);
  const KNIFE_ALIVE_MS = 5000;
  const KNIFE_FLASH_MS = 2000;
  const KNIFE_FLASH_PERIOD_MS = 120;

  // Fixed extra rotation (degrees) for the knife sprite (in-place).
  const KNIFE_ORIENT_DEGREES = 225;
  const deg2rad = (d: number) => (d * Math.PI) / 180;

  // Knife spawns (edit freely)
  const KNIFE_SPAWNS = useMemo(
    () => [
      { r: 11, c: 4 },
      { r: 13, c: cols - 2 },
      { r: rows - 4, c: 3 },
      { r: rows - 4, c: cols - 4 },
    ],
    [rows, cols]
  );

  const [knifePickups, setKnifePickups] = useState<boolean[]>([
    true,
    true,
    true,
    true,
  ]);
  type ActiveKnife = { startMs: number };
  const activeKnifeRef = useRef<ActiveKnife | null>(null);

  // Helper: spawn tile for given quest item (used on restart)
  const computeSpawnForItem = (
    it: ItemDef | null
  ): { r: number; c: number } | null => {
    if (!it) return null;
    const o = ITEM_SPAWN_BY_ID[it.id];
    if (o && walkableAt(o.r, o.c)) return o;
    for (let r = 0; r < rows; r++)
      for (let c = cols - 1; c >= 0; c--) if (walkableAt(r, c)) return { r, c };
    return { r: 1, c: cols - 2 };
  };

  // Intro timers
  const introTimersRef = useRef<number[]>([]);
  const clearIntroTimers = () => {
    introTimersRef.current.forEach((t) => clearTimeout(t));
    introTimersRef.current = [];
  };
  const beginIntro = () => {
    clearIntroTimers();
    setPhase("ready");
    // short Ready -> Go -> Play
    introTimersRef.current.push(
      setTimeout(() => setPhase("go"), 2000) as unknown as number
    );
    introTimersRef.current.push(
      setTimeout(() => setPhase("play"), 2500) as unknown as number
    );
  };

  useEffect(() => {
    beginIntro();
    return () => clearIntroTimers();
  }, []);

  // Restart
  const restartGame = () => {
    desiredDirRef.current = DIRS.Right;
    dirRef.current = { dx: 0, dy: 0 };
    cellRef.current = { r: spawn.r, c: spawn.c };
    posRef.current = centerOf(spawn.r, spawn.c);
    targetRef.current = null;
    headingRef.current = 0;

    // Reset quest items + spawn first one now (ROSES)
    setItemIndex(0);
    setItemPos(computeSpawnForItem(ITEMS[0]));

    activeEnemiesRef.current = [];
    nextSpawnIndexRef.current = 0;
    spawnPointCursorRef.current = 0;
    enemySpawnAccumRef.current = 0;

    setGameOver(false);
    setWon(false);
    setElapsed(0);

    activeKnifeRef.current = null;
    setKnifePickups([true, true, true, true]);

    walkAccRef.current = 0;
    curFrameRef.current = "stand";

    // allow reporting again for the new run
    reportedRef.current = false;

    beginIntro();
  };

  /* ===================== LOOP ===================== */
  const lydLastWarpTimeRef = useRef(0);
  const chooseEnemyNextDir = (
    r: number,
    c: number,
    keep: Dir,
    behavior: "chase" | "random"
  ): Dir => {
    const options: Dir[] = [DIRS.Up, DIRS.Left, DIRS.Down, DIRS.Right].filter(
      (d) => canMove(r, c, d)
    );
    if (!options.length) return { dx: 0, dy: 0 };
    const nonRev = options.filter((d) => !isOpposite(keep, d));
    const cand = nonRev.length ? nonRev : options;
    if (behavior === "random")
      return cand[Math.floor(Math.random() * cand.length)];
    const pr = cellRef.current.r,
      pc = cellRef.current.c;
    let best = cand[0],
      score = Infinity;
    for (const d of cand) {
      const rr = r + d.dy,
        cc = c + d.dx;
      const s = (rr - pr) * (rr - pr) + (cc - pc) * (cc - pc);
      if (s < score) {
        score = s;
        best = d;
      }
    }
    return best;
  };

  useEffect(() => {
    let mounted = true,
      last = performance.now(),
      raf = 0;
    const loop = () => {
      if (!mounted) return;
      const now = performance.now(),
        dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const frozen =
        gameOverRef.current || wonRef.current || phaseRef.current !== "play";

      if (!frozen) {
        setElapsed((t) => t + dt);
        // enemy timed spawns
        enemySpawnAccumRef.current += dt;
        if (enemySpawnAccumRef.current * 1000 >= ENEMY_SPAWN_EVERY_MS) {
          enemySpawnAccumRef.current -= ENEMY_SPAWN_EVERY_MS / 1000;
          trySpawnEnemy();
        }
      }

      // Player movement
      if (!frozen) {
        let leftover = SPEED_PX_PER_S * dt;
        while (leftover > 0) {
          const d = dirRef.current;
          if ((d.dx === 0 && d.dy === 0) || !targetRef.current) {
            const { r, c } = cellRef.current,
              desired = desiredDirRef.current;
            if (canMove(r, c, desired)) {
              dirRef.current = desired;
              headingRef.current = angleFor(desired);
              targetRef.current = { r: r + desired.dy, c: c + desired.dx };
            } else break;
          }
          let { r: tr, c: tc } = targetRef.current!,
            { x: tx, y: ty } = centerOf(tr, tc);
          const dx = tx - posRef.current.x,
            dy = ty - posRef.current.y,
            dist = Math.hypot(dx, dy);

          if (dist <= 1e-4) {
            // Arrived at tile center
            cellRef.current = { r: tr, c: tc };

            // Item pickup
            const ip = itemPosRef.current;
            if (ip && ip.r === tr && ip.c === tc) {
              const pickedIsWedding = curItem?.id === "WEDDING";
              setItemPos(null);
              setItemIndex((i) => i + 1);
              if (pickedIsWedding) setWon(true);
            }

            // Knife pickups
            KNIFE_SPAWNS.forEach((k, idx) => {
              if (!knifePickups[idx]) return;
              if (k.r === tr && k.c === tc) {
                activeKnifeRef.current = { startMs: now };
                setKnifePickups((arr) =>
                  arr.map((v, i) => (i === idx ? false : v))
                );
              }
            });

            // Portal (player only)
            const portal = portalMap.get(`${tr}:${tc}`);
            if (portal && now - lydLastWarpTimeRef.current > 150) {
              const dest = portal.to;
              cellRef.current = { r: dest.r, c: dest.c };
              posRef.current = centerOf(dest.r, dest.c);
              tr = dest.r;
              tc = dest.c;
              lydLastWarpTimeRef.current = now;
            }

            // choose next
            const desired = desiredDirRef.current,
              keep = dirRef.current;
            const canDesired = canMove(tr, tc, desired),
              canKeep = canMove(tr, tc, keep);
            let next: Dir = { dx: 0, dy: 0 };
            if (canDesired) next = desired;
            else if (canKeep) next = keep;
            dirRef.current = next;
            headingRef.current = angleFor(next);
            targetRef.current =
              next.dx || next.dy ? { r: tr + next.dy, c: tc + next.dx } : null;
            continue;
          }

          const step = Math.min(leftover, dist),
            ux = dx / dist,
            uy = dy / dist;
          posRef.current.x += ux * step;
          posRef.current.y += uy * step;
          leftover -= step;
          if (step === dist) {
            posRef.current.x = tx;
            posRef.current.y = ty;
          } else break;
        }
      }

      // Enemies (no portals)
      if (!frozen) {
        for (const en of activeEnemiesRef.current) {
          let leftover = en.speed * dt;
          while (leftover > 0) {
            if ((en.dir.dx === 0 && en.dir.dy === 0) || !en.target) {
              const cand = chooseEnemyNextDir(en.r, en.c, en.dir, en.behavior);
              if (cand.dx === 0 && cand.dy === 0) break;
              en.dir = cand;
              en.target = { r: en.r + cand.dy, c: en.c + cand.dx };
            }
            let { r: tr, c: tc } = en.target!,
              { x: tx, y: ty } = centerOf(tr, tc);
            const dx = tx - en.x,
              dy = ty - en.y,
              dist = Math.hypot(dx, dy);
            if (dist <= 1e-4) {
              en.r = tr;
              en.c = tc;
              const next = chooseEnemyNextDir(tr, tc, en.dir, en.behavior);
              en.dir = next;
              en.target =
                next.dx || next.dy
                  ? { r: tr + next.dy, c: tc + next.dx }
                  : null;
              continue;
            }
            const step = Math.min(leftover, dist),
              ux = dx / dist,
              uy = dy / dist;
            en.x += ux * step;
            en.y += uy * step;
            leftover -= step;
            if (step === dist) {
              en.x = tx;
              en.y = ty;
            } else break;
          }
        }

        // Player-enemy collision (knife protects player)
        // If a knife is active, body contact kills enemies instead of you.
        const px = posRef.current.x;
        const py = posRef.current.y;
        for (let i = activeEnemiesRef.current.length - 1; i >= 0; i--) {
          const en = activeEnemiesRef.current[i];
          const def = ENEMIES[en.idx];
          const rx = en.x - px;
          const ry = en.y - py;
          const rad = LYD_COLLISION_R + enemyCollisionRadius(def);
          if (rx * rx + ry * ry <= rad * rad) {
            if (activeKnifeRef.current) {
              // Holding a knife: enemy dies on contact
              activeEnemiesRef.current.splice(i, 1);
              continue;
            } else {
              setGameOver(true);
              break;
            }
          }
        }

        // Knife lifetime + kills (in-place rotation)
        if (activeKnifeRef.current) {
          const t0 = activeKnifeRef.current.startMs,
            aliveEnd = t0 + KNIFE_ALIVE_MS,
            flashEnd = aliveEnd + KNIFE_FLASH_MS;
          if (now >= flashEnd) {
            activeKnifeRef.current = null;
          } else {
            const baseAngle = angleFor(dirRef.current);
            const offsetAngle = baseAngle; // where the knife sits
            const renderAngle = baseAngle + deg2rad(KNIFE_ORIENT_DEGREES); // blade orientation
            const cx = posRef.current.x + Math.cos(offsetAngle) * KNIFE_OFFSET;
            const cy = posRef.current.y + Math.sin(offsetAngle) * KNIFE_OFFSET;
            const tipX = cx + Math.cos(renderAngle) * (KNIFE_SIZE * 0.35);
            const tipY = cy + Math.sin(renderAngle) * (KNIFE_SIZE * 0.35);
            for (let i = activeEnemiesRef.current.length - 1; i >= 0; i--) {
              const e = activeEnemiesRef.current[i],
                dx = e.x - tipX,
                dy = e.y - tipY;
              if (dx * dx + dy * dy <= KNIFE_KILL_RADIUS * KNIFE_KILL_RADIUS) {
                activeEnemiesRef.current.splice(i, 1);
              }
            }
          }
        }

        // Walking anim
        const moving =
          !!(dirRef.current.dx || dirRef.current.dy) && !!targetRef.current;
        if (moving) {
          walkAccRef.current += dt;
          if (walkAccRef.current >= WALK_PERIOD) {
            walkAccRef.current -= WALK_PERIOD;
            curFrameRef.current =
              curFrameRef.current === "stand" ? "walk" : "stand";
          }
        } else {
          curFrameRef.current = "stand";
          walkAccRef.current = 0;
        }
      }

      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      mounted = false;
    };
  }, [CELL, portalMap, curItem?.id]);

  const { r: rcR, c: rcC } = cellRef.current;
  const currentLYDImage =
    (curFrameRef.current === "walk" && lydWalk ? lydWalk : lydStand) || lydWalk;
  const dir = dirRef.current;
  const rot = dir.dy === 1 ? Math.PI / 2 : dir.dy === -1 ? -Math.PI / 2 : 0;
  const scaleX = dir.dx === -1 ? -1 : 1;

  /* ===================== RENDER ===================== */
  return (
    <View style={styles.screen}>
      {/* Full-screen background stays device-sized */}
      <View style={styles.bgWrap} pointerEvents="none">
        <Image
          source={require("./lyd/BACKGROUND.png")}
          style={[
            styles.bgImage,
            {
              transform: [
                { scale: BG_SCALE },
                { translateX: BG_SHIFT_X },
                { translateY: BG_SHIFT_Y },
              ],
            },
          ]}
          resizeMode="contain"
        />
      </View>

      <StatusBar hidden />

      {/* This is your virtual S24 screen.
         On S24: fits perfectly.
         On smaller screens: cropped.
         On larger screens: same size box in the middle (because of screen style). */}
      <View style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT }}>
        {/* Big centered timer */}
        <View style={styles.timerHud}>
          <Text style={styles.timerText}> {formatTime(elapsed)}</Text>
        </View>

        {/* Intro overlay: Ready? / Go! */}
        {(phase === "ready" || phase === "go") && (
          <View style={styles.introWrap}>
            <Text style={phase === "ready" ? styles.readyText : styles.goText}>
              {phase === "ready" ? "Ready?" : "Go!"}
            </Text>
          </View>
        )}

        {/* Canvas locked to design size */}
        <Canvas style={{ width, height }}>
          {/* Inventory */}
          {Array.from({ length: collectedCount }).map((_, i) => {
            const img = itemImages[i];
            if (!img) return null;
            const x = INV_X0 + i * (INV_ITEM_SIZE + INV_GAP);
            return (
              <SkiaImage
                key={`inv-${i}`}
                image={img}
                x={x}
                y={INV_Y_BASE}
                width={INV_ITEM_SIZE}
                height={INV_ITEM_SIZE}
              />
            );
          })}

          {/* Stage */}
          <Group
            transform={[
              { translateX: PADX },
              { translateY: PADY + UI_CONFIG.MAZE_Y_OFFSET },
            ]}
          >
            {/* ... everything inside the stage exactly as you had it ... */}
            {/* Rect, walls, portals, items, enemies, LYD, knife, etc */}

            <Rect x={0} y={0} width={STAGE_W} height={STAGE_H} color="#000" />

            {/* Walls */}
            <Group>
              {wallPaths.map((p, i) => (
                <Path
                  key={`fill-${i}-${tick}`}
                  path={p}
                  style="fill"
                  color={WALL_FILL}
                />
              ))}
            </Group>
            <Group>
              <BlurMask blur={OUTER_BLUR} style="outer" />
              {wallPaths.map((p, i) => (
                <Path
                  key={`o-${i}-${tick}`}
                  path={p}
                  color={OUTER_COLOR}
                  style="stroke"
                  strokeWidth={OUTER_W}
                  strokeJoin="round"
                  strokeCap="round"
                >
                  <CornerPathEffect r={CORNER_R} />
                </Path>
              ))}
            </Group>
            <Group>
              <BlurMask blur={MID_BLUR} style="outer" />
              {wallPaths.map((p, i) => (
                <Path
                  key={`m-${i}-${tick}`}
                  path={p}
                  color={MID_COLOR}
                  style="stroke"
                  strokeWidth={MID_W}
                  strokeJoin="round"
                  strokeCap="round"
                >
                  <CornerPathEffect r={CORNER_R} />
                </Path>
              ))}
            </Group>
            <Group>
              {wallPaths.map((p, i) => (
                <Path
                  key={`c-${i}-${tick}`}
                  path={p}
                  color={CORE_COLOR}
                  style="stroke"
                  strokeWidth={Math.max(0.5, CELL * 0.04)}
                  strokeJoin="round"
                  strokeCap="round"
                >
                  <CornerPathEffect r={CORNER_R} />
                </Path>
              ))}
            </Group>

            {/* Portals */}
            <Group>
              {PORTALS.map((pair, idx) => (
                <React.Fragment key={`portalpair-${idx}`}>
                  {[pair.a, pair.b].map((e, ei) => (
                    <Circle
                      key={`portal-${idx}-${ei}`}
                      cx={e.c * CELL + CELL / 2}
                      cy={e.r * CELL + CELL / 2}
                      r={CELL * 0.3}
                      color={e.color}
                    />
                  ))}
                </React.Fragment>
              ))}
            </Group>

            {/* Quest item */}
            {itemPos && currentItemImage && (
              <SkiaImage
                image={currentItemImage}
                x={itemPos.c * CELL + CELL / 2 - itemPixelSize(curItem) / 2}
                y={itemPos.r * CELL + CELL / 2 - itemPixelSize(curItem) / 2}
                width={itemPixelSize(curItem)}
                height={itemPixelSize(curItem)}
              />
            )}

            {/* Knife pickups */}
            {KNIFE_IMG &&
              KNIFE_SPAWNS.map((k, idx) =>
                knifePickups[idx] ? (
                  <SkiaImage
                    key={`knife-pickup-${idx}`}
                    image={KNIFE_IMG}
                    x={k.c * CELL + CELL / 2 - KNIFE_SIZE / 2}
                    y={k.r * CELL + CELL / 2 - KNIFE_SIZE / 2}
                    width={KNIFE_SIZE}
                    height={KNIFE_SIZE}
                  />
                ) : null
              )}

            {/* Enemies */}
            <Group>
              {activeEnemiesRef.current.map((en, i) => {
                const def = ENEMIES[en.idx],
                  img = enemyImages[en.idx];
                if (!img) return null;
                const sz = enemyPixelSize(def);
                return (
                  <SkiaImage
                    key={`enemy-${i}-${def.id}`}
                    image={img}
                    x={en.x - sz / 2}
                    y={en.y - sz / 2}
                    width={sz}
                    height={sz}
                  />
                );
              })}
            </Group>

            {/* LYD */}
            {currentLYDImage && (
              <Group
                transform={[
                  { translateX: posRef.current.x },
                  { translateY: posRef.current.y },
                  { rotate: rot },
                  { scaleX },
                ]}
              >
                <SkiaImage
                  image={currentLYDImage}
                  x={-LYD_SIZE / 2}
                  y={-LYD_SIZE / 2}
                  width={LYD_SIZE}
                  height={LYD_SIZE}
                />
              </Group>
            )}

            {/* Active knife (attached; flashing near end) */}
            {KNIFE_IMG &&
              activeKnifeRef.current &&
              (() => {
                const t0 = activeKnifeRef.current!.startMs;
                const aliveEnd = t0 + KNIFE_ALIVE_MS;
                const flashing = performance.now() >= aliveEnd;
                const visible =
                  !flashing ||
                  Math.floor(
                    (performance.now() - aliveEnd) / KNIFE_FLASH_PERIOD_MS
                  ) %
                    2 ===
                    0;
                if (!visible) return null;
                const baseAngle = angleFor(dirRef.current);
                const offsetAngle = baseAngle;
                const renderAngle = baseAngle + deg2rad(KNIFE_ORIENT_DEGREES);
                const cx =
                  posRef.current.x + Math.cos(offsetAngle) * KNIFE_OFFSET;
                const cy =
                  posRef.current.y + Math.sin(offsetAngle) * KNIFE_OFFSET;
                return (
                  <Group
                    transform={[
                      { translateX: cx },
                      { translateY: cy },
                      { rotate: renderAngle },
                    ]}
                  >
                    <SkiaImage
                      image={KNIFE_IMG}
                      x={-KNIFE_SIZE / 2}
                      y={-KNIFE_SIZE / 2}
                      width={KNIFE_SIZE}
                      height={KNIFE_SIZE}
                    />
                  </Group>
                );
              })()}
          </Group>
        </Canvas>

        {/* Win overlay with time */}
        {won && (
          <View style={styles.overlayWrap}>
            <Text style={styles.winText}>
              Congrats! You Got Married!{" "}
              <Text style={styles.winTime}>{formatTime(elapsed)}</Text>
            </Text>
            <View style={styles.restartBtn}>
              <Text style={styles.restartTxt} onPress={restartGame}>
                Restart
              </Text>
            </View>
          </View>
        )}

        {/* Game Over */}
        {gameOver && (
          <View style={styles.overlayWrap}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <View style={styles.restartBtn}>
              <Text style={styles.restartTxt} onPress={restartGame}>
                Restart
              </Text>
            </View>
          </View>
        )}

        {/* === D-PAD === */}
        <View style={styles.pad}>
          <View style={styles.padRow}>
            <Pad
              label="▲"
              onPress={() =>
                phase === "play" && !gameOver && !won && setDesired(DIRS.Up)
              }
            />
          </View>
          <View style={styles.padRow}>
            <Pad
              label="◀"
              onPress={() =>
                phase === "play" && !gameOver && !won && setDesired(DIRS.Left)
              }
            />
            <View style={{ width: 40 }} />
            <Pad
              label="▶"
              onPress={() =>
                phase === "play" && !gameOver && !won && setDesired(DIRS.Right)
              }
            />
          </View>
          <View style={styles.padRow}>
            <Pad
              label="▼"
              onPress={() =>
                phase === "play" && !gameOver && !won && setDesired(DIRS.Down)
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ===================== D-PAD BUTTON ===================== */
function Pad({ label, onPress }: { label: string; onPress: () => void }) {
  // micro-nudges to visually center each glyph
  const nudge = React.useMemo(() => {
    switch (label) {
      case "▲":
        return { x: 0, y: -2 };
      case "▼":
        return { x: 0, y: 0 };
      case "◀":
        return { x: -1.5, y: 0 };
      case "▶":
        return { x: 1.5, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }, [label]);

  return (
    <Pressable
      onPressIn={onPress}
      style={({ pressed }) => [
        styles.padBtn,
        pressed ? styles.padBtnDown : styles.padBtnUp,
      ]}
      hitSlop={8}
    >
      <View style={styles.padBtnInner} />
      <View style={styles.padGlyphWrap}>
        <Text
          style={[
            styles.padTxt,
            { transform: [{ translateX: nudge.x }, { translateY: nudge.y }] },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.padBtnShine} />
    </Pressable>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050816",
    alignItems: "center",
    justifyContent: "center",
  },

  // Background
  bgWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bgImage: {
    width: "100%",
    height: "100%",
  },

  // Big centered timer
  timerHud: {
    position: "absolute",
    top: 120,
    right: 25,
    alignItems: "center",
    zIndex: 20,
  },
  timerText: {
    color: "#e5e7eb",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 8,
    fontVariant: ["tabular-nums"],
  },

  // Intro overlay
  introWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  readyText: {
    color: "#fbbf24", // amber
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 10,
  },
  goText: {
    color: "#22c55e", // green
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 12,
  },

  // Optional debug (small)
  hudLeft: { position: "absolute", top: 18, left: 16, zIndex: 21 },
  hudTxt: { color: "#9ca3af", fontSize: 14, fontWeight: "700" },

  overlayWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 20,
  },
  gameOverText: {
    color: "#ff4d4f",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: "center",
  },
  winText: {
    color: "#22c55e",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 16,
  },
  winTime: { color: "#e5e7eb", fontSize: 32, fontWeight: "900" },

  restartBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  restartTxt: { color: "#e5e7eb", fontSize: 18, fontWeight: "800" },

  // D-pad (with your tighter gaps)
  pad: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    alignItems: "center",
    gap: 0,
  },
  padRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  padBtn: {
    width: 50,
    height: 50,
    borderRadius: 33,
    backgroundColor: "#FACC15", // yellow face
    borderWidth: 2,
    borderColor: "#F59E0B", // darker rim
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  padTxt: {
    color: "#1f2937",
    fontSize: 40,
    fontWeight: "900",
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 40,
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowRadius: 2,
  },
  padGlyphWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  padBtnUp: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ translateY: 0 }],
  },
  padBtnDown: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
    transform: [{ translateY: 2 }],
  },
  padBtnInner: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  padBtnShine: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 8,
    height: "38%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
});
