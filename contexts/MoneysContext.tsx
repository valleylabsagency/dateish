// src/contexts/MoneysContext.tsx
// A lightweight React context to manage a user's in‑app currency ("Moneys").
//
// Integrates with three Cloud Functions you've already defined:
//   - ensureDailyGrant (callable): awards a once‑per‑day stipend if eligible
//   - spendMoneys     (callable): decrements balance when spending
//   - purchaseMoneys  (callable): increments balance when a package is purchased
//
// The provider also live‑subscribes to a Firestore document that stores the
// authoritative balance. By default it uses `wallets/{uid}` but you can
// override the path with the `walletDoc` prop.
//
// Requirements:
//  - Firebase v9+ modular SDK
//  - Your app must initialize Firebase before using this provider
//  - Functions deployed in region `us-central1` (matches your logs)
//
// Usage:
//   <MoneysProvider>
//     <App />
//   </MoneysProvider>
//
//   const { balance, loading, grantDaily, spend, purchase } = useMoneys();
//
// Notes:
//  - This file is UI‑framework agnostic React; works in CRA, Vite, or Next.js (client component).
//  - Error objects are normalized so UIs can show friendly toasts.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  DocumentReference,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

// ---------- Types ----------
export type WalletSnapshot = {
  balance: number;
  updatedAt?: any; // Firestore Timestamp
  lastGrantAt?: any; // Firestore Timestamp
};

export type SpendInput = {
  amount: number; // positive integer/float depending on your economy
  reason?: string;
  idempotencyKey?: string; // optional safety key to prevent double spending
};

export type PurchaseInput = {
  packageId: string;
  idempotencyKey?: string;
};

export type DailyGrantResult = {
  granted: boolean;
  amount?: number;
  newBalance?: number;
};

export type SpendResult = {
  ok: boolean;
  newBalance?: number;
  txId?: string;
};

export type PurchaseResult = {
  ok: boolean;
  newBalance?: number;
  txId?: string;
};

export type MoneysContextValue = {
  user: User | null;
  balance: number | null; // null until first snapshot
  loading: boolean; // true while attaching listeners / calling functions
  ready: boolean;   // true when we know user+first snapshot state
  error: string | null; // last error message (UI may ignore if using toasts)
  // Actions
  grantDaily: () => Promise<DailyGrantResult>;
  spend: (input: SpendInput) => Promise<SpendResult>;
  purchase: (input: PurchaseInput) => Promise<PurchaseResult>;
  refreshNow: () => Promise<void>; // forces a write to bump updatedAt if needed
};

const MoneysContext = createContext<MoneysContextValue | undefined>(undefined);

// ---------- Utilities ----------
function defaultWalletDoc(uid: string): DocumentReference<WalletSnapshot> {
  const db = getFirestore();
  return doc(db, "wallets", uid) as DocumentReference<WalletSnapshot>;
}

function randomKey(prefix = "tx"): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

