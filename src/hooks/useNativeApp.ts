import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

export type AppState = 'active' | 'inactive' | 'background';

interface UseNativeAppOptions {
  onStateChange?: (state: AppState) => void;
  onDeepLink?: (url: string) => void;
  hideSplashOnMount?: boolean;
}

/**
 * Hook to manage native app lifecycle, deep links, and splash screen
 */
export const useNativeApp = (options: UseNativeAppOptions = {}) => {
  const navigate = useNavigate();
  const { onStateChange, onDeepLink, hideSplashOnMount = true } = options;

  // Hide splash screen when app is ready
  const hideSplash = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await SplashScreen.hide({
        fadeOutDuration: 300,
      });
    } catch (error) {
      console.warn('Failed to hide splash screen:', error);
    }
  }, []);

  // Handle deep links
  const handleDeepLink = useCallback(
    (event: URLOpenListenerEvent) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname + url.search + url.hash;

        // Custom handler if provided
        if (onDeepLink) {
          onDeepLink(event.url);
          return;
        }

        // Default: navigate to the path
        if (path) {
          navigate(path);
        }
      } catch (error) {
        console.warn('Failed to parse deep link:', error);
      }
    },
    [navigate, onDeepLink]
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Hide splash screen on mount
    if (hideSplashOnMount) {
      hideSplash();
    }

    let stateListenerHandle: { remove: () => void } | null = null;
    let urlListenerHandle: { remove: () => void } | null = null;

    const setupListeners = async () => {
      // Listen for app state changes
      stateListenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
        const state: AppState = isActive ? 'active' : 'background';
        onStateChange?.(state);
      });

      // Listen for deep links (app opened via URL)
      urlListenerHandle = await App.addListener('appUrlOpen', handleDeepLink);
    };

    setupListeners();

    // Cleanup listeners
    return () => {
      stateListenerHandle?.remove();
      urlListenerHandle?.remove();
    };
  }, [hideSplash, hideSplashOnMount, handleDeepLink, onStateChange]);

  return {
    hideSplash,
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
};

/**
 * Utility functions for native app operations
 */
export const nativeAppUtils = {
  /**
   * Get app info (version, name, etc.)
   */
  getInfo: async () => {
    if (!Capacitor.isNativePlatform()) {
      return { name: 'GlobalyOS', version: '1.0.0', build: '1', id: 'web' };
    }
    try {
      return await App.getInfo();
    } catch (error) {
      console.warn('Failed to get app info:', error);
      return null;
    }
  },

  /**
   * Get current app state
   */
  getState: async () => {
    if (!Capacitor.isNativePlatform()) return { isActive: true };
    try {
      return await App.getState();
    } catch (error) {
      console.warn('Failed to get app state:', error);
      return { isActive: true };
    }
  },

  /**
   * Minimize the app (Android only)
   */
  minimize: async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      await App.minimizeApp();
    } catch (error) {
      console.warn('Failed to minimize app:', error);
    }
  },

  /**
   * Exit the app (use with caution)
   */
  exit: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await App.exitApp();
    } catch (error) {
      console.warn('Failed to exit app:', error);
    }
  },
};

export default useNativeApp;
