// services/highscores.ts
import { firestore, auth } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

export type GameKey = "darts" | "lyd";

export type LeaderboardKind = "score" | "time";

export type LeaderboardRow = {
  uid: string;
  name: string;
  photoUri?: string | null;

  kind: LeaderboardKind;

  // Darts
  score?: number;

  // LYD
  seconds?: number;
  timeText?: string;

  // Optional universal (newer docs)
  sortKey?: number;
};

type SubmitMeta = {
  name?: string;
  photoUri?: string;
};

function safeName(name?: string) {
  return (name && name.trim()) || "Player";
}

/**
 * Submit a leaderboard entry (best-ever per user per game).
 *
 * Darts: higher score is better.
 * LYD: lower seconds is better.
 *
 * Backward compatible:
 * - We still write sortKey for newer docs
 * - But reads do NOT depend on sortKey (so old darts docs still show)
 */
export async function submitLeaderboardEntry(
  game: GameKey,
  value: number, // darts: score, lyd: seconds
  meta?: SubmitMeta,
  timeText?: string // only for lyd
) {
  const user = auth.currentUser;
  if (!user) return;

  const uid = user.uid;
  const ref = doc(firestore, "highscores", game, "users", uid);

  const name = safeName(meta?.name);
  const photoUri = meta?.photoUri ?? null;

  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists() ? (snap.data() as any) : null;

    if (game === "darts") {
      const prevScore =
        typeof prev?.score === "number" ? prev.score : -Infinity;
      const newScore = value;

      // Only update if improved
      if (newScore <= prevScore) return;

      tx.set(
        ref,
        {
          uid,
          name,
          photoUri,
          kind: "score",
          score: newScore,
          sortKey: newScore, // nice-to-have (new schema)
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    // game === "lyd" (fastest time wins)
    const prevSeconds =
      typeof prev?.seconds === "number" ? prev.seconds : Infinity;
    const newSeconds = value;

    // Only update if improved (faster)
    if (newSeconds >= prevSeconds) return;

    tx.set(
      ref,
      {
        uid,
        name,
        photoUri,
        kind: "time",
        seconds: newSeconds,
        timeText: timeText ?? null,
        sortKey: -newSeconds, // nice-to-have (new schema)
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/**
 * Get top N leaderboard rows.
 *
 * Backward compatible ordering:
 * - Darts: order by "score" desc (works for old docs)
 * - LYD: order by "seconds" asc (works for old docs)
 */
export async function getTopLeaderboard(
  game: GameKey,
  topN = 3
): Promise<LeaderboardRow[]> {
  const col = collection(firestore, "highscores", game, "users");

  const q =
    game === "darts"
      ? query(col, orderBy("score", "desc"), limit(topN))
      : query(col, orderBy("seconds", "asc"), limit(topN));

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const x = d.data() as any;

    return {
      uid: x.uid,
      name: x.name ?? "Player",
      photoUri: x.photoUri ?? null,
      kind: x.kind ?? (game === "darts" ? "score" : "time"),
      score: typeof x.score === "number" ? x.score : undefined,
      seconds: typeof x.seconds === "number" ? x.seconds : undefined,
      timeText: typeof x.timeText === "string" ? x.timeText : undefined,
      sortKey: typeof x.sortKey === "number" ? x.sortKey : undefined,
    };
  });
}
