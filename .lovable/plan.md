
# Enable Multiple Image Uploads in Get Help Dialog

## Overview
Update the Get Help dialog to allow users to upload multiple images during submission, both initially and after files have been added. Currently, only a single screenshot is supported.

---

## Current State Analysis

| Component | Current Behavior |
|-----------|------------------|
| `GetHelpDialog.tsx` | Single file input (`screenshot: File \| null`) |
| `support_requests` table | Single `screenshot_url` column (text) |
| Detail dialogs | Display single image from `screenshot_url` |
| Upload function | Uploads one file to `support-screenshots` bucket |

---

## Implementation Plan

### Part 1: Update State & Types

**File:** `src/components/dialogs/GetHelpDialog.tsx`

Change from single to multiple files:

```tsx
// Before
const [screenshot, setScreenshot] = useState<File | null>(null);
const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

// After
const [screenshots, setScreenshots] = useState<File[]>([]);
const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
```

---

### Part 2: Update File Input for Multiple Selection

**File:** `src/components/dialogs/GetHelpDialog.tsx`

Add `multiple` attribute and update handler:

```tsx
<input
  type="file"
  accept="image/*"
  multiple  // ADD THIS
  className="hidden"
  onChange={handleScreenshotChange}
/>
```

Update handler to append files:

```tsx
const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  
  // Append new files (limit to 5 total)
  const newFiles = [...screenshots, ...files].slice(0, 5);
  setScreenshots(newFiles);
  
  // Generate previews for new files
  const newPreviews: string[] = [];
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      newPreviews.push(e.target?.result as string);
      if (newPreviews.length === files.length) {
        setScreenshotPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
      }
    };
    reader.readAsDataURL(file);
  });
};
```

---

### Part 3: Update Capture Screenshot to Append

**File:** `src/components/dialogs/GetHelpDialog.tsx`

Modify capture function to add to existing array:

```tsx
const handleCaptureScreenshot = async () => {
  if (screenshots.length >= 5) {
    toast.error('Maximum 5 images allowed');
    return;
  }
  
  // ... existing capture logic ...
  
  if (blob) {
    const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
    setScreenshots(prev => [...prev, file].slice(0, 5));
    setScreenshotPreviews(prev => [...prev, URL.createObjectURL(blob)].slice(0, 5));
    toast.success('Screenshot captured');
  }
};
```

---

### Part 4: Update Preview UI for Multiple Images

**File:** `src/components/dialogs/GetHelpDialog.tsx`

Show grid of previews with individual remove buttons, plus ability to add more:

```tsx
{/* Screenshot Previews */}
{screenshotPreviews.length > 0 && (
  <div className="grid grid-cols-3 gap-2 mb-3">
    {screenshotPreviews.map((preview, index) => (
      <div key={index} className="relative group">
        <img 
          src={preview} 
          alt={`Screenshot ${index + 1}`}
          className="h-20 w-full object-cover rounded-lg border"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => handleRemoveScreenshot(index)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    ))}
  </div>
)}

{/* Add More Options (shown if under limit) */}
{screenshotPreviews.length < 5 && (
  <div className="grid grid-cols-2 gap-3">
    {/* Capture + Upload buttons */}
  </div>
)}
```

---

### Part 5: Update Remove Handler

**File:** `src/components/dialogs/GetHelpDialog.tsx`

```tsx
const handleRemoveScreenshot = (index: number) => {
  setScreenshots(prev => prev.filter((_, i) => i !== index));
  setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
};
```

---

### Part 6: Update Submit to Upload Multiple Files

**File:** `src/components/dialogs/GetHelpDialog.tsx`

Upload all screenshots and join URLs:

```tsx
const handleSubmit = async () => {
  // ... validation ...
  
  setIsSubmitting(true);
  try {
    // Upload all screenshots
    const screenshotUrls: string[] = [];
    for (const file of screenshots) {
      const url = await uploadScreenshot(file);
      if (url) screenshotUrls.push(url);
    }
    
    await createRequest.mutateAsync({
      type,
      title,
      description,
      ai_improved_description: aiImprovedDescription || undefined,
      page_url: pageUrl,
      browser_info: browserInfo,
      device_type: deviceType,
      // Store multiple URLs as comma-separated or first URL
      screenshot_url: screenshotUrls.join(',') || undefined,
    });
    
    onOpenChange(false);
  } catch (error) {
    console.error('Failed to submit:', error);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### Part 7: Update Detail Views to Display Multiple Images

**File:** `src/components/super-admin/SupportRequestDetailDialog.tsx`

Parse and display multiple screenshots:

```tsx
{/* Screenshots */}
{request.screenshot_url && (
  <div className="space-y-2">
    <Label className="text-sm">Screenshots</Label>
    <div className="flex flex-wrap gap-2">
      {request.screenshot_url.split(',').map((url, index) => (
        <a key={index} href={url.trim()} target="_blank" rel="noopener noreferrer">
          <img 
            src={url.trim()} 
            alt={`Screenshot ${index + 1}`} 
            className="max-h-32 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
          />
        </a>
      ))}
    </div>
  </div>
)}
```

**File:** `src/components/home/UserSupportRequestDetailSheet.tsx`

Apply the same multi-image display pattern.

---

### Part 8: Update generateLovablePrompt

**File:** `src/utils/generateLovablePrompt.ts`

Handle comma-separated screenshot URLs:

```tsx
// Collect all images
const images: string[] = [];
if (request.screenshot_url) {
  // Support multiple screenshots (comma-separated)
  request.screenshot_url.split(',').forEach(url => {
    if (images.length < 10 && url.trim()) {
      images.push(url.trim());
    }
  });
}
```

---

### Part 9: Reset Form Properly

**File:** `src/components/dialogs/GetHelpDialog.tsx`

Update useEffect to clear arrays:

```tsx
useEffect(() => {
  if (open) {
    setScreenshots([]);
    setScreenshotPreviews([]);
    // ... other resets ...
  }
}, [open, defaultType]);
```

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/components/dialogs/GetHelpDialog.tsx` | Modify | Convert to multi-file state, add `multiple` to input, update UI with grid preview |
| `src/components/super-admin/SupportRequestDetailDialog.tsx` | Modify | Parse comma-separated URLs, display image grid |
| `src/components/home/UserSupportRequestDetailSheet.tsx` | Modify | Same multi-image display pattern |
| `src/utils/generateLovablePrompt.ts` | Modify | Parse comma-separated URLs for Lovable prompt |

---

## Technical Notes

- **Storage Format:** Multiple URLs stored as comma-separated string in existing `screenshot_url` column (no database migration needed)
- **File Limit:** Maximum 5 images to prevent abuse and keep dialog manageable
- **Backward Compatible:** Single URLs still work; comma-separated is additive
- **Preview Memory:** Use `URL.createObjectURL` for better performance with multiple files
