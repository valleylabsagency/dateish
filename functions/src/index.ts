/* eslint-disable
    require-jsdoc,
    max-len,
    @typescript-eslint/no-unused-vars
*/
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as admin from "firebase-admin";
import fetch from "node-fetch";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onValueWritten} from "firebase-functions/v2/database";
import {onCall, HttpsError, onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();

export const ping = onCall({region: "us-central1"}, async () => {
  return {ok: true, when: Date.now()};
});

export const helloHttp = onRequest({region: "us-central1"}, (req, res) => {
  res.status(200).send("hello from functions");
});


// Helper: 5pm in America/New_York every day
export const dailyFillMoneys = onSchedule(
  {schedule: "0 17 * * *", timeZone: "America/New_York"},
  async () => {
    const users = await db.collection("users").get();
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    users.forEach((docSnap) => {
      const u = docSnap.data() || {};
      const current = Number(u.moneys || 0);
      const base = u.isVip ? 300 : 100;
      const newBal = Math.max(current, base);

      if (newBal > current) {
        const ref = docSnap.ref;
        batch.update(ref, {moneys: newBal, lastFillAt: now});
        // ledger (optional)
        const ledgerRef = ref.collection("moneys_ledger").doc();
        batch.set(ledgerRef, {
          type: "fill",
          amount: newBal - current,
          at: now,
          note: u.isVip ? "VIP daily fill" : "Daily fill",
        });
      }
    });

    if (!users.empty) await batch.commit();
  }
);

// Happy Hour helper: 5pm–9pm local (ET assumed server-side)
function isHappyHour(date = new Date()) {
  const h = date.getHours();
  return h >= 17 && h < 21;
}

// Spend moneys atomically
export const spendMoneys = onCall({region: "us-central1"}, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required");

  const {amount, reason} = (req.data || {}) as {amount: number; reason?: string};
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError("invalid-argument", "amount must be > 0");
  }

  // Example: decrement from users/{uid}.moneys and write a ledger row
  const userRef = db.collection("users").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new HttpsError("failed-precondition", "User doc missing");
    const cur = Number(snap.get("moneys") || 0);
    if (cur < amount) throw new HttpsError("failed-precondition", "Insufficient moneys");
    tx.update(userRef, {moneys: cur - amount});
    tx.set(userRef.collection("moneys_ledger").doc(), {
      type: "spend",
      amount,
      reason: reason || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const newSnap = await userRef.get();
  return {ok: true, newBalance: newSnap.get("moneys") ?? 0};
});


// Helper: send Expo push notifications
async function sendPush(
  tokens: string[],
  {
    title,
    body,
    data,
    sound = "push_notif.wav",
  }: { title: string; body: string; data?: any; sound?: string }
) {
  const messages = tokens.map((token) => ({
    to: token,
    sound,
    title,
    body,
    data,
  }));
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
  }
}

// 1️⃣ New-message alerts (Firestore v2)
export const onNewMessage = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const snap = event.data;
    const chatId = event.params.chatId;
    const msg = snap?.data();
    if (!msg?.sender || !msg?.text) return;

    const chatDoc = await db.collection("chats").doc(chatId).get();
    const users: string[] = chatDoc.data()?.users || [];
    const recipients = users.filter((uid) => uid !== msg.sender);

    const tokens: string[] = [];
    await Promise.all(
      recipients.map(async (uid) => {
        const userDoc = await db.collection("users").doc(uid).get();
        const token = userDoc.data()?.expoPushToken;
        if (token) tokens.push(token);
      })
    );

    const preview =
      msg.text.length > 30 ? msg.text.slice(0, 30) + "…" : msg.text;
    await sendPush(tokens, {
      title: `You got a new message from ${msg.senderName || "Someone"}`,
      body: preview,
      data: {screen: "Chat", chatId},
    });
  }
);

