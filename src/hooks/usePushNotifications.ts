import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function usePushNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive alerts for safety events",
        });
        
        // Send test notification
        new Notification("SafePulse Notifications Active", {
          body: "You'll receive emergency alerts and safety updates",
          icon: "/favicon.ico",
          tag: "welcome",
        });
        
        return true;
      } else {
        toast({
          title: "Notifications Blocked",
          description: "Enable notifications in your browser settings",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Notification permission error:", error);
      return false;
    }
  }, [isSupported, toast]);

  const sendNotification = useCallback(
    (title: string, body: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        console.log("Notifications not available");
        return;
      }

      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });
      } catch (error) {
        console.error("Failed to send notification:", error);
      }
    },
    [isSupported, permission]
  );

  const sendEmergencyNotification = useCallback(
    (message: string) => {
      sendNotification("🚨 SafePulse Emergency", message, {
        tag: "emergency",
        requireInteraction: true,
      });
    },
    [sendNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    sendEmergencyNotification,
  };
}
