import { auth, firestore } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const signUp = async (username, password) => {
  const pseudoEmail = `${username}@dateish.com`;
  const { user } = await createUserWithEmailAndPassword(auth, pseudoEmail, password);

  // Seed the Firestore user doc (this is what entrance.tsx listens to)
  await setDoc(
    doc(firestore, "users", user.uid),
    {
      username,
      isVip: false,
      createdAt: serverTimestamp(),
    },
    { merge: true } // in case doc already exists
  );

  return user;
};


export const login = async (username, password) => {
  const pseudoEmail = `${username}@dateish.com`;
  const { user } = await signInWithEmailAndPassword(auth, pseudoEmail, password);
  return user;
};

export const logout = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const db = getDatabase();
      const userStatusRef = ref(db, `status/${user.uid}`);
      // Set the user's status to offline in the realtime database
      await set(userStatusRef, { online: false });
      console.log(`User ${user.uid} set to offline.`);
    }
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
