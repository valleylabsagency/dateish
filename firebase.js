import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
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

// ✅ Only initialize once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const firestore = getFirestore(app);
export const database = getDatabase(app);


