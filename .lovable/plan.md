

# Convert Job Description to Rich Text Editor & Include Responsibilities

## Summary
Replace the plain textarea for job descriptions with the existing RichTextEditor component and automatically include both the position description AND responsibilities when an existing position is selected.

## Current Behavior
- Job description uses a plain `Textarea` component (no formatting)
- When selecting an existing position, only the `description` field is copied
- The `responsibilities` array from positions is not fetched or used

## Proposed Behavior
- Job description uses the `RichTextEditor` component with toolbar (bold, italic, lists, etc.)
- When selecting an existing position:
  - The description is added as formatted text
  - The responsibilities are appended as a bulleted list below the description
- AI-generated descriptions also work with the rich text editor

## Implementation Details

### 1. Update usePositions hook to fetch responsibilities

**File:** `src/hooks/usePositions.ts`

Add `responsibilities` to the Position interface and SELECT query:

| Change | Details |
|--------|---------|
| Add to interface | `responsibilities: string[] \| null` |
| Update select query | Add `responsibilities` to the select clause |

### 2. Update PositionCombobox to pass responsibilities

**File:** `src/components/hiring/PositionCombobox.tsx`

Update the `onChange` callback to also include responsibilities:

| Change | Details |
|--------|---------|
| Update onChange signature | `onChange: (value: string, description?: string \| null, responsibilities?: string[] \| null) => void` |
| Pass responsibilities in handleSelect | Include `position.responsibilities` when calling onChange |

### 3. Replace Textarea with RichTextEditor

**File:** `src/pages/hiring/JobCreate.tsx`

| Change | Details |
|--------|---------|
| Import RichTextEditor | Add import from `@/components/ui/rich-text-editor` |
| Replace Textarea | Replace the description Textarea with RichTextEditor |
| Update onChange handler | Combine description + responsibilities into formatted HTML |
| Move AI button to toolbar | Use `renderToolbarRight` prop to place the "Generate with AI" button in the editor toolbar |

### Formatting Logic for Position Selection

When a position is selected, format the content as:

```html
<p>[Position description text]</p>
<p><strong>Key Responsibilities:</strong></p>
<ul>
  <li>Responsibility 1</li>
  <li>Responsibility 2</li>
  ...
</ul>
```

## Technical Details

### Helper function for formatting

```typescript
const formatPositionAsRichText = (
  description: string | null | undefined, 
  responsibilities: string[] | null | undefined
): string => {
  let html = '';
  
  if (description) {
    html += `<p>${description}</p>`;
  }
  
  if (responsibilities && responsibilities.length > 0) {
    html += '<p><strong>Key Responsibilities:</strong></p>';
    html += '<ul>';
    responsibilities.forEach(r => {
      html += `<li>${r}</li>`;
    });
    html += '</ul>';
  }
  
  return html;
};
```

### RichTextEditor integration

The RichTextEditor component already:
- Supports bold, italic, underline, bullet and numbered lists
- Sanitizes HTML with DOMPurify
- Syncs with external value changes (for AI generation)
- Has a `renderToolbarRight` prop for additional toolbar content (perfect for the AI generate button)

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePositions.ts` | Add `responsibilities` to interface and query |
| `src/components/hiring/PositionCombobox.tsx` | Update onChange to include responsibilities |
| `src/pages/hiring/JobCreate.tsx` | Replace Textarea with RichTextEditor, format combined content |

## Visual Changes

Before:
```
+----------------------------------+
| Textarea (plain text, mono font) |
|                                  |
| Supports Markdown formatting     |
+----------------------------------+
```

After:
```
+-----------------------------------------------+
| [B] [I] [U] | [•] [1.] |      [✨ Generate AI] |
+-----------------------------------------------+
|                                               |
| Rich text content with formatting...          |
|                                               |
| Key Responsibilities:                         |
| • Responsibility 1                            |
| • Responsibility 2                            |
|                                               |
+-----------------------------------------------+
```

