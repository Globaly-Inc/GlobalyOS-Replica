

# Add Text Size Option to Rich Text Editor Toolbar

## What Changes

Add a font size control to the simple rich text editor toolbar (used in job editing and other forms), matching the pattern already used in the Wiki editor toolbar.

## Implementation

### File: `src/components/ui/rich-text-editor.tsx`

1. **Import** `Type` icon from `lucide-react` and `Input` from `@/components/ui/input`
2. **Add state** for text size tracking:
   - `textSizeInput` (string state for the input field, default `"14"`)
3. **Add `applyFontSize` function** that wraps the current selection in a `<span>` with inline `font-size` style using `document.execCommand('fontSize', ...)` workaround (since `fontSize` command uses fixed 1-7 scale, we use `insertHTML` with a styled span instead)
4. **Add text size UI** after the Underline button and before the list divider:
   - A `Type` icon label
   - A small numeric `Input` (width ~48px) showing the current size
   - On blur or Enter key, apply the font size to the current selection
5. **Update `sanitizeHtml`** to allow the `style` attribute on `span` tags (restricted to `font-size` only) so the size styling is preserved

### Visual placement

```text
[B] [I] [U] | [T 14] | [List] [Ordered] ...  [Improve with AI]
                ^new
```

### Technical Details

- Use `document.execCommand('fontSize', false, '7')` then find the generated `<font>` tag and replace it with a `<span style="font-size: Xpx">` for modern HTML compliance
- Size range: 8-72px, validated on blur
- The wiki editor's approach (in `EditorToolbar.tsx`) will be followed for consistency

