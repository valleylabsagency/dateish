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

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();

// Helper: send Expo push notifications
async function sendPush(
  tokens: string[],
  {
    title,
    body,
    data,
    sound = "push-notif.wav",
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
