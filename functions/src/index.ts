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
import {onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {DateTime} from "luxon";
import * as functionsV1 from "firebase-functions/v1";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();

// ----- MONEYS CONFIG -----
const TZ = "America/New_York";
const BAR_OPEN_HOUR = 17; // 5pm ET
const DAILY_FREE = 100 as const;
const COSTS = {start_chat: 10, play_game: 2} as const;


function currentGrantBoundary(now: DateTime) {
  // Boundary is the latest 5:00 PM ET that has passed (today or yesterday)
  let boundary = now.set({hour: BAR_OPEN_HOUR, minute: 0, second: 0, millisecond: 0});
  if (now < boundary) boundary = boundary.minus({days: 1});
  return boundary;
}

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

// Creates moneys on first sign-up
export const seedMoneysOnSignup = functionsV1.auth.user().onCreate(
  async (user: functionsV1.auth.UserRecord) => {
    const uid = user.uid;
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (snap.exists && snap.get("moneys")) return;

    const now = DateTime.now().setZone(TZ);
    const boundary = currentGrantBoundary(now);

    await userRef.set(
      {
        moneys: {
          balance: DAILY_FREE,
          paidBalance: 0,
          dailyFreeTarget: DAILY_FREE,
          lastGrantBoundaryAt: admin.firestore.Timestamp.fromDate(
            boundary.toJSDate()
          ),
          vipTier: "none",
        },
      },
      {merge: true}
    );

    await userRef.collection("moneys_ledger").add({
      amount: DAILY_FREE,
      kind: "grant_daily",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

export const ensureDailyGrant = onCall(async (req) => {
  const {auth} = req;
  if (!auth) throw new Error("Login required");
  const uid = auth.uid;

  const userRef = db.collection("users").doc(uid);
  const now = DateTime.now().setZone(TZ);
  const boundary = currentGrantBoundary(now);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const m = (doc.get("moneys") as any) || {};
    const lastTs = m.lastGrantBoundaryAt;
    const last = lastTs?.toDate ? DateTime.fromJSDate(lastTs.toDate()).setZone(TZ) : null;

    // Already granted at or after this boundary?
    if (last && last >= boundary) return;

    const balance = Number(m.balance || 0);
    const paid = Number(m.paidBalance || 0);
    const freeBefore = Math.max(0, balance - paid);
    const target = Number(m.dailyFreeTarget || DAILY_FREE);

    if (freeBefore < target) {
      const grant = target - freeBefore;
      const newBalance = paid + target;

      tx.update(userRef, {
        "moneys.balance": newBalance,
        "moneys.lastGrantBoundaryAt": admin.firestore.Timestamp.fromDate(boundary.toJSDate()),
      });
      tx.create(userRef.collection("moneys_ledger").doc(), {
        amount: grant,
        kind: "grant_daily",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      tx.update(userRef, {
        "moneys.lastGrantBoundaryAt": admin.firestore.Timestamp.fromDate(boundary.toJSDate()),
      });
    }
  });

  const fresh = (await userRef.get()).get("moneys");
  return {moneys: fresh};
});

export const spendMoneys = onCall(async (req) => {
  const {auth, data} = req;
  if (!auth) throw new Error("Login required");
  const uid = auth.uid;

  const kind = data?.kind as keyof typeof COSTS;
  const cost = COSTS[kind];
  if (!cost) throw new Error("Invalid spend kind");

  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const m = (doc.get("moneys") as any) || {};
    let balance = Number(m.balance || 0);
    let paid = Number(m.paidBalance || 0);

    if (balance < cost) throw new Error("Insufficient moneys");

    const freeBefore = Math.max(0, balance - paid);
    const paidReduction = Math.max(0, cost - freeBefore);

    balance -= cost;
    paid = Math.max(0, paid - paidReduction);

    tx.update(userRef, {
      "moneys.balance": balance,
      "moneys.paidBalance": paid,
    });

    tx.create(userRef.collection("moneys_ledger").doc(), {
      amount: -cost,
      kind,
      meta: data?.meta || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const fresh = (await userRef.get()).get("moneys");
  return {moneys: fresh};
});

export const purchaseMoneys = onCall(async (req) => {
  const {auth, data} = req;
  if (!auth) throw new Error("Login required");
  const uid = auth.uid;

  const amount = Number(data?.amount || 0);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }

  // TODO: verify App Store / Play receipt here

  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const m = (doc.get("moneys") as any) || {};
    const balance = Number(m.balance || 0) + amount;
    const paid = Number(m.paidBalance || 0) + amount;

    tx.update(userRef, {
      "moneys.balance": balance,
      "moneys.paidBalance": paid,
    });

    tx.create(userRef.collection("moneys_ledger").doc(), {
      amount,
      kind: "purchase",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const fresh = (await userRef.get()).get("moneys");
  return {moneys: fresh};
});
