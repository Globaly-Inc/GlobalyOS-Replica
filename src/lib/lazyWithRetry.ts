import { lazy } from 'react';

export function lazyWithRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // If a deploy happened, old clients can hit ChunkLoadError / "Failed to fetch dynamically imported module".
      const key = 'lazy_import_retry';
      const hasRetried = sessionStorage.getItem(key) === '1';

      if (!hasRetried) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise<T>(() => {
          // keep suspense while reloading
        });
      }

      throw err;
    }
  });
}
