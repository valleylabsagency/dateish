import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";

export const signUp = (username, password) => {
  // Construct a pseudo-email using the username.
  const pseudoEmail = `${username}@dateish.com`;
  return createUserWithEmailAndPassword(auth, pseudoEmail, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("User account created for:", username);
      // Optionally, create a user profile in Firestore here.
      return user;
    })
    .catch((error) => {
      console.error("Error creating account:", error);
      throw error;
    });
};

export const login = (username, password) => {
  const pseudoEmail = `${username}@dateish.com`;
  return signInWithEmailAndPassword(auth, pseudoEmail, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("User signed in:", username);
      return user;
    })
    .catch((error) => {
      console.error("Error signing in:", error);
      throw error;
    });
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
