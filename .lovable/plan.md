

# Fix: Images Overflowing the Feed on Homepage

## Root Cause

CSS Grid children default to `min-width: auto`, meaning any wide content (images, videos, long URLs) inside a grid cell can push it beyond its track width. The homepage uses a 3-column grid (`grid-cols-3`), but neither the feed column (`HomeMainContent`) nor the sidebar column (`HomeSidebar`) have `min-w-0` set, so large images break out of bounds.

## Fix

Two small changes:

1. **`src/components/home/HomeMainContent.tsx` (line 23):** Add `min-w-0` to the wrapper div so the grid column constrains its content:
   - Before: `<div className="lg:col-span-2 lg:pr-2">`
   - After: `<div className="lg:col-span-2 lg:pr-2 min-w-0">`

2. **`src/components/feed/PostMedia.tsx` (line 109):** Add `max-w-full` to the image wrapper to ensure images never exceed their container:
   - Before: `<div className="relative w-full h-full">`
   - After: `<div className="relative w-full h-full max-w-full overflow-hidden">`

These two changes ensure images are always constrained within the feed column, regardless of their original dimensions.

