
## Show Internal / Past Member Tags on Candidate Cards

### What this does
When a candidate's email matches a current team member (status = `active` or `invited`), their card in the pipeline shows a green **"Internal"** badge. If the email matches an inactive/former team member (status = `inactive`), it shows a muted amber **"Past Member"** badge.

### How it works

The `employee_directory` view already has `email` and `status` columns. The board just needs to look up the list of org members and cross-reference candidate emails.

**Data flow:**
1. A new hook `useOrgMemberEmails` is added directly inside `HiringKanbanBoard.tsx` (or co-located in `useHiring.ts`). It fetches `email` and `status` from `employee_directory` for the current org.
2. A lookup map `{ [email]: 'active' | 'invited' | 'inactive' }` is derived from that data.
3. For each candidate card, their email is checked against the map and the correct badge is rendered.

### Technical Details

**New hook (added to `HiringKanbanBoard.tsx`):**
```typescript
function useOrgMemberEmails() {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['org-member-emails', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_directory')
        .select('email, status')
        .eq('organization_id', currentOrg!.id);
      if (error) throw error;
      // Build email -> status map
      const map: Record<string, string> = {};
      for (const emp of data || []) {
        if (emp.email) map[emp.email.toLowerCase()] = emp.status;
      }
      return map;
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Badge rendering inside the card (after the name):**
```tsx
const memberStatus = memberEmailMap?.[email.toLowerCase()];
{memberStatus === 'active' || memberStatus === 'invited' ? (
  <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">
    Internal
  </Badge>
) : memberStatus === 'inactive' ? (
  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
    Past Member
  </Badge>
) : null}
```

The badge appears inline next to the candidate name on the same line using a `flex items-center gap-1.5 flex-wrap` wrapper.

### Files Changed
- **`src/components/hiring/pipeline/HiringKanbanBoard.tsx`**: Add `useOrganization`, `useQuery`, `supabase` imports; add `useOrgMemberEmails` hook; render the badge inline in the card's name row.

No database changes, no new files, no RLS changes needed — `employee_directory` is already accessible to org members.
