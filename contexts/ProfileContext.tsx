// contexts/ProfileContext.tsx

import React, { createContext, useState, useEffect } from "react";
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

  // 1) Track user changes via onAuthStateChanged
  //    When user changes (including logout), reset the profile unless the user is new
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. user.uid =", user?.uid ?? null);

      setCurrentUser(user);

      if (!user) {
        // If no user is logged in, clear the profile so it doesn't bleed over
        setProfile(null);
        setProfileComplete(false);
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
          // doc doesn't exist => set an empty object
          console.log("No profile doc found for this user; setting empty profile object.");
          setProfile({});
          setProfileComplete(false);
        }
      });
    } else {
      // No current user => clear profile
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

  // 3) Save the updated profile data to Firestore
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
      await setDoc(profileDocRef, newProfile, { merge: true });

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
