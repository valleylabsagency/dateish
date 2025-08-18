import React, { ReactNode, useEffect } from "react";
import { auth } from "../firebase";
import { useRouter } from "expo-router";

interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps): JSX.Element => {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      // Always funnel to Entrance (signed in or not)
      router.replace("/entrance");
    });
    return () => unsubscribe();
  }, [router]);

  return <>{children}</>;
};

export default AuthWrapper;
