// services/moneys.ts
import { httpsCallable, httpsCallableFromURL } from "firebase/functions";
import { functions } from "../firebase";
import { ensureSignedIn, getIdTokenSafely } from "../firebase";

type SpendPayload = {
  amount: number;           // e.g., 1
  reason?: string;          // e.g., "tip jar"
  chatId?: string | null;   // optional, if you ever want to tie to chat
};

export async function spendMoneys(payload: SpendPayload) {
  await ensureSignedIn();

  try {
    // First try the callable (works in production builds)
    const call = httpsCallable(functions, "spendMoneys");
    const res = await call(payload);
    return res.data as any;
  } catch (e: any) {
    // Fallback: use the HTTP function we created
    const idToken = await getIdTokenSafely();
    const url = `https://us-central1-${functions.app.options.projectId}.cloudfunctions.net/spendMoneysHttp`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload), // HTTP version accepts plain JSON too
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return await resp.json();
  }
}

export function getMessageCost(now = new Date()) {
  const h = now.getHours();            // local time
  const isHappyHour = h >= 17 && h < 21;
  return isHappyHour ? 5 : 10;
}


/*
export async function spendMoneys(payload: SpendPayload) {
  await ensureSignedIn(); // make sure we have a user

  console.log("[moneys] projectId:", functions.app.options.projectId);
  console.log("[moneys] region bound:", (functions as any)._region || "us-central1");
  console.log("[moneys] calling spendMoneys with:", payload);

  try {
    const call = httpsCallable(functions, "spendMoneys");
    const res = await call(payload);
    console.log("[moneys] spendMoneys OK:", res.data);
    return res.data;
  } catch (e: any) {
    console.warn("[moneys] spendMoneys named-callable failed:", e.code, e.message);

    // 1) If the function name couldn’t be found, try the URL wrapper
    if (e.code === "functions/not-found") {
      const url = `https://us-central1-${functions.app.options.projectId}.cloudfunctions.net/spendMoneys`;
      console.log("[moneys] Retrying via URL:", url);
      const viaUrl = httpsCallableFromURL(functions, url);
      const res2 = await viaUrl(payload);
      console.log("[moneys] spendMoneys via URL OK:", res2.data);
      return res2.data;
    }

    // 2) If the SDK still says unauthenticated, do a raw HTTPS POST with Bearer token
    if (e.code === "functions/unauthenticated") {
      const idToken = await getIdTokenSafely(); // ensures anon sign-in + fetches token
      const url = `https://us-central1-${functions.app.options.projectId}.cloudfunctions.net/spendMoneys`;

      console.log("[moneys] Falling back to raw fetch with Bearer token");
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // This is what the onCall wrapper expects:
          "Authorization": `Bearer ${idToken}`,
        },
        // onCall REST expects { data: <your payload> }
        body: JSON.stringify({ data: payload }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }
      const json = await resp.json();
      // REST returns { result: ... }
      console.log("[moneys] spendMoneys raw-fetch OK:", json?.result);
      return json?.result;
    }

    throw e;
  }
}
 */