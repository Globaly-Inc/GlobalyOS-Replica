import { useEffect, useRef, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION } from '@/lib/version';

export const useServiceWorkerUpdate = () => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      registrationRef.current = r || null;
      console.log(`[SW] Registered. App version: ${APP_VERSION}`);
      
      // Check for updates every 30 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[SW] Registration error:', error);
    },
  });

  // Check for updates when app becomes visible (critical for mobile PWA resume)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && registrationRef.current) {
        console.log('[SW] App visible, checking for updates...');
        registrationRef.current.update();
      }
    };

    // Check for updates when coming back online
    const handleOnline = () => {
      if (registrationRef.current) {
        console.log('[SW] Back online, checking for updates...');
        registrationRef.current.update();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Show prompt when update is detected
  useEffect(() => {
    if (needRefresh) {
      console.log('[SW] New version available, showing update prompt');
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = useCallback(async () => {
    console.log('[SW] User requested update, applying...');
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
      // Force reload after a brief delay to ensure SW is activated
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('[SW] Update failed:', error);
      setIsUpdating(false);
      // Force reload anyway as fallback
      window.location.reload();
    }
  }, [updateServiceWorker]);

  return { 
    needRefresh, 
    showPrompt, 
    isUpdating,
    handleUpdate,
    dismissPrompt: () => setShowPrompt(false),
  };
};
