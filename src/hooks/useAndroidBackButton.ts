import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Hook to handle Android hardware back button
 * Provides proper navigation behavior instead of closing the app unexpectedly
 */
export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Define home paths where back should minimize instead of navigate
  const isHomePath = useCallback((path: string) => {
    // Root path or org home page
    return path === '/' || /^\/org\/[^/]+\/?$/.test(path);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;

    let listenerHandle: { remove: () => void } | null = null;

    const setupListener = async () => {
      listenerHandle = await App.addListener('backButton', ({ canGoBack }) => {
        // If we're at a home/root path, minimize the app
        if (isHomePath(location.pathname)) {
          App.minimizeApp();
          return;
        }

        // If browser history can go back, navigate back
        if (canGoBack && window.history.length > 1) {
          navigate(-1);
        } else {
          // No history, minimize the app
          App.minimizeApp();
        }
      });
    };

    setupListener();

    return () => {
      listenerHandle?.remove();
    };
  }, [navigate, location.pathname, isHomePath]);
};

export default useAndroidBackButton;
