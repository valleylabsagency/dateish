import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { auth, firestore } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

interface NewMessageContextType {
  newUserMessageCount: number;
  markConversationAsOpened: (partnerId: string) => Promise<void>;
}

export const NewMessageContext = createContext<NewMessageContextType>({
  newUserMessageCount: 0,
  markConversationAsOpened: async () => {},
});

export function NewMessageProvider({ children }: { children: ReactNode }) {
  const [newUserMessageCount, setNewUserMessageCount] = useState(0);
  const [answeredUsers, setAnsweredUsers] = useState<Set<string>>(new Set());
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;

    const chatsRef = collection(firestore, "chats");
    const q = query(
      chatsRef,
      where("visibleFor", "array-contains", currentUserId),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const answered = new Set<string>();
        let count = 0;

        for (const docSnap of snapshot.docs) {
          const conv = docSnap.data();
          const chatId = docSnap.id;
          const partnerUid = conv.users?.find(
            (u: string) => u !== currentUserId
          );
          if (!partnerUid) continue;

          // Check if current user has sent any messages in this chat
          try {
            const messagesRef = collection(
              firestore,
              "chats",
              chatId,
              "messages"
            );
            const userMessagesQuery = query(
              messagesRef,
              where("sender", "==", currentUserId)
            );
            const userMessagesDocs = await getDocs(userMessagesQuery);

            // If user has sent at least one message, mark as answered
            if (userMessagesDocs.size > 0) {
              answered.add(partnerUid);
            } else {
              // Not answered yet, count it
              count++;
            }
          } catch (error) {
            console.error("Error checking user messages:", error);
          }
        }

        setAnsweredUsers(answered);
        setNewUserMessageCount(count);
      },
      (error) => {
        console.error("Error fetching conversations for badge:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const markConversationAsOpened = useCallback(
    async (partnerId: string) => {
      if (!currentUserId || !partnerId) return;

      try {
        // Mark user as answered
        setAnsweredUsers((prev) => new Set([...prev, partnerId]));
      } catch (error) {
        console.error("Error marking conversation as answered:", error);
      }
    },
    [currentUserId]
  );

  return (
    <NewMessageContext.Provider
      value={{
        newUserMessageCount,
        markConversationAsOpened,
      }}
    >
      {children}
    </NewMessageContext.Provider>
  );
}
