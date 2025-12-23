// PushNavBridge.tsx
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

export default function PushNavBridge() {
  const router = useRouter();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      if (data?.partnerId) {
        router.push({ pathname: "/chat", params: { partner: data.partnerId } });
      }
    });
    return () => sub.remove();
  }, [router]);
  return null;
}
