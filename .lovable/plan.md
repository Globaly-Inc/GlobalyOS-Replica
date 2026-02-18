
## Add File Upload & URL Input Question Types to Questions Builder

### What's Being Added

Two new question answer types in `QuestionsBuilder.tsx`:

1. **File Upload** — candidate can upload multiple files (up to 25MB each, any file type)
2. **URL Input** — candidate enters a URL with live validation (must start with `http://` or `https://`)

These will appear as new options in the "Type" dropdown alongside "Paragraph" and "Multiple Choice".

---

### Type System Changes

#### `src/types/hiring.ts`

Extend `AssignmentQuestion.type` from:
```ts
type: 'multiple_choice' | 'paragraph'
```
to:
```ts
type: 'multiple_choice' | 'paragraph' | 'file_upload' | 'url_input'
```

Add optional config fields to `AssignmentQuestion`:
```ts
interface AssignmentQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'paragraph' | 'file_upload' | 'url_input';
  options?: string[];       // for multiple_choice
  required: boolean;
  // New optional config fields:
  max_files?: number;       // for file_upload (default 5)
  max_size_mb?: number;     // for file_upload (default 25)
  accept_all_types?: boolean; // for file_upload (default true)
  url_placeholder?: string; // for url_input (e.g. "https://github.com/your-repo")
}
```

---

### `QuestionsBuilder.tsx` Changes

#### 1. Dropdown — add 2 new types
```
Paragraph
Multiple Choice
File Upload       ← new
URL Input         ← new
```

#### 2. Type label in collapsed header row
Show the correct label for all 4 types in the collapsed card header.

#### 3. Expanded config panels for new types

**File Upload config panel** (shown when `type === 'file_upload'`):
```
┌─────────────────────────────────────────────────────┐
│  Max Files:  [5 ▾]    Max Size per File:  [25 MB ▾] │
│  ✓ Accept all file types (PDF, images, docs, etc.)  │
└─────────────────────────────────────────────────────┘
```
- Max Files: numeric input (1–20), default 5
- Max Size: select dropdown: 5 MB / 10 MB / 25 MB, default 25
- Accept all types toggle: enabled by default

**URL Input config panel** (shown when `type === 'url_input'`):
```
┌──────────────────────────────────────────────────────┐
│  Placeholder hint  [https://github.com/your-repo __ ] │
└──────────────────────────────────────────────────────┘
```
- Optional placeholder text to guide the candidate (e.g. "https://your-portfolio.com")
- Link validation is always enforced: must start with `http://` or `https://`

#### 4. When switching types — clear irrelevant fields
- Switching away from `multiple_choice` → clears `options`
- Switching away from `file_upload` → clears `max_files`, `max_size_mb`, `accept_all_types`
- Switching away from `url_input` → clears `url_placeholder`

---

### `AssignmentPreviewDialog.tsx` Changes

In `AssignmentViewPreview`, add two new rendered states in the questions loop:

**`file_upload` preview:**
```
┌─ Question text * ────────────────────────────────────┐
│                                                      │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│     📤 Drop files here or click to upload            │
│     Up to 5 files • Max 25 MB each                  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
└──────────────────────────────────────────────────────┘
```

**`url_input` preview:**
```
┌─ Question text * ────────────────────────────────────┐
│  🔗  [https://your-url-here ________________ ]       │
│      ✓ Must be a valid URL (https://...)             │
└──────────────────────────────────────────────────────┘
```

---

### `AssignmentSubmission.tsx` Changes (live candidate page)

The questions rendering section (currently missing from the live page but present in the preview) needs to be added and updated to handle the new types. Currently the live page only renders URL fields and file uploads from `expected_deliverables` — the questions within `expected_deliverables.questions` aren't rendered at all.

- Add the questions render block after the file upload section
- Handle `file_upload` type: render `AssignmentFileUpload` component inline (per-question, with its `max_files`/`max_size_mb` config)
- Handle `url_input` type: render an `<Input type="url">` with a `pattern` attribute and inline validation feedback showing "Must be a valid URL starting with https://"
- Handle `paragraph` type: render `<Textarea>`
- Handle `multiple_choice` type: render `<RadioGroup>`
- Wire answers back into `submissionData.text_answers`

---

### Files to Change

| File | Change |
|---|---|
| `src/types/hiring.ts` | Extend `AssignmentQuestion.type` union + add optional config fields |
| `src/components/hiring/QuestionsBuilder.tsx` | Add File Upload & URL Input to type dropdown + config panels |
| `src/components/hiring/AssignmentPreviewDialog.tsx` | Render new question types in preview |
| `src/pages/AssignmentSubmission.tsx` | Render questions (all 4 types) on the live candidate page |

No backend/DB changes needed — the `expected_deliverables` JSONB column already stores questions, and the new fields (`max_files`, `max_size_mb`, `url_placeholder`) are just additional JSON properties.