// ---------- Provider ----------
export function MoneysProvider({
  children,
  walletDoc,
  region = "us-central1",
}: React.PropsWithChildren<{
  walletDoc?: (uid: string) => DocumentReference<WalletSnapshot>;
  region?: string;
}>) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const unsubRef = useRef<() => void>();

  // Observe auth and attach Firestore subscription
  useEffect(() => {
    const auth = getAuth();
    const off = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setError(null);

      // Clean up any previous wallet listener
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = undefined;
      }

      if (!u) {
        setBalance(null);
        setLoading(false);
        setReady(true);
        return;
      }

      setLoading(true);
      const ref = (walletDoc || defaultWalletDoc)(u.uid);

      // Ensure the doc exists with sane defaults once (no-op if it already exists)
      try {
        await setDoc(
          ref,
          {
            balance: 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn("Failed to ensure wallet doc", e);
      }

      unsubRef.current = onSnapshot(
        ref,
        (snap) => {
          const data = snap.data() as WalletSnapshot | undefined;
          setBalance(typeof data?.balance === "number" ? data.balance : 0);
          setLoading(false);
          setReady(true);
        },
        (err) => {
          console.error("Wallet snapshot error", err);
          setError(normalizeErr(err));
          setLoading(false);
          setReady(true);
        }
      );
    });

    return () => {
      off();
      if (unsubRef.current) unsubRef.current();
    };
  }, [walletDoc]);

  // Functions client
  const fns = useMemo(() => getFunctions(undefined, region), [region]);

  const grantDaily = useCallback(async (): Promise<DailyGrantResult> => {
    if (!user) return { granted: false };
    setLoading(true);
    setError(null);
    try {
      const callable = httpsCallable(fns, "ensureDailyGrant");
      const res = await callable({});
      const data = (res?.data || {}) as any;
      // We trust Firestore listener for final balance; still return what backend said
      return {
        granted: !!data.granted,
        amount: typeof data.amount === "number" ? data.amount : undefined,
        newBalance: typeof data.newBalance === "number" ? data.newBalance : undefined,
      };
    } catch (e) {
      const msg = normalizeErr(e);
      setError(msg);
      return { granted: false };
    } finally {
      setLoading(false);
    }
  }, [fns, user]);

  const spend = useCallback(async (input: SpendInput): Promise<SpendResult> => {
    if (!user) return { ok: false };
    setLoading(true);
    setError(null);
    try {
      const callable = httpsCallable(fns, "spendMoneys");
      const res = await callable({
        amount: input.amount,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey || randomKey("spend"),
      });
      const data = (res?.data || {}) as any;
      return {
        ok: true,
        newBalance: typeof data.newBalance === "number" ? data.newBalance : undefined,
        txId: typeof data.txId === "string" ? data.txId : undefined,
      };
    } catch (e) {
      const msg = normalizeErr(e);
      setError(msg);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [fns, user]);

  const purchase = useCallback(async (input: PurchaseInput): Promise<PurchaseResult> => {
    if (!user) return { ok: false };
    setLoading(true);
    setError(null);
    try {
      const callable = httpsCallable(fns, "purchaseMoneys");
      const res = await callable({
        packageId: input.packageId,
        idempotencyKey: input.idempotencyKey || randomKey("purchase"),
      });
      const data = (res?.data || {}) as any;
      return {
        ok: true,
        newBalance: typeof data.newBalance === "number" ? data.newBalance : undefined,
        txId: typeof data.txId === "string" ? data.txId : undefined,
      };
    } catch (e) {
      const msg = normalizeErr(e);
      setError(msg);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [fns, user]);

  const refreshNow = useCallback(async () => {
    if (!user) return;
    try {
      const ref = (walletDoc || defaultWalletDoc)(user.uid);
      await setDoc(ref, { updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      setError(normalizeErr(e));
    }
  }, [user, walletDoc]);

  const value = useMemo<MoneysContextValue>(
    () => ({ user, balance, loading, ready, error, grantDaily, spend, purchase, refreshNow }),
    [user, balance, loading, ready, error, grantDaily, spend, purchase, refreshNow]
  );

  return <MoneysContext.Provider value={value}>{children}</MoneysContext.Provider>;
}

export function useMoneys(): MoneysContextValue {
  const ctx = useContext(MoneysContext);
  if (!ctx) throw new Error("useMoneys must be used inside <MoneysProvider>");
  return ctx;
}

// ---------- Error helper ----------
function normalizeErr(e: unknown): string {
  // Handles FirebaseError, fetch/axios, plain Error, or unknown values.
  if (!e) return "Unknown error";
  const anyE: any = e as any;
  const code = anyE?.code || anyE?.error?.code;
  const msg = anyE?.message || anyE?.error?.message || String(e);
  return code ? `${code}: ${msg}` : msg;
}

// ---------- (Optional) Example UI helpers ----------
// Small components you can paste into your app to sanity‑check the context.
// Remove if you prefer to keep this purely a context module.
export function MoneysDebugPanel() {
  const { user, balance, loading, ready, error, grantDaily, spend, purchase } = useMoneys();
  if (!ready) return <div>Loading moneys…</div>;
  if (!user) return <div>Sign in to see Moneys</div>;
  return (
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
      <div><strong>Balance:</strong> {balance ?? 0}</div>
      {error && <div style={{ color: "crimson" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => grantDaily()} disabled={loading}>Daily Grant</button>
        <button onClick={() => spend({ amount: 1, reason: "test" })} disabled={loading || (balance ?? 0) <= 0}>Spend 1</button>
        <button onClick={() => purchase({ packageId: "small_pack" })} disabled={loading}>Buy +10</button>
      </div>
    </div>
  );
}
