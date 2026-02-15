
## Fix: Force Text Type Dropdown to Open Below the Toolbar

**Problem:**
The formatting toolbar now correctly appears below the selected text. However, the "Paragraph / Heading" dropdown inside the toolbar still opens **upward** (above the toolbar), which gets clipped by the header area.

**Solution:**
Add CSS rules in `blocknote-styles.css` that target the Mantine dropdown/popover used by the BlockNote text-type selector and force it to render below the toolbar button instead of above.

**Technical Details:**

**File: `src/components/wiki/blocknote-styles.css`**

Add rules to force BlockNote toolbar dropdowns to open downward:

```css
/* Force all Mantine dropdowns inside the formatting toolbar to open below */
.bn-formatting-toolbar .mantine-Menu-dropdown,
.bn-formatting-toolbar .mantine-Popover-dropdown,
.bn-toolbar .mantine-Menu-dropdown,
.bn-toolbar .mantine-Popover-dropdown {
  top: 100% !important;
  bottom: auto !important;
}
```

Additionally, since BlockNote's Mantine menus use Floating UI internally, we can target the portal-rendered dropdowns more broadly to ensure they always prefer downward placement:

```css
/* Ensure toolbar sub-menus (text type, color, etc.) open downward */
.mantine-Portal .mantine-Menu-dropdown,
.mantine-Portal .mantine-Popover-dropdown {
  margin-top: 4px;
}
```

**File to modify:**
- `src/components/wiki/blocknote-styles.css` (append new CSS rules)
