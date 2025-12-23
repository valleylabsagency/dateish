import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions, httpsCallable, httpsCallableFromURL } from "firebase/functions"; // ⬅️ add this
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBLSTw5hKlnlZ1oiEsXVMuDkcBYfZiL0zw",
  authDomain: "dateish-4edf2.firebaseapp.com",
  projectId: "dateish-4edf2",
  storageBucket: "dateish-4edf2.firebasestorage.app",
  messagingSenderId: "482953150124",
  appId: "1:482953150124:web:f2273baa7f4e923e1c2909",
  measurementId: "G-WVJK03806D"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const firestore = getFirestore(app);
export const database = getDatabase(app);

const REGION = "us-central1";
export const functions = getFunctions(app, REGION);

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
  const token = await auth.currentUser?.getIdToken(forceRefresh);
  if (!token) throw new Error("No ID token available");
  return token;
}

onAuthStateChanged(auth, (u) => {
  if (!u) {
    // fire and forget; errors will surface when you hit a callable
    signInAnonymously(auth).catch(() => {});
  }
});


// simple logger you can leave in for now
export const logFnsEnv = () => {
  console.log("[moneys] projectId:", app.options.projectId);
  console.log("[moneys] region bound:", REGION);
};

// A tiny client wrapper for the new ping:
export async function callPing() {
  await ensureSignedIn(); 
  logFnsEnv();
  const call = httpsCallable(functions, "ping");
  const res = await call({});
  return res.data;
}

// Your spend helper (keep this; we’ll test after ping)
export async function callSpendMoneys(payload) {
  await ensureSignedIn(); 
  logFnsEnv();
  try {
    const call = httpsCallable(functions, "spendMoneys");
    const res = await call(payload);
    return res.data;
  } catch (e) {
    console.warn("[moneys] spendMoneys named-callable failed:", e.code, e.message);

    // Optional fallback (use the v2 callable endpoint explicitly)
    const url = `https://us-central1-${app.options.projectId}.cloudfunctions.net/spendMoneys`;
    console.log("[moneys] Retrying via URL:", url);
    const call2 = httpsCallableFromURL(functions, url);
    const res2 = await call2(payload);
    return res2.data;
  }
}
