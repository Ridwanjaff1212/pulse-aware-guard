import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useWebPushNotifications(userId: string | undefined) {
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "default",
    isSubscribed: false,
    isLoading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
      
      setState(prev => ({
        ...prev,
        isSupported,
        permission: isSupported ? Notification.permission : "denied",
        isLoading: false,
      }));

      if (isSupported && userId) {
        // Check if already subscribed
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          setState(prev => ({ ...prev, isSubscribed: true }));
        }
      }
    };

    checkSupport();
  }, [userId]);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!state.isSupported || !userId) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device.",
        variant: "destructive",
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== "granted") {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Save subscription to database
      const subscriptionJson = subscription.toJSON();
      
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscriptionJson.keys?.p256dh || "",
        auth_key: subscriptionJson.keys?.auth || "",
        device_name: navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop",
      }, {
        onConflict: "endpoint",
      });

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: true }));

      toast({
        title: "Notifications Enabled",
        description: "You'll receive emergency alerts on this device.",
      });

      // Send test notification
      await supabase.functions.invoke("send-push-notification", {
        body: { type: "test", userId },
      });

      return true;
    } catch (error) {
      console.error("Push subscription error:", error);
      toast({
        title: "Subscription Failed",
        description: "Could not enable push notifications.",
        variant: "destructive",
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isSupported, userId, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!userId) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }

      setState(prev => ({ ...prev, isSubscribed: false }));

      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications on this device.",
      });

      return true;
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId, toast]);

  // Send emergency notification to contacts
  const sendEmergencyAlert = useCallback(async (incidentId?: string, message?: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          type: "emergency",
          userId,
          incidentId,
          message,
        },
      });

      if (error) throw error;

      toast({
        title: "Alerts Sent",
        description: "Emergency contacts have been notified.",
      });

      return true;
    } catch (error) {
      console.error("Emergency alert error:", error);
      return false;
    }
  }, [userId, toast]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendEmergencyAlert,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
