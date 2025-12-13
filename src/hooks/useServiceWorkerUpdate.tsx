import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export const useServiceWorkerUpdate = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
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

  useEffect(() => {
    if (needRefresh) {
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
    }
  }, [needRefresh, updateServiceWorker]);

  return { needRefresh, updateServiceWorker };
};
