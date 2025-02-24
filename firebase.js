import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import getFirestore

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
const auth = getAuth(app);
const firestore = getFirestore(app); // Initialize Firestore

export { auth, firestore };
