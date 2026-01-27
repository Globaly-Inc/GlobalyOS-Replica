import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useNativeStatusBar } from '@/hooks/useNativeStatusBar';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useNativeApp } from '@/hooks/useNativeApp';

/**
 * Component that initializes all native mobile features
 * Should be placed inside BrowserRouter but doesn't render anything
 */
export const NativeAppInitializer = () => {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || 'light';

  // Initialize native status bar (syncs with theme)
  useNativeStatusBar(currentTheme);

  // Handle Android hardware back button
  useAndroidBackButton();

  // Handle app lifecycle, deep links, and splash screen
  const { isNative, platform } = useNativeApp({
    hideSplashOnMount: true,
    onStateChange: (state) => {
      console.log('[NativeApp] State changed:', state);
    },
  });

  useEffect(() => {
    if (isNative) {
      console.log(`[NativeApp] Running on ${platform}`);
    }
  }, [isNative, platform]);

  // This component doesn't render anything
  return null;
};

export default NativeAppInitializer;
