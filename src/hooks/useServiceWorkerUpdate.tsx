import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const useServiceWorkerUpdate = () => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      registrationRef.current = r || null;
      
      // Check for updates every 15 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 15 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Check for updates when app becomes visible (critical for mobile PWA resume)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && registrationRef.current) {
        registrationRef.current.update();
      }
    };

    // Check for updates when coming back online
    const handleOnline = () => {
      if (registrationRef.current) {
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

  // Auto-apply updates when detected
  useEffect(() => {
    if (!needRefresh) return;

    // Auto-apply updates immediately - no user interaction needed
    updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker]);

  return { needRefresh, updateServiceWorker };
};
