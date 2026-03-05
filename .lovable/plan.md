

## Add Edit Contact Dialog (Option 2)

### Changes

| File | Change |
|------|--------|
| `src/components/crm/EditContactDialog.tsx` | **New file** — same form layout as `AddContactDialog`, accepts a `CRMContact`, pre-fills all fields, calls `useUpdateCRMContact` on submit |
| `src/components/crm/ContactListView.tsx` | Add `editContact` state, add "Edit" dropdown item with Pencil icon (between View and Archive), render `EditContactDialog` |

### EditContactDialog Detail

- Props: `contact: CRMContact | null`, `open: boolean`, `onOpenChange: (open: boolean) => void`
- Pre-populates: first_name, last_name, email, phone, job_title, company_id, rating, source, notes
- Uses `useUpdateCRMContact` mutation with the contact's `id`
- Syncs form state when `contact` prop changes via `useEffect`

### ContactListView Changes

- Import `Pencil` from lucide-react and `EditContactDialog`
- Add `const [editContact, setEditContact] = useState<CRMContact | null>(null)`
- Insert dropdown item: `<DropdownMenuItem onClick={() => setEditContact(contact)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>` before Archive
- Render `<EditContactDialog contact={editContact} open={!!editContact} onOpenChange={(o) => !o && setEditContact(null)} />` at the bottom

