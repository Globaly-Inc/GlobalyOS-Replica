import React from 'react';

import { Button } from '@/components/ui/button';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
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
  }

  private hardReload = async () => {
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
            <Button variant="outline" onClick={this.hardReload}>
              Clear cache & reload
            </Button>
          </div>
        </section>
      </main>
    );
  }
}
