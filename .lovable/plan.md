
# Fix PDF Display Size in Lightbox/Full Preview Mode

## Problem Analysis

Looking at the screenshot, the PDF appears very small in the lightbox (full preview) mode. The issue stems from how the container sizing works:

1. **AttachmentRenderer.tsx (line 288)**: The lightbox content is wrapped in `<div className="p-8">` which doesn't define explicit dimensions
2. **PDFViewer.tsx (line 112)**: The className for lightbox is `"min-h-[500px]"` which only sets minimum height, not width
3. **PDFViewer.tsx (line 145)**: The scale calculation uses `containerRef.current.clientWidth` but this is very small because the container has no defined width

The PDF scales based on container width, but in lightbox mode the container collapses to minimum content width, resulting in a tiny PDF.

---

## Solution

Fix the lightbox PDF container to use appropriate dimensions that fill the available viewport space.

### File: `src/components/chat/AttachmentRenderer.tsx`

**Change 1**: Update the PDF wrapper in lightbox mode (line 107-115)

Current code:
```tsx
if (attachmentIsPdf) {
  return (
    <div className="w-full h-full group">
      <PDFViewer
        fileUrl={publicUrl}
        mode={isInLightbox ? 'lightbox' : 'inline'}
        onExpand={isInLightbox ? undefined : () => openLightbox(index)}
        className={isInLightbox ? "min-h-[500px]" : "h-full"}
      />
    </div>
  );
}
```

Updated code:
```tsx
if (attachmentIsPdf) {
  return (
    <div className={cn(
      "group",
      isInLightbox 
        ? "w-[90vw] max-w-4xl" // Give explicit width in lightbox mode
        : "w-full h-full"
    )}>
      <PDFViewer
        fileUrl={publicUrl}
        mode={isInLightbox ? 'lightbox' : 'inline'}
        onExpand={isInLightbox ? undefined : () => openLightbox(index)}
        className={isInLightbox ? "w-full" : "h-full"}
      />
    </div>
  );
}
```

**Change 2**: Update the lightbox content wrapper (line 288) to center content properly

Current code:
```tsx
<div className="p-8">
  {mediaAttachments[currentIndex] && renderMediaItem(mediaAttachments[currentIndex], currentIndex, true)}
</div>
```

Updated code:
```tsx
<div className="p-4 sm:p-8 flex items-center justify-center w-full">
  {mediaAttachments[currentIndex] && renderMediaItem(mediaAttachments[currentIndex], currentIndex, true)}
</div>
```

### File: `src/components/feed/PDFViewer.tsx`

**Change 3**: Update the lightbox scaling logic to use more viewport space (lines 151-155)

Current code:
```tsx
if (mode === 'lightbox') {
  const maxHeight = Math.min(window.innerHeight * 0.7, 800);
  const scaleX = containerWidth / viewport.width;
  const scaleY = maxHeight / viewport.height;
  scale = Math.min(scaleX, scaleY) * (window.devicePixelRatio || 1);
}
```

Updated code:
```tsx
if (mode === 'lightbox') {
  const maxHeight = window.innerHeight * 0.75; // Use 75% of viewport height
  const scaleX = containerWidth / viewport.width;
  const scaleY = maxHeight / viewport.height;
  scale = Math.min(scaleX, scaleY) * (window.devicePixelRatio || 1);
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/chat/AttachmentRenderer.tsx` | Give PDF wrapper explicit width in lightbox mode; improve content centering |
| `src/components/feed/PDFViewer.tsx` | Remove 800px max height cap for better use of viewport |

---

## Result

After these changes:
- PDF in lightbox will use up to 90% of viewport width (capped at ~896px for readability)
- Height will scale proportionally up to 75% of viewport height
- The PDF will be centered and properly sized in the lightbox dialog
- Inline (conversation) view remains unchanged
