
# System-Wide PDF Full Preview Enhancement

## Overview

Update all PDF preview components to display PDFs at the same size as images in lightbox mode, with an enhanced page slider for better navigation.

---

## Current State Analysis

| Component | Image Lightbox | PDF Lightbox |
|-----------|----------------|--------------|
| AttachmentRenderer | `max-w-full max-h-[80vh]` | `w-[90vw] max-w-4xl` - **smaller** |
| PostMedia | `max-w-full max-h-[80vh]` | `min-h-[500px]` - **inconsistent** |
| ChatRightPanelEnhanced | `max-w-full max-h-[80vh]` | `min-h-[500px]` - **inconsistent** |
| WikiFilePreview | Uses zoom + `max-h-full` | Uses iframe - **different system** |

---

## Solution

### 1. Update PDFViewer Component for Consistent Sizing

**File: `src/components/feed/PDFViewer.tsx`**

**Changes:**
- Increase lightbox scaling to match image sizing (`max-h-[80vh]` equivalent)
- Make page slider more prominent in lightbox mode (larger track, cleaner styling)
- Add download button to lightbox controls

```text
Lightbox mode improvements:
- Scale calculation: use 80% of viewport height (matching images)
- Controls: larger slider track, page number on left, download on right
- Container: explicit `max-w-full` to match image behavior
```

### 2. Update AttachmentRenderer (Chat) 

**File: `src/components/chat/AttachmentRenderer.tsx`**

**Lines 107-120:**
- Remove explicit width constraints (`w-[90vw] max-w-4xl`)
- Let PDF expand to match image sizing pattern

```tsx
// Before
isInLightbox ? "w-[90vw] max-w-4xl" : "w-full h-full"

// After  
isInLightbox ? "w-full flex items-center justify-center" : "w-full h-full"
```

### 3. Update PostMedia (Feed)

**File: `src/components/feed/PostMedia.tsx`**

**Lines 71-83:**
- Update PDF wrapper to match image pattern
- Pass consistent className for lightbox mode

```tsx
// Before
className={isInLightbox ? "min-h-[500px]" : "h-full"}

// After
className={isInLightbox ? "w-full max-w-5xl" : "h-full"}
```

**Line 207:**
- Update lightbox content wrapper to center properly

### 4. Update ChatRightPanelEnhanced (Shared Files Panel)

**File: `src/components/chat/ChatRightPanelEnhanced.tsx`**

**Lines 1087-1092:**
- Update PDF lightbox wrapper to match image sizing
- Remove fixed `min-h-[500px]` class

```tsx
// Before
<PDFViewer
  fileUrl={...}
  mode="lightbox"
  className="min-h-[500px]"
/>

// After
<div className="w-full max-w-5xl mx-auto">
  <PDFViewer
    fileUrl={...}
    mode="lightbox"
    className="w-full"
  />
</div>
```

### 5. Update WikiFilePreview (Wiki Files)

**File: `src/components/wiki/WikiFilePreview.tsx`**

**Lines 269-276:**
- Replace iframe with PDFViewer component for consistency
- Add proper import for PDFViewer

```tsx
// Before (iframe-based)
{isPdf && currentItem.file_url && (
  <iframe
    src={`${currentItem.file_url}#toolbar=1&navpanes=0`}
    className="w-full h-full max-w-4xl"
    title={currentItem.title}
  />
)}

// After (PDFViewer-based)
{isPdf && currentItem.file_url && (
  <div className="w-full max-w-5xl h-full">
    <PDFViewer
      fileUrl={currentItem.file_url}
      mode="lightbox"
      className="w-full h-full"
    />
  </div>
)}
```

---

## Enhanced Page Slider Design

The PDFViewer controls will be updated to be more user-friendly:

```text
+--------------------------------------------------+
|                                                  |
|              [PDF PAGE CONTENT]                  |
|              Fills up to 80vh                    |
|                                                  |
+--------------------------------------------------+
| [◀] [━━━━━━━━━━●━━━━━━━━━━━━] [▶]   2 / 8   [⬇]  |
+--------------------------------------------------+
      ↑                                        ↑
   Larger slider track               Download button
   (8px height in lightbox)
```

**PDFViewer.tsx control updates:**
- Slider track height: 6px (inline) → 8px (lightbox)
- Add download button in lightbox mode
- Slightly larger navigation buttons in lightbox

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/feed/PDFViewer.tsx` | Update scale to 80vh, enhance slider styling, add download button |
| `src/components/chat/AttachmentRenderer.tsx` | Remove width constraints, use flex centering |
| `src/components/feed/PostMedia.tsx` | Update PDF wrapper sizing |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Add wrapper for consistent PDF sizing |
| `src/components/wiki/WikiFilePreview.tsx` | Replace iframe with PDFViewer, add import |

---

## Result

After these changes:
- PDFs in lightbox mode will display at the same size as images (up to 80% viewport height)
- Page slider will be more prominent and easier to use
- All PDF preview locations will have consistent behavior
- Download button available directly in the PDF lightbox controls
