// contexts/ProfileContext.tsx
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem("userProfile");
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          setProfile(parsedProfile);
          // Optionally, set profileComplete based on your criteria:
          setProfileComplete(!!parsedProfile.name);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = async (profileData: Partial<Profile>) => {
    try {
      const newProfile = { ...(profile || {}), ...profileData };
      await AsyncStorage.setItem("userProfile", JSON.stringify(newProfile));
      setProfile(newProfile);
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
