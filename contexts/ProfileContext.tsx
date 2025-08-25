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
  isVip?: boolean;
  moneys?: number;
  vipSince?: any;
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
      if (!user && previousUser.current) {
        try {
          const ref = doc(firestore, "users", previousUser.current.uid);
          await setDoc(ref, { online: false }, { merge: true });
        } catch (err) {
          console.error("Error setting offline:", err);
        }
        previousUser.current = null;
        setCurrentUser(null);
        setProfile(null);
        setProfileComplete(false);
      } else if (user) {
        previousUser.current = user;
        setCurrentUser(user);
        try {
          const ref = doc(firestore, "users", user.uid);
          await setDoc(ref, { online: true }, { merge: true });
        } catch (err) {
          console.error("Error setting online:", err);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2) Subscribe to the Firestore doc for the *currentUser*
  useEffect(() => {
    let unsubscribeDoc: Unsubscribe | null = null;
    if (currentUser) {
      const ref = doc(firestore, "users", currentUser.uid);
      unsubscribeDoc = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Profile;
          setProfile(data);
          setProfileComplete(isProfileComplete(data));
        } else {
          setProfile({});
          setProfileComplete(false);
        }
      });
    } else {
      setProfile(null);
      setProfileComplete(false);
    }
    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, [currentUser]);

  // 3) Save the updated profile data to Firestore.
  const saveProfile = async (profileData: Partial<Profile>) => {
    try {
      if (!currentUser) return;

      // 🔒 Never let the client write server-controlled fields
      const { moneys: _dropMoneys, isVip: _dropVip, vipSince: _dropVipSince, ...clientSafe } =
        profileData;

      const newProfile = { ...(profile || {}), ...clientSafe };
      setProfile(newProfile);
      setProfileComplete(isProfileComplete(newProfile));

      const ref = doc(firestore, "users", currentUser.uid);
      await setDoc(ref, { ...clientSafe, online: true }, { merge: true });
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
