import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Hook to manage native status bar appearance based on theme
 * Only runs on native platforms (iOS/Android)
 */
export const useNativeStatusBar = (theme: 'light' | 'dark' | string) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = async () => {
      try {
        // Set status bar style based on theme
        await StatusBar.setStyle({
          style: theme === 'dark' ? Style.Dark : Style.Light,
        });

        // Set background color to match app theme
        // Only supported on Android
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({
            color: theme === 'dark' ? '#1a1625' : '#f5f3ff',
          });
        }
      } catch (error) {
        console.warn('Failed to update status bar:', error);
      }
    };

    updateStatusBar();
  }, [theme]);
};

/**
 * Utility to show/hide status bar
 */
export const statusBarUtils = {
  show: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.show();
    } catch (error) {
      console.warn('Failed to show status bar:', error);
    }
  },
  hide: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.hide();
    } catch (error) {
      console.warn('Failed to hide status bar:', error);
    }
  },
  setOverlaysWebView: async (overlay: boolean) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.setOverlaysWebView({ overlay });
    } catch (error) {
      console.warn('Failed to set status bar overlay:', error);
    }
  },
};
