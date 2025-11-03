// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import {
  getFunctions,
  httpsCallable,
  httpsCallableFromURL,
} from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyBLSTw5hKlnlZ1oiEsXVMuDkcBYfZiL0zw",
  authDomain: "dateish-4edf2.firebaseapp.com",
  projectId: "dateish-4edf2",
  storageBucket: "dateish-4edf2.firebasestorage.app",
  messagingSenderId: "482953150124",
  appId: "1:482953150124:web:f2273baa7f4e923e1c2909",
  measurementId: "G-WVJK03806D",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ---- Auth (web-safe, native gets persistence if available) ----
function createAuth(appInstance) {
  if (Platform.OS === "web") {
    return getAuth(appInstance);
  }
  try {
    // Lazy-require so Metro/Web don’t need to resolve the subpath on web
    // Requires firebase >= 9.13 (recommend 10+)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require("firebase/auth/react-native");
    return initializeAuth(appInstance, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    console.warn(
      "[firebase] 'firebase/auth/react-native' not found; falling back to default getAuth (no RN persistence).",
      String(e && e.message ? e.message : e)
    );
    return getAuth(appInstance);
  }
}

const auth = createAuth(app);
export { auth };

// ---- Other services ----
export const firestore = getFirestore(app);
export const database = getDatabase(app);

const REGION = "us-central1";
export const functions = getFunctions(app, REGION);

// ---- Auth helpers ----
export async function ensureSignedIn() {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.warn("anonymous sign-in failed:", e);
    throw e;
  }
}

export async function getIdTokenSafely(forceRefresh = false) {
  await ensureSignedIn();
  const user = auth.currentUser;
  if (!user) throw new Error("No user");
  const token = await user.getIdToken(forceRefresh);
  if (!token) throw new Error("No ID token available");
  return token;
}

// Keep an anonymous user around automatically
onAuthStateChanged(auth, (u) => {
  if (!u) {
    // fire-and-forget; errors surface when calling functions
    signInAnonymously(auth).catch(() => {});
  }
});

// ---- Small diagnostics ----
export const logFnsEnv = () => {
  console.log("[moneys] projectId:", app.options.projectId);
  console.log("[moneys] region bound:", REGION);
};

// ---- Callable helpers ----
export async function callPing() {
  await ensureSignedIn();
  logFnsEnv();
  const call = httpsCallable(functions, "ping");
  const res = await call({});
  return res.data;
}

export async function callSpendMoneys(payload) {
  await ensureSignedIn();
  logFnsEnv();
  try {
    const call = httpsCallable(functions, "spendMoneys");
    const res = await call(payload);
    return res.data;
  } catch (e) {
    console.warn(
      "[moneys] spendMoneys named-callable failed:",
      e.code,
      e.message
    );

      // Optional fallback: direct URL callable
    const url = `https://us-central1-${app.options.projectId}.cloudfunctions.net/spendMoneys`;
    console.log("[moneys] Retrying via URL:", url);
    const call2 = httpsCallableFromURL(functions, url);
    const res2 = await call2(payload);
    return res2.data;
  }
}
