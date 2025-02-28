import React, { ReactNode, useEffect } from "react";
import { auth } from "../firebase";
import { useRouter } from "expo-router";

interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps): JSX.Element => {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is logged in, navigate to the bar page
        router.push("/bar");
      } else {
        // No user, navigate to the welcome page
        router.push("/welcome");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <>{children}</>;
};

export default AuthWrapper;
