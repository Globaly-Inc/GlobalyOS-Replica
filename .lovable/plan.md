

## Fix Comment Actions Visibility and Add @Mentions to Comments

### Changes Overview

Three issues to address:

---

### 1. Always Show Comment Actions (Resolve, Reaction, More)

**Problem:** The BlockNote library hardcodes `showActions="hover"` on comments, so the emoji, resolve, and "..." buttons only appear on hover.

**Fix:** CSS override to force the action toolbar to always be visible, regardless of hover state.

**File: `src/components/wiki/blocknote-styles.css`**
- Add CSS rules to always display `.bn-comment-actions` by overriding the hover-gated rendering. Since the library conditionally renders the actions wrapper (not just hides via CSS), the most reliable approach is to use CSS on the parent comment to ensure the action toolbar area is always visible when it IS rendered. However, the library only renders the actions DOM when `hovered` is true (via `useHover`).
- Since the library uses conditional rendering (not CSS visibility), the only CSS-based workaround is to use a `pointer-events` + `opacity` trick on the hover ref container. But this won't work because the DOM element literally isn't rendered.
- **Alternative approach**: Override the Mantine Comment component via BlockNote's `ComponentsContext` to always pass `showActions={true}` instead of `"hover"`. This is cleaner.
- **Simplest approach**: Inject a tiny CSS hack that makes the hover target always "hovered" by using `:has()` selector or by styling the wrapping element. Actually, looking at the Mantine source, the `useHover` hook checks for mouseenter/mouseleave. We can override this with CSS: `pointer-events: auto` and force the hovered state via `[class*="bn-thread-comment"]:hover` -- but that still requires hovering.
- **Best approach**: Since the actual rendering is conditional (`doShowActions ? <actions> : null`), CSS alone cannot fix this. We need to override the component. We'll wrap BlockNote's Comment component.

Actually, re-reading the Mantine source more carefully: the `doShowActions` condition is `showActions === true || showActions === undefined || (showActions === "hover" && hovered) || emojiPickerOpen`. If we could set `showActions` to `true`, it would always show. The `showActions` prop comes from the React `Comment` component in `@blocknote/react` which hardcodes `"hover"`.

**The cleanest solution**: Use CSS to force visibility. Even though the library uses conditional rendering, we can use a creative CSS approach: make the hover area detect hover via CSS instead of JS by overriding the conditional rendering. BUT since it's JS-controlled, we truly need to patch the component.

**Practical solution**: We'll create a custom wrapper around BlockNote's components context to override the `Comments.Comment` component, changing `showActions` from `"hover"` to `true`. This ensures the actions are always rendered.

**File: `src/components/wiki/BlockNoteWikiEditor.tsx`**
- Import `useComponentsContext` and wrap BlockNoteView's children to provide a modified components context where `Comments.Comment` always shows actions.

Actually, the simplest pragmatic solution: since `useHover` from Mantine returns `hovered` based on CSS `:hover`, we can use CSS to make the comment container always appear hovered:

```css
.bn-thread-comment {
  /* Force useHover to always detect hover state */
}
```

This won't work because `useHover` uses JS event listeners, not CSS.

**Final approach**: We'll use the `componentOverrides` mechanism if available, or simply patch via a React wrapper that overrides the Components context. Looking at BlockNote's architecture, the cleanest way is to provide component overrides.

Let me reconsider -- looking at the code again, `showActions="hover"` and `hovered` from `useHover`. The actions ARE rendered in the DOM when hovered. We can actually use CSS to keep them visible by preventing the `display: none` or equivalent. But the issue is the library does `{doShowActions ? <Group>actions</Group> : null}` -- truly conditional rendering.

**Most pragmatic solution**: We use a MutationObserver or a custom React component that wraps the thread and forces re-render. But that's overly complex.

**ACTUAL simplest solution**: The floating thread and sidebar thread both render `Comment` components. We can override the `Comments.Comment` Mantine component by providing custom components. BlockNote supports this via its component system.

I'll create a custom `Comment` wrapper component that always passes `showActions={true}` and register it with BlockNote's component system.

---

### 2. Enable @Mentions in Comment Editors  

**Problem:** The comment editor uses a minimal schema (paragraph only) with no mention support. BlockNote v0.46's `CommentsExtension` doesn't have a `mentionUsers` configuration option.

**Solution:** Create a custom comment editor schema that includes a `Mention` inline content spec, and pass it to `CommentsExtension` via the `schema` option. Also add a `SuggestionMenuController` for the `@` trigger character within the comment editor context.

**Files to create/modify:**
- **New: `src/components/wiki/comments/MentionInlineContent.tsx`** - Define a `Mention` inline content spec with a `user` prop and `userId` prop, rendered as a blue-styled span
- **New: `src/components/wiki/comments/commentEditorSchema.ts`** - Custom schema extending the default comment schema with the Mention inline content
- **Modify: `src/components/wiki/BlockNoteWikiEditor.tsx`** - Pass the custom schema to `CommentsExtension` and ensure the `@` suggestion menu is available in comment editors

**Note:** BlockNote comment editors are mini editors created internally. The `CommentsExtension` accepts an optional `schema` parameter which defines what's available in comment editors. By providing a schema with the `mention` inline content type, mentions become available.

For the suggestion menu (showing a dropdown of team members when `@` is typed), we need to hook into the comment editor. Since BlockNote creates the comment editors internally, the suggestion menu needs to be part of the schema or handled at the view level.

**Implementation:**
1. Create a `Mention` inline content spec that renders `@username` in blue
2. Create a custom comment schema including this mention spec
3. Pass the schema to `CommentsExtension`
4. The `@` trigger and user lookup will use the existing `mentionUsers` function from `useResolveUsers`

---

### 3. Mention Styling

**File: `src/components/wiki/blocknote-styles.css`**
- Add styling for mention inline content in comments: blue text, slightly bold, with hover effect

---

### Summary of File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/wiki/comments/MentionInlineContent.tsx` | Create | Mention inline content spec for comment editors |
| `src/components/wiki/comments/commentEditorSchema.ts` | Create | Custom comment editor schema with mention support |
| `src/components/wiki/comments/CommentWithActions.tsx` | Create | Custom Comment component wrapper that always shows actions |
| `src/components/wiki/BlockNoteWikiEditor.tsx` | Modify | Pass custom schema to CommentsExtension, integrate mention support, override comment component |
| `src/components/wiki/blocknote-styles.css` | Modify | Add mention styling (blue text) and comment action visibility overrides |

