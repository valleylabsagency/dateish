// functions/src/onMessageCreate.ts
import * as functions from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();

export const onMessageCreate = functions.onDocumentCreated("chats/{chatId}/messages/{msgId}", async (event) => {
  const msg = event.data?.data();
  if (!msg) return;

  // find chat recipients (not the sender)
  const chatRef = event.data?.ref.parent.parent!;
  const chat = (await chatRef.get()).data() as any;
  const recipients: string[] = (chat?.users || []).filter((u: string) => u !== msg.sender);

  // collect tokens
  const tokens: string[] = [];
  const snaps = await Promise.all(recipients.map(uid => db.doc(`users/${uid}`).get()));
  for (const s of snaps) {
    const t = s.data()?.expoPushToken;
    if (typeof t === "string" && t.startsWith("ExponentPushToken[")) tokens.push(t);
  }
  if (!tokens.length) return;

  const payloads = tokens.map(to => ({
    to,
    sound: "default",
    title: msg.senderName ?? "New message",
    body: (msg.text ?? "").slice(0, 140),
    data: { chatId: chatRef.id, partnerId: msg.sender, senderName: msg.senderName ?? "" },
    priority: "high"
  }));

  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payloads),
  });
  console.log("Expo response:", await resp.json());
});
