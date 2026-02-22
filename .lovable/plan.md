

## Issue: Blank Pages on Published URL

### Root Cause

The published site at `globalyos.lovable.app` is returning an empty HTML shell with no JavaScript bundles loaded. The fetched HTML shows only:

```text
<div id="root"></div>
```

No `<script>` tags are present, which means the production build either:
1. Has not been published with the latest code changes
2. Had a build failure during the last publish attempt

The **preview environment works correctly** -- it loads the full app with all routes and components.

### What Needs to Happen

**You need to publish the latest changes to production.** This is not a code bug -- it's a deployment issue.

### Steps

1. **Publish the app** -- Click the "Publish" button in the Lovable interface to deploy the latest test build to production
2. **Clear service worker cache** -- After publishing, users may need to hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) or clear their browser cache since the app uses a service worker (PWA with workbox) that may be caching the old broken build
3. **Verify** -- After publishing, open `globalyos.lovable.app` in an incognito/private window to confirm the app loads

### No Code Changes Required

All imports, types, and routes are valid. The recently added accounting/invoicing code (InvoiceEditor, InvoicePublicPage, InvoiceSchedules, etc.) is correctly structured with proper exports and imports. There are no build errors in the codebase.

### Technical Note: Service Worker Consideration

The app uses `vite-plugin-pwa` with workbox for offline caching. If users continue to see blank pages after publishing, the old service worker may be serving stale content. The app already has an `UpdatePrompt` component and `useServiceWorkerUpdate` hook to handle this, but in extreme cases users may need to:
- Unregister the service worker via browser DevTools (Application > Service Workers > Unregister)
- Clear site data (Application > Storage > Clear site data)

