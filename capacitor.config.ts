import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.globalyos.app',
  appName: 'GlobalyOS',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'GlobalyOS'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false, // We'll hide it manually after app mounts
      backgroundColor: '#6820E4', // GlobalyOS purple
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    App: {
      launchUrl: 'globalyos://',
    },
  },
  server: {
    // For development: uncomment and set to your dev server URL
    // url: 'https://e82dc3a3-760d-4b67-b09d-75a73e25acd5.lovableproject.com?forceHideBadge=true',
    // cleartext: true,
  },
};

export default config;
