import React, { useEffect, useRef } from "react";
import { AppState, TouchableWithoutFeedback } from "react-native";
import { getAuth, signOut } from "firebase/auth";
import { auth } from "../firebase"; // your firebase config file

// Duration in milliseconds (10 minutes)
const INACTIVITY_DURATION = 10 * 60 * 1000;

const InactivityHandler = ({ children }) => {
  const timeoutRef = useRef(null);

  // Function to clear and restart the timer
  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      // Auto logout function after inactivity
      signOut(auth)
        .then(() => {
          console.log("User signed out due to inactivity");
        })
        .catch((error) => {
          console.error("Error signing out:", error);
        });
    }, INACTIVITY_DURATION);
  };

  useEffect(() => {
    // Start timer on mount
    resetTimer();

    // Listen to app state changes and reset timer when the app becomes active
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        resetTimer();
      }
    });

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      subscription.remove();
    };
  }, []);

  return (
    <TouchableWithoutFeedback onPress={resetTimer}>
      {children}
    </TouchableWithoutFeedback>
  );
};

export default InactivityHandler;
