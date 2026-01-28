
# Image Cropper Zoom Range Optimization

## Overview

This plan updates the `ImageCropper` component to:
1. **Fit image to canvas first** - When an image is loaded, calculate the zoom level that makes the image fit perfectly within the crop area
2. **Set zoom range relative to fitted size** - Allow decrease by 30% (0.7x) and increase by 70% (1.7x) from the fitted size

---

## Current Behavior vs. New Behavior

| Aspect | Current | New |
|--------|---------|-----|
| Initial zoom | Set to `minZoom` (0.5) | Calculate "fit zoom" to fill crop area |
| Min zoom | Fixed 0.5 | 70% of fit zoom (30% smaller) |
| Max zoom | Fixed 3.0 | 170% of fit zoom (70% larger) |
| Reset button | Resets to minZoom | Resets to calculated fit zoom |

---

## Implementation Details

### File: `src/components/ui/image-cropper.tsx`

**Changes:**

1. **Add state for calculated fit zoom:**
   ```typescript
   const [fitZoom, setFitZoom] = useState(1);
   ```

2. **Calculate fit zoom when image loads:**
   
   When the image loads, calculate the zoom level that makes the image exactly fill the crop area (not the canvas). This ensures the image covers the entire circular/square crop region.

   ```typescript
   // Calculate zoom to fit image within crop area
   const baseScale = Math.min(canvasSize / img.width, canvasSize / img.height);
   const zoomToFillCrop = cropSize / Math.min(img.width * baseScale, img.height * baseScale);
   const calculatedFitZoom = Math.max(1, zoomToFillCrop);
   
   setFitZoom(calculatedFitZoom);
   setZoom(calculatedFitZoom); // Start at fitted size
   ```

3. **Calculate dynamic min/max zoom:**
   ```typescript
   // 30% decrease from fit = 0.7 × fitZoom
   const effectiveMinZoom = fitZoom * 0.7;
   
   // 70% increase from fit = 1.7 × fitZoom
   const effectiveMaxZoom = fitZoom * 1.7;
   ```

4. **Update slider to use calculated range:**
   ```typescript
   <Slider
     value={[zoom]}
     onValueChange={([value]) => setZoom(value)}
     min={effectiveMinZoom}
     max={effectiveMaxZoom}
     step={0.01}
   />
   ```

5. **Update reset button to use fit zoom:**
   ```typescript
   const handleReset = () => {
     setZoom(fitZoom);
     setPosition({ x: 0, y: 0 });
   };
   ```

---

## Affected Components

All these components use `ImageCropper` and will automatically benefit from the updated zoom behavior:

| Component | Usage |
|-----------|-------|
| `OwnerProfileStep.tsx` | Owner profile avatar during onboarding |
| `CompleteProfileStep.tsx` | Employee profile avatar completion |
| `TeamSeedingStep.tsx` | Team member avatars during setup |
| `LogoUpload.tsx` | Organization logo upload |
| `SpaceImagePicker.tsx` | Chat space icons |
| `ChatHeader.tsx` | Space icon editing |
| `QuickInviteDialog.tsx` | Bulk member avatar uploads |

No changes needed in these files since they use the component's default props.

---

## Technical Notes

- The `fitZoom` calculation ensures the image fills the crop circle/square completely
- Using `0.7` and `1.7` multipliers gives the exact 30% decrease / 70% increase range
- The step size is reduced to `0.01` for smoother zooming within the tighter range
- Props `minZoom` and `maxZoom` will be kept for backward compatibility but will now represent multipliers relative to fit size if needed in future

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/components/ui/image-cropper.tsx` | Modify | Add fit-to-crop calculation, dynamic zoom range |
