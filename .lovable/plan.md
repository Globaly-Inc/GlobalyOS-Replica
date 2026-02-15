

## Fix Wiki Editor Layout: Sticky Toolbar and Comment Positioning

### Issues Identified (from screenshot)

1. **Toolbar not fixed**: The BlockNote formatting toolbar scrolls with the content. It should stay pinned below the header so users always have access to formatting tools.
2. **Content scrolling**: Only the content area below the toolbar should scroll, not the entire page including the toolbar.
3. **Comment positioning**: Comment thread popovers appear misaligned -- they should anchor to the start of the highlighted/commented text.

---

### Technical Changes

**1. `src/components/wiki/BlockNoteWikiEditor.tsx`**

- Restructure the component layout so the formatting toolbar is rendered as a **static bar** above the scrollable content area, instead of as a floating toolbar that appears on text selection.
- Wrap the editor in a flex-column layout:
  - Top: A sticky/fixed formatting toolbar div (non-scrolling)
  - Bottom: A scrollable container holding the actual editor content
- Replace the floating `FormattingToolbarController` with a static toolbar rendered outside the scroll container, using `editor` API methods to trigger formatting commands.
- Apply `overflow-y: auto` only to the content container, with the toolbar having `flex-shrink: 0`.

**2. `src/pages/WikiEditPage.tsx`**

- Adjust the editor container div to ensure the toolbar stays visible. Pass a prop or restructure so that:
  - The header remains sticky at the very top
  - The formatting toolbar sits directly below the header (also sticky/fixed)
  - The content area fills the remaining space and scrolls independently

**3. `src/components/wiki/blocknote-styles.css`**

- Add CSS to ensure the BlockNote formatting toolbar (`.bn-formatting-toolbar` or custom static bar) is sticky within the editor wrapper.
- Adjust comment thread floating position styles so threads anchor at the start (left edge) of the comment mark rather than center or end. Override the floating-ui placement for comment threads to use `bottom-start` alignment.
- Add rules for the static toolbar styling (border-bottom, background, padding).

**4. Comment anchor positioning**

- In the `BlockNoteWikiEditor` component, if BlockNote exposes floating-UI options for comment thread placement, configure them to use `start` alignment so the comment popover opens at the beginning of the highlighted text.
- Add CSS overrides in `blocknote-styles.css` to ensure `.bn-floating-thread` and related elements align to the left edge of the comment mark.

---

### Summary of Layout After Fix

```text
+------------------------------------------+
|  Header (sticky): Title | Share | Delete  |
+------------------------------------------+
|  Toolbar (sticky): H3 B I U S ...         |
+------------------------------------------+
|                                          |
|  Scrollable Content Area                 |
|                                          |
|  [highlighted text] <-- comment anchors  |
|       here at start of highlight         |
|                                          |
+------------------------------------------+
```

