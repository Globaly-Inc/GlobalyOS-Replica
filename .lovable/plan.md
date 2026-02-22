
# Enhanced Quotation Detail Page — Full-Featured Editor with Live Preview

## Overview
Transform the existing `QuotationDetailPage` into a two-panel editor: a left editing panel with inline editing, drag-and-drop reordering, and full CRUD for options/services/fees, and a right live preview panel showing exactly how the client will see the quotation.

## What Changes

### 1. New Service Hooks (src/services/useCRMQuotations.ts)
Add missing mutation hooks:
- `useUpdateServiceFee` -- inline update of fee name, amount, tax_mode, tax_rate, revenue_type, installment_type, num_installments, installment_details
- `useUpdateOptionService` -- update service_name, partner_id, service_date, sort_order
- `useReorderOptions` -- batch update sort_order for drag-and-drop
- `useReorderServices` -- batch update sort_order for services within an option

### 2. Enhanced QuotationDetailPage (src/pages/crm/QuotationDetailPage.tsx)
Restructure to a **two-panel layout** using `react-resizable-panels`:
- **Left panel (60%)**: The editor (options, services, fees, comments, settings tabs)
- **Right panel (40%)**: Live preview showing client-facing view, styled like `QuotationPublicPage`
- A toggle button to show/hide the preview panel
- Header bar with: back button, quotation number, status badge, contact name, action buttons (Send, Copy Link, Delete)

### 3. Enhanced QuotationOptionEditor (src/components/crm/quotations/QuotationOptionEditor.tsx)
- Add drag-and-drop reordering of services within an option using `@dnd-kit/sortable` (already installed)
- Drag handle (GripVertical) on each service row
- Option-level drag handle for reordering options in the parent

### 4. Enhanced QuotationFeeEditor (src/components/crm/quotations/QuotationFeeEditor.tsx)
Transform from read-only display to **inline editable**:
- Click fee name to edit inline (text input)
- Click amount to edit inline (number input)
- Tax mode toggle (inclusive/exclusive) as a small dropdown
- Tax rate input (number, %)
- Revenue type selector (revenue_from_client / commission_from_partner)
- Installment type selector (equal / custom)
- Number of installments input
- For custom installments: expandable section showing each installment with amount + due date
- All changes auto-save on blur with the new `useUpdateServiceFee` hook
- Visual indicators: commission fees get a purple left border, client revenue gets blue

### 5. New: QuotationLivePreview Component (src/components/crm/quotations/QuotationLivePreview.tsx)
A styled preview panel that mirrors the public quotation page:
- Organization branding header
- Cover letter display
- Options as selectable cards (preview mode, non-interactive selection)
- Services and fees in a clean table layout
- Subtotal, tax, discount, grand total summary
- "This is how your client will see the quotation" header with eye icon
- Refreshes reactively as the user edits the left panel (uses same React Query data)

### 6. New: AddServiceDialog (src/components/crm/quotations/AddServiceDialog.tsx)
Replace the basic select dropdown for adding services with a proper dialog:
- Searchable service list
- Partner/branch selector
- Service date picker
- "Create custom service" option for one-off items

### 7. New: AddFeeDialog (src/components/crm/quotations/AddFeeDialog.tsx)
Replace the inline "Add Fee" button with a dialog:
- Fee name input
- Amount input with currency display
- Tax mode radio (inclusive / exclusive)
- Tax rate input
- Revenue type radio (Revenue from Client / Commission from Partner)
- Installment type radio (Single / Equal Installments / Custom Installments)
- If equal: number of installments input
- If custom: dynamic rows for each installment (amount, due date, label)
- "Add Fee" button to confirm

### 8. Quotation Header Card Enhancement
Replace the basic 4-card grid with a more informative header:
- Contact/company info with avatar
- Assignee info
- Valid until date (editable in draft mode)
- Currency selector (editable in draft mode)
- Cover letter (editable textarea, collapsible)
- Discount amount and description (editable)

## Technical Details

### Files Created (5 new)
| File | Purpose |
|---|---|
| `src/components/crm/quotations/QuotationLivePreview.tsx` | Client-facing preview panel |
| `src/components/crm/quotations/AddServiceDialog.tsx` | Service addition dialog |
| `src/components/crm/quotations/AddFeeDialog.tsx` | Fee creation dialog with installment config |
| `src/components/crm/quotations/SortableServiceItem.tsx` | Drag-and-drop sortable service wrapper |
| `src/components/crm/quotations/SortableOptionItem.tsx` | Drag-and-drop sortable option wrapper |

### Files Modified (4)
| File | Changes |
|---|---|
| `src/services/useCRMQuotations.ts` | Add `useUpdateServiceFee`, `useUpdateOptionService`, `useReorderOptions`, `useReorderServices` hooks |
| `src/pages/crm/QuotationDetailPage.tsx` | Two-panel layout with resizable panels, enhanced header, drag-and-drop for options |
| `src/components/crm/quotations/QuotationOptionEditor.tsx` | Drag-and-drop for services, use AddServiceDialog/AddFeeDialog |
| `src/components/crm/quotations/QuotationFeeEditor.tsx` | Inline editing for all fee fields (name, amount, tax, revenue type, installments) |

### Drag-and-Drop Pattern
Uses the existing `@dnd-kit/sortable` library (already installed) following the same pattern as `FormCanvas.tsx`:
- `DndContext` with `PointerSensor`
- `SortableContext` with `verticalListSortingStrategy`
- `useSortable` hook on each item
- `arrayMove` for reorder logic
- Persist new sort_order to DB on drag end

### Auto-Save Behavior
- Fee inline edits: debounced 500ms auto-save on blur
- Option name/description: save on blur (existing pattern)
- Drag-and-drop reorder: immediate save on drop
- Notes and cover letter: explicit save button (existing pattern)

### Live Preview Data Flow
The preview component reads from the same React Query cache key (`['crm-quotation', id]`). When the editor makes mutations that invalidate this key, the preview auto-refreshes. No extra data fetching needed.
