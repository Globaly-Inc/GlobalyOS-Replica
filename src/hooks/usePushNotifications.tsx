import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | null;
  loading: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: null,
    loading: true,
  });

  // Check if push notifications are supported
  const isSupported = () => {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  };

  // Get VAPID public key from edge function
  const getVapidPublicKey = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
      if (error) throw error;
      return data?.vapidPublicKey || null;
    } catch (error) {
      console.error("Error fetching VAPID public key:", error);
      return null;
    }
  };

  // Convert base64 to Uint8Array for applicationServerKey
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported() || !user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setState((prev) => ({
        ...prev,
        isSupported: true,
        isSubscribed: !!subscription,
        permission: Notification.permission,
        loading: false,
      }));
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  // Register service worker
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("Service Worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  };

  // Subscribe to push notifications
  const subscribe = async (): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to enable notifications");
      return false;
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setState((prev) => ({ ...prev, permission, loading: false }));
        return false;
      }

      // Register service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await registerServiceWorker();
      }

      if (!registration) {
        toast.error("Failed to register service worker");
        setState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        toast.error("Failed to get notification configuration");
        setState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Extract keys from subscription
      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh;
      const auth = subscriptionJson.keys?.auth;

      if (!p256dh || !auth) {
        toast.error("Failed to get subscription keys");
        setState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) {
        console.error("Error saving subscription:", error);
        toast.error("Failed to save notification subscription");
        setState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      toast.success("Push notifications enabled");
      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        permission: "granted",
        loading: false,
      }));
      return true;
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error("Failed to enable push notifications");
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setState((prev) => ({ ...prev, loading: true }));

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

      toast.success("Push notifications disabled");
      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        loading: false,
      }));
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast.error("Failed to disable push notifications");
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (isSupported()) {
      registerServiceWorker().then(() => {
        checkSubscription();
      });
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
};
