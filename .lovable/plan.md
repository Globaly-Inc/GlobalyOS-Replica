

## Fix: Show full-width images with natural height in the Social Feed

### Problem
Single images in feed posts are forced into a 16:9 `aspect-video` container with `object-cover`, which crops images that don't match that ratio. The user wants the full image visible at full width, with height adjusting naturally.

### Changes — single file: `src/components/feed/PostMedia.tsx`

**1. Single image container (line 144)**
- Remove the fixed `aspect-video` class for single non-PDF images
- Let the image's natural aspect ratio determine the height
- Add a `max-h-[500px]` cap to prevent extremely tall images from dominating the feed

**2. Image rendering (lines 109-116)**
- Change from `object-cover` (crops) to `object-contain` (shows full image) for inline feed images
- Keep `w-full` so the image spans the container width
- Change from `h-full` to `h-auto` so height follows the image's natural ratio

The result: images will always show their full content at the container's full width, with height adjusting to match the image's natural proportions, capped at a reasonable maximum.

