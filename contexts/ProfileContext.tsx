// contexts/ProfileContext.tsx
import React, { createContext, useState, useEffect } from "react";
import { firestore } from "../firebase"; 
import { auth } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

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

  // Utility: determine if profile is complete (all required fields exist)
  const isProfileComplete = (profile: Profile): boolean => {
    return Boolean(profile.name && profile.age && profile.location && profile.about && profile.photoUri);
  };

  // Listen to the Firestore document for the current user.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (auth.currentUser) {
      const profileDocRef = doc(firestore, "users", auth.currentUser.uid);
      unsubscribe = onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Profile;
          setProfile(data);
          setProfileComplete(isProfileComplete(data));
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const saveProfile = async (profileData: Partial<Profile>) => {
    try {
      const newProfile = { ...(profile || {}), ...profileData };
      setProfile(newProfile);
      setProfileComplete(isProfileComplete(newProfile));
      if (auth.currentUser) {
        const profileDocRef = doc(firestore, "users", auth.currentUser.uid);
        await setDoc(profileDocRef, newProfile, { merge: true });
      }
      console.log("Profile saved:", newProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  return (
    <ProfileContext.Provider
      value={{ profile, setProfile, profileComplete, setProfileComplete, saveProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
