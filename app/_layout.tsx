import React, { useState, createContext, useEffect, useContext } from "react";
import { View, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Stack, usePathname } from "expo-router";
import Navbar from "../components/Navbar";
import { ProfileProvider } from "../contexts/ProfileContext";
import { FirstTimeProvider } from "../contexts/FirstTimeContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { NotificationProvider, NotificationContext } from "@/contexts/NotificationContext";
import AuthWrapper from "@/contexts/AuthContext";

import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";

import InAppNotification from "../components/InAppNotification";
import OfflineNotice from "../components/OfflineNotice";

// Firebase imports for global notifications
import { auth, firestore } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

export const NavbarContext = createContext({
  showWcButton: false,
  setShowWcButton: (value: boolean) => {},
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showWcButton, setShowWcButton] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Hide bottom navigation bar
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  // Hide navbar on /profile, /welcome, and /chat pages.
  const hideNavbar =
    pathname === "/profile" || pathname === "/welcome" || pathname === "/chat";

  // Determine if we should wrap in MusicProvider.
  const shouldWrapMusic = pathname !== "/welcome";

  return (
    <AuthWrapper>
      {shouldWrapMusic ? (
        <MusicProvider>
          <NotificationProvider>
            <GlobalChatNotifier />
            <FirstTimeProvider>
              <ProfileProvider>
                <NavbarContext.Provider value={{ showWcButton, setShowWcButton }}>
                  <View style={styles.container}>
                    <OfflineNotice />
                    <NotificationDisplay />
                    {!hideNavbar && <Navbar />}
                    <Stack screenOptions={{ headerShown: false }} />
                    <StatusBar hidden />
                  </View>
                </NavbarContext.Provider>
              </ProfileProvider>
            </FirstTimeProvider>
          </NotificationProvider>
        </MusicProvider>
      ) : (
        <NotificationProvider>
          <GlobalChatNotifier />
          <FirstTimeProvider>
            <ProfileProvider>
              <NavbarContext.Provider value={{ showWcButton, setShowWcButton }}>
                <View style={styles.container}>
                  <OfflineNotice />
                  <NotificationDisplay />
                  {!hideNavbar && <Navbar />}
                  <Stack screenOptions={{ headerShown: false }} />
                  <StatusBar hidden />
                </View>
              </NavbarContext.Provider>
            </ProfileProvider>
          </FirstTimeProvider>
        </NotificationProvider>
      )}
    </AuthWrapper>
  );
}

function NotificationDisplay() {
  const { visible, message, chatId, senderName, hideNotification } = useContext(NotificationContext);
  return (
    <InAppNotification
      visible={visible}
      message={message}
      chatId={chatId}
      senderName={senderName}
      onDismiss={hideNotification}
    />
  );
}

// GlobalChatNotifier subscribes to any chat the current user is in,
// so that if a new message arrives (and is not sent by the current user),
// a notification is shown.
function GlobalChatNotifier() {
  const { showNotification } = useContext(NotificationContext);
  const currentUser = auth.currentUser;
  
  useEffect(() => {
    if (!currentUser) return;
    // Query chats where current user is a participant.
    const chatsRef = collection(firestore, "chats");
    const q = query(
      chatsRef,
      where("users", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const chatData = change.doc.data();
          // Assuming chatData includes lastMessage, lastMessageSender, and partnerName.
          if (
            chatData.lastMessage &&
            chatData.lastMessageSender &&
            chatData.lastMessageSender !== currentUser.uid
          ) {
            // Only trigger if not already on the chat page.
            // You can further check pathname if needed.
            showNotification(
              chatData.lastMessage,
              change.doc.id, // using doc id as chatId
              chatData.partnerName || "Partner"
            );
          }
        }
      });
    });
    return () => unsubscribe();
  }, [currentUser, showNotification]);
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