// 2️⃣ "Bar is getting full" (Realtime DB v2)
export const onStatusChange = onValueWritten(
  "/status/{userId}/online",
  async () => {
    const statusSnap = await rtdb.ref("/status").once("value");
    const onlineCount = Object.values(statusSnap.val() || {}).filter(
      (st: any) => st === true
    ).length;
    if (onlineCount <= 8) return;

    const metaDoc = db.collection("meta").doc("barFull");
    const meta = await metaDoc.get();
    const last = meta.data()?.lastSent?.toMillis() || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - last < oneDay) return;

    await metaDoc.set({lastSent: admin.firestore.Timestamp.now()});

    const usersSnap = await db.collection("users").get();
    const tokens = usersSnap.docs
      .map((d) => d.data().expoPushToken)
      .filter(Boolean) as string[];

    await sendPush(tokens, {
      title: "The bar is getting full!",
      body: "Don’t miss out on the action! Come talk to people!",
      data: {screen: "Bar"},
    });
  }
);

// 3️⃣ Scheduled Mr. Mingles ping @1:30am Sat (Scheduler v2)
export const mrMinglesPing = onSchedule(
  {schedule: "30 1 * * SAT", timeZone: "America/New_York"},
  async () => {
    const usersSnap = await db.collection("users").get();
    const tokens = usersSnap.docs
      .map((d) => d.data().expoPushToken)
      .filter(Boolean) as string[];

    await sendPush(tokens, {
      title: "Mr. Mingles sent you a message",
      body: "Awake?",
      data: {screen: "Entrance"},
    });
  }
);

// 4️⃣ Manual broadcast: "Stop watching shorts" (HTTPS v2)
export const broadcastStopShorts = onCall(async (req) => {
  const {auth} = req;
  if (!auth) throw new Error("Login required");

  const statusSnap = await rtdb.ref("/status").once("value");
  const online = Object.values(statusSnap.val() || {}).some(
    (st: any) => st === true
  );
  if (!online) throw new Error("Bar is empty");

  const usersSnap = await db.collection("users").get();
  const tokens = usersSnap.docs
    .map((d) => d.data().expoPushToken)
    .filter(Boolean) as string[];

  await sendPush(tokens, {
    title: "What are you doing with your life??",
    body:
      "Stop watching fucking shorts and come have an actual conversation with another human being.",
    data: {screen: "Bar"},
  });
  return {success: true};
});

async function spendForUid(uid: string, amount: number, reason?: string) {
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("User doc missing");
    const cur = Number(snap.get("moneys") || 0);
    if (cur < amount) throw new Error("Insufficient moneys");
    tx.update(userRef, { moneys: cur - amount });
    tx.set(userRef.collection("moneys_ledger").doc(), {
      type: "spend",
      amount,
      reason: reason || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const newSnap = await userRef.get();
  return { ok: true, newBalance: newSnap.get("moneys") ?? 0 };
}

// ---------- HTTP (onRequest) versions ----------
export const pingHttp = onRequest({ region: "us-central1" }, async (req, res) => {
  // CORS (RN/Expo)
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const authHeader = req.headers.authorization || "";
    const m = authHeader.match(/^Bearer (.+)$/i);
    if (!m) {
      res.status(401).send("Missing bearer token");
      return;
    }
    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(m[1]);
    res.json({ ok: true, uid: decoded.uid, when: Date.now() });
  } catch (err: any) {
    res.status(401).send("Invalid token");
  }
});

export const spendMoneysHttp = onRequest({ region: "us-central1" }, async (req, res) => {
  // CORS (RN/Expo)
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const authHeader = req.headers.authorization || "";
    const m = authHeader.match(/^Bearer (.+)$/i);
    if (!m) {
      res.status(401).send("Missing bearer token");
      return;
    }
    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(m[1]);

    // Body can be either `{data: {...}}` (callable style) or plain JSON
    const body = (req.body && (req.body.data ?? req.body)) || {};
    const amount = Number(body.amount);
    const reason = body.reason as string | undefined;

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "amount must be > 0" });
      return;
    }

    const result = await spendForUid(decoded.uid, amount, reason);
    res.json(result);
  } catch (err: any) {
    // Auth errors show as 401, others as 400 to surface message
    if (String(err?.message || "").includes("auth")) {
      res.status(401).send("Invalid token");
      return;
    }
    res.status(400).json({ error: err?.message ?? "spend failed" });
  }
});
