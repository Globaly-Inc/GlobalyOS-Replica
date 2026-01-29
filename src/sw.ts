/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Take control immediately
self.skipWaiting();
clientsClaim();

// Clean up old caches
cleanupOutdatedCaches();

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching for Supabase API calls
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
    networkTimeoutSeconds: 10,
  })
);

// Push notification handlers
self.addEventListener('push', (event) => {
  console.log('[SW Push] Event received');

  // Verify notification permission first
  if (Notification.permission !== 'granted') {
    console.warn('[SW Push] Notification permission not granted:', Notification.permission);
    return;
  }

  let data: {
    title: string;
    body: string;
    icon: string;
    badge: string;
    url: string;
    tag: string;
    data?: {
      type?: string;
      call_id?: string;
      caller_name?: string;
      call_type?: string;
      organization_slug?: string;
      message_id?: string;
      conversation_id?: string;
      space_id?: string;
      [key: string]: unknown;
    };
    requireInteraction?: boolean;
  } = {
    title: 'GlobalyOS Notification',
    body: 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    url: '/',
    tag: 'default',
  };

  // Parse push data with enhanced logging
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW Push] Payload received:', JSON.stringify(payload));
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW Push] Error parsing push data:', e);
      // Try text fallback
      try {
        const text = event.data.text();
        console.log('[SW Push] Raw text:', text);
        data.body = text;
      } catch (textError) {
        console.error('[SW Push] Error getting text:', textError);
      }
    }
  } else {
    console.warn('[SW Push] No data in push event');
  }

  // Check notification types
  const isIncomingCall = data.data?.type === 'incoming_call';
  const isChatMessage = data.data?.type === 'chat_message';

  // Use unique tag if not provided to prevent silent replacement
  const notificationTag = data.tag || `msg-${Date.now()}`;
  
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean; actions?: Array<{ action: string; title: string }> } = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    vibrate: isIncomingCall ? [300, 100, 300, 100, 300, 100, 300] : [100, 50, 100],
    data: {
      ...data.data,
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    tag: notificationTag,
    renotify: isIncomingCall, // Only renotify for calls to prevent silent replacement
    silent: false,
    requireInteraction: isIncomingCall || data.requireInteraction,
  };

  // Add action buttons based on notification type
  if (isIncomingCall) {
    options.actions = [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' },
    ];
  } else if (isChatMessage) {
    options.actions = [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  }

  console.log('[SW Push] Showing notification:', data.title, JSON.stringify(options));

  // Show notification with error handling and diagnostics
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(async () => {
        console.log('[SW Push] Notification shown successfully');
        // Diagnostic: count active notifications to confirm creation
        const activeNotifications = await self.registration.getNotifications();
        console.log(`[SW Push] Active notifications: ${activeNotifications.length}`, 
          activeNotifications.map(n => ({ tag: n.tag, title: n.title })));
      })
      .catch((error) => {
        console.error('[SW Push] Failed to show notification:', error);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notificationData = event.notification.data || {};
  const isIncomingCall = notificationData.type === 'incoming_call';
  const action = (event as any).action;
  
  event.notification.close();

  // Handle call notification actions
  if (isIncomingCall && action === 'decline') {
    // Decline the call via edge function
    const callId = notificationData.call_id;
    if (callId) {
      event.waitUntil(
        fetch(`https://rygowmzkvxgnxagqlyxf.supabase.co/functions/v1/decline-call-from-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ call_id: callId }),
        }).catch(err => console.error('Failed to decline call:', err))
      );
    }
    return;
  }

  // For answer action or regular click, open the app
  const urlToOpen = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          (client as WindowClient).focus();
          (client as WindowClient).navigate(urlToOpen);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
