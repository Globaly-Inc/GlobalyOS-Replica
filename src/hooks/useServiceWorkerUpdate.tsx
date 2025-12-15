import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export const useServiceWorkerUpdate = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 30 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // In the editor/preview environment, an old PWA SW can keep serving cached bundles after refresh.
  // Unregistering ensures the latest UI is always loaded.
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const unregister = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (error) {
        console.warn('SW cleanup failed:', error);
      }
    };

    unregister();
  }, []);

  useEffect(() => {
    if (!needRefresh) return;

    // Auto-apply updates during development/preview to avoid "old UI after refresh" issues.
    if (import.meta.env.DEV) {
      updateServiceWorker(true);
      return;
    }

    toast('New version available!', {
      description: 'Click to update to the latest version.',
      action: {
        label: 'Update',
        onClick: () => {
          updateServiceWorker(true);
        },
      },
      duration: Infinity,
      id: 'sw-update',
    });
  }, [needRefresh, updateServiceWorker]);

  return { needRefresh, updateServiceWorker };
};
