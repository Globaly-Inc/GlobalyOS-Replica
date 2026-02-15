

## Change: Set Wiki Editor Background to White

**What will change:**
- The BlockNote editor area background will be set to solid white (`#FFFFFF`) instead of the current `transparent`.

**Technical details:**
- In `src/components/wiki/blocknote-styles.css`, update the `.bn-editor` rule (line 14) from `background: transparent` to `background: #FFFFFF`.
- Also update the `.bn-container .bn-editor` rule (line 18-20) to include the same white background to ensure specificity covers all cases.

This is a single-line CSS change that will immediately make the editor content area white.

