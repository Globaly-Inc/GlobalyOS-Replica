

## Display Access Group Name in Space Chat Header

### Overview
Add the access group name after the member count in the Space chat header. The display format will be:
- **Company-wide spaces**: "51 members · Everyone"
- **Office-scoped spaces**: "12 members · GlobalyHub Australia"
- **Project-scoped spaces**: "8 members · Agentcis"
- **Private member spaces**: "5 members · Private"

---

### Current State
- The header currently shows only: `{spaceMembers.length} member(s)`
- Located in `src/components/chat/ChatHeader.tsx` at lines 735-737
- The `useSpace` hook fetches space data but does NOT include:
  - `access_scope` field
  - Related office names (from `chat_space_offices` junction table)
  - Related project names (from `chat_space_projects` junction table)
- The `ChatSpace` type already supports `offices` and `projects` arrays

---

### Implementation Steps

#### Step 1: Extend useSpace Hook Query
Update `src/services/useChat.ts` to fetch additional fields including `access_scope` and related office/project names via joins.

**Current query (line 1216-1220):**
```typescript
const { data, error } = await supabase
  .from('chat_spaces')
  .select('*')
  .eq('id', spaceId)
  .single();
```

**Updated query:**
```typescript
const { data, error } = await supabase
  .from('chat_spaces')
  .select(`
    *,
    chat_space_offices(
      offices:office_id(id, name)
    ),
    chat_space_projects(
      projects:project_id(id, name)
    )
  `)
  .eq('id', spaceId)
  .single();
```

**Updated return type (line 1224-1233):**
```typescript
return {
  id: data.id,
  name: data.name,
  description: data.description,
  space_type: data.space_type,
  access_type: data.access_type,
  access_scope: data.access_scope,
  icon_url: data.icon_url,
  archived_at: data.archived_at,
  archived_by: data.archived_by,
  offices: data.chat_space_offices?.map((o: any) => o.offices).filter(Boolean) || [],
  projects: data.chat_space_projects?.map((p: any) => p.projects).filter(Boolean) || [],
};
```

---

#### Step 2: Create Access Group Label Helper in ChatHeader
Add a helper function in `src/components/chat/ChatHeader.tsx` to determine the label based on access scope.

```typescript
const getAccessGroupLabel = () => {
  if (!space) return null;
  
  // Company-wide access
  if (space.access_scope === 'company') {
    return 'Everyone';
  }
  
  // Office-scoped access
  if (space.access_scope === 'offices' && space.offices?.length > 0) {
    return space.offices.map(o => o.name).join(', ');
  }
  
  // Project-scoped access
  if (space.access_scope === 'projects' && space.projects?.length > 0) {
    return space.projects.map(p => p.name).join(', ');
  }
  
  // Private member-scoped access
  if (space.access_scope === 'members') {
    return 'Private';
  }
  
  return null;
};

const accessGroupLabel = getAccessGroupLabel();
```

---

#### Step 3: Update Header Display
Modify lines 735-737 in `ChatHeader.tsx` to include the access group label.

**Current:**
```tsx
<p className="text-xs text-muted-foreground">
  {spaceMembers.length} member{spaceMembers.length !== 1 ? 's' : ''}
</p>
```

**Updated:**
```tsx
<p className="text-xs text-muted-foreground">
  {spaceMembers.length} member{spaceMembers.length !== 1 ? 's' : ''}
  {accessGroupLabel && ` · ${accessGroupLabel}`}
</p>
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/services/useChat.ts` | Update `useSpace` hook (lines 1210-1237) to fetch `access_scope` and join office/project names |
| `src/components/chat/ChatHeader.tsx` | Add `getAccessGroupLabel` helper function and update subtitle display (lines 735-737) |

---

### Expected Results

| Access Scope | Display |
|--------------|---------|
| `company` | "51 members · Everyone" |
| `offices` | "12 members · GlobalyHub Australia" |
| `projects` | "8 members · Agentcis" |
| `members` (private) | "5 members · Private" |

---

### Technical Notes
- The `ChatSpace` type in `src/types/chat.ts` already defines `access_scope: AccessScope` and optional `offices`/`projects` arrays, so no type changes needed
- The junction tables `chat_space_offices` and `chat_space_projects` already exist in the database
- For multiple offices/projects, names will be comma-separated (e.g., "Office A, Office B")

