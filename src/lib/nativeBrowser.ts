import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Open an external URL in the appropriate browser
 * - On native: opens in system browser or in-app browser
 * - On web: opens in new tab
 */
export const openExternalUrl = async (
  url: string,
  options?: {
    presentationStyle?: 'fullscreen' | 'popover';
    toolbarColor?: string;
  }
): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({
        url,
        presentationStyle: options?.presentationStyle || 'popover',
        toolbarColor: options?.toolbarColor,
      });
    } catch (error) {
      console.warn('Failed to open URL in native browser:', error);
      // Fallback to window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Close the in-app browser (native only)
 */
export const closeBrowser = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Browser.close();
  } catch (error) {
    console.warn('Failed to close browser:', error);
  }
};

/**
 * Add listener for browser events (native only)
 */
export const addBrowserListeners = (callbacks: {
  onFinished?: () => void;
  onLoaded?: () => void;
}) => {
  if (!Capacitor.isNativePlatform()) {
    return { remove: () => {} };
  }

  const listeners: Array<{ remove: () => void }> = [];

  if (callbacks.onFinished) {
    Browser.addListener('browserFinished', callbacks.onFinished).then((l) =>
      listeners.push(l)
    );
  }

  if (callbacks.onLoaded) {
    Browser.addListener('browserPageLoaded', callbacks.onLoaded).then((l) =>
      listeners.push(l)
    );
  }

  return {
    remove: () => {
      listeners.forEach((l) => l.remove());
    },
  };
};

export default {
  openExternalUrl,
  closeBrowser,
  addBrowserListeners,
};
