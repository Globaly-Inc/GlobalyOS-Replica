// Build version - automatically updated at build time
// Format: YYYY.MM.DD.HHMM (build timestamp)
export const APP_VERSION = __APP_VERSION__;
export const BUILD_TIME = __BUILD_TIME__;

// Declare the global constants (set by Vite define)
declare global {
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;
}
