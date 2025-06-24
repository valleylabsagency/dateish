// contexts/ProfileContext.tsx

import React, { createContext, useState, useEffect, useRef } from "react";
import { firestore, auth } from "../firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

interface Profile {
  name?: string;
  age?: string;
  location?: string;
  about?: string;
  photoUri?: string;
  drink?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  profileComplete: boolean;
  setProfileComplete: (complete: boolean) => void;
  saveProfile: (profileData: Partial<Profile>) => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  setProfile: () => {},
  profileComplete: false,
  setProfileComplete: () => {},
  saveProfile: async () => {},
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  // Use a ref to track the previously logged-in user.
  const previousUser = useRef<User | null>(auth.currentUser);

  // Utility: determine if a profile is complete
  const isProfileComplete = (prof: Profile): boolean => {
    return Boolean(
      prof.name &&
      prof.age &&
      prof.location &&
      prof.about &&
      prof.photoUri
    );
  };

  // 1) Track user changes via onAuthStateChanged.
  //    When a user logs in, update their document to online:true.
  //    When a user logs out, update the previous user's doc to online:false.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. user.uid =", user?.uid ?? null);

      if (!user && previousUser.current) {
        // User logged out; update the previous user to online:false.
        try {
          const profileDocRef = doc(firestore, "users", previousUser.current.uid);
          await setDoc(profileDocRef, { online: false }, { merge: true });
          console.log(`Set user ${previousUser.current.uid} offline.`);
        } catch (error) {
          console.error("Error updating online status to false:", error);
        }
        previousUser.current = null;
        setCurrentUser(null);
        setProfile(null);
        setProfileComplete(false);
      } else if (user) {
        // User logged in; update their online status to true.
        previousUser.current = user;
        setCurrentUser(user);
        try {
          const profileDocRef = doc(firestore, "users", user.uid);
          await setDoc(profileDocRef, { online: true }, { merge: true });
          console.log(`Set user ${user.uid} online.`);
        } catch (error) {
          console.error("Error updating online status to true:", error);
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // 2) Subscribe to the Firestore doc for the *currentUser*
  useEffect(() => {
    let unsubscribeDoc: Unsubscribe | null = null;

    if (currentUser) {
      const userUid = currentUser.uid;
      console.log("Subscribing to Firestore doc for:", userUid);

      const profileDocRef = doc(firestore, "users", userUid);
      unsubscribeDoc = onSnapshot(profileDocRef, (docSnap) => {
        console.log(
          `Profile snapshot triggered for user: ${userUid}, docSnap.exists: ${docSnap.exists()}`
        );

        if (docSnap.exists()) {
          const data = docSnap.data() as Profile;
          console.log("Profile data from Firestore:", JSON.stringify(data));

          setProfile(data);
          setProfileComplete(isProfileComplete(data));
        } else {
          console.log("No profile doc found for this user; setting empty profile object.");
          setProfile({});
          setProfileComplete(false);
        }
      });
    } else {
      setProfile(null);
      setProfileComplete(false);
    }

    return () => {
      if (unsubscribeDoc) {
        console.log("Unsubscribing from previous user doc listener.");
        unsubscribeDoc();
      }
    };
  }, [currentUser]);

  // 3) Save the updated profile data to Firestore.
  const saveProfile = async (profileData: Partial<Profile>) => {
    try {
      if (!currentUser) {
        console.log("No current user, cannot save profile.");
        return;
      }

      const newProfile = { ...(profile || {}), ...profileData };
      setProfile(newProfile);
      setProfileComplete(isProfileComplete(newProfile));

      const userUid = currentUser.uid;
      const profileDocRef = doc(firestore, "users", userUid);
      await setDoc(profileDocRef, { ...newProfile, online: true }, { merge: true });

      console.log("Profile saved:", newProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        profileComplete,
        setProfileComplete,
        saveProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export default ProfileProvider;
