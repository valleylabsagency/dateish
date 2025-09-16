// app/index.tsx
import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
  const { authReady } = useAuth();
  if (!authReady) return null; // wait for Firebase to init
  return <Redirect href="/entrance" />;
}
