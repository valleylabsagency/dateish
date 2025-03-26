import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";  // Import getDatabase

const firebaseConfig = {
  apiKey: "AIzaSyBLSTw5hKlnlZ1oiEsXVMuDkcBYfZiL0zw",
  authDomain: "dateish-4edf2.firebaseapp.com",
  projectId: "dateish-4edf2",
  storageBucket: "dateish-4edf2.firebasestorage.app",
  messagingSenderId: "482953150124",
  appId: "1:482953150124:web:f2273baa7f4e923e1c2909",
  measurementId: "G-WVJK03806D"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const firestore = getFirestore(app);
const database = getDatabase(app); // Initialize the Realtime Database

export { auth, firestore, database };
