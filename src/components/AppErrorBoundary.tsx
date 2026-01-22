import React from 'react';
import { Button } from '@/components/ui/button';
import { logErrorToDatabase } from '@/hooks/useErrorLogger';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

/**
 * Check if error is a dynamic import/chunk loading failure
 * These happen when browser has stale cached JS referencing old chunks
 */
const isDynamicImportError = (error: Error): boolean => {
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('failed to load module script')
  );
};

/**
 * Clear all caches and service workers, then reload
 */
const hardReload = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
  window.location.reload();
};

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('App render error:', error);
    
    // Auto-recover from dynamic import failures (stale cache)
    if (isDynamicImportError(error)) {
      console.log('[AppErrorBoundary] Dynamic import error detected, auto-recovering...');
      hardReload();
      return;
    }
    
    // Log critical render error to database
    logErrorToDatabase({
      errorType: 'runtime',
      severity: 'critical',
      errorMessage: error.message,
      errorStack: error.stack,
      componentName: 'AppErrorBoundary',
      actionAttempted: 'Page render',
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            This page failed to load
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This can happen after an update when your browser has cached an older version.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button variant="outline" onClick={hardReload}>
              Clear cache & reload
            </Button>
          </div>
        </section>
      </main>
    );
  }
}
