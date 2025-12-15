import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e82dc3a3760d4b67b09d75a73e25acd5',
  appName: 'globalyos',
  webDir: 'dist',
  server: {
    url: 'https://e82dc3a3-760d-4b67-b09d-75a73e25acd5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'GlobalyOS'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
