
# Super Admin Master Code for Login (Revised)

## Overview

Implement a "Master Code" feature that allows Super Admins to generate a persistent 6-digit code for any user. This master code can be used alongside (or instead of) the regular OTP to log into any user's account for support/debugging purposes. **Codes do not expire and remain in the system until manually deleted by a Super Admin.**

---

## Key Changes from Previous Plan

| Original | Revised |
|----------|---------|
| 10-minute expiration | **No expiration** - codes persist until deleted |
| Single use (marked as used) | **Reusable** - can be used multiple times |
| Auto-cleanup needed | **Manual deletion** by Super Admin |
| Simple generate UI | **Full management UI** - view, copy, delete existing codes |

---

## Architecture

```text
+-------------------------+         +------------------------+
| super_admin_master_codes|         | user (target)          |
+-------------------------+         +------------------------+
| id                      |         |                        |
| target_user_id (FK)     | ------> | profiles.id            |
| target_email            |         |                        |
| code (6-digit)          |         |                        |
| created_by (super admin)|         |                        |
| created_at              |         |                        |
| last_used_at (tracking) |         |                        |
| use_count (tracking)    |         |                        |
+-------------------------+         +------------------------+
```

---

## Implementation Details

### 1. Database Migration

Create table `super_admin_master_codes`:

```sql
CREATE TABLE public.super_admin_master_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  use_count INTEGER DEFAULT 0,
  UNIQUE(target_user_id) -- One master code per user
);

-- RLS: Only super admins can access
ALTER TABLE public.super_admin_master_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage master codes"
ON public.super_admin_master_codes FOR ALL
USING (public.is_super_admin());

-- Indexes
CREATE INDEX idx_master_codes_email ON public.super_admin_master_codes(target_email);
CREATE INDEX idx_master_codes_code ON public.super_admin_master_codes(code);
```

---

### 2. Edge Function: `generate-master-code`

**File: `supabase/functions/generate-master-code/index.ts`**

```typescript
// Key functionality:
// 1. Verify caller is super_admin via user_roles check
// 2. Validate target user exists
// 3. Check if user already has a master code
//    - If yes, return existing code
//    - If no, generate new 6-digit code
// 4. Store in super_admin_master_codes (upsert)
// 5. Log action to super_admin_activity_logs
// 6. Return the code to display in UI

const generateMasterCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// No expiration - code persists until deleted
```

---

### 3. Edge Function: `delete-master-code`

**File: `supabase/functions/delete-master-code/index.ts`**

```typescript
// Key functionality:
// 1. Verify caller is super_admin
// 2. Delete the master code record
// 3. Log deletion to super_admin_activity_logs
```

---

### 4. Modify `verify-otp` Edge Function

**File: `supabase/functions/verify-otp/index.ts`**

Add after the regular OTP check fails:

```typescript
// Before returning "Invalid code" error, check for master code
const { data: masterCode, error: masterError } = await supabase
  .from('super_admin_master_codes')
  .select('*')
  .eq('target_email', email)
  .eq('code', trimmedCode)
  .maybeSingle();

if (masterCode && !masterError) {
  console.log('Master code verified for:', email);
  
  // Update usage tracking
  await supabase
    .from('super_admin_master_codes')
    .update({ 
      last_used_at: new Date().toISOString(),
      use_count: (masterCode.use_count || 0) + 1
    })
    .eq('id', masterCode.id);
  
  // Log usage to activity logs
  await supabase.from('super_admin_activity_logs').insert({
    admin_user_id: masterCode.created_by,
    action_type: 'master_code_used',
    entity_type: 'member',
    entity_id: masterCode.target_user_id,
    metadata: { 
      target_email: email, 
      used_from_ip: clientIP,
      use_count: (masterCode.use_count || 0) + 1
    }
  });
  
  // Continue with normal login flow for this user
  // (generate magic link and return session)
}
```

---

### 5. UI: UserDetailSheet Enhancement

**File: `src/components/super-admin/UserDetailSheet.tsx`**

#### State and Queries

```typescript
const [masterCode, setMasterCode] = useState<{
  id: string;
  code: string;
  created_at: string;
  last_used_at: string | null;
  use_count: number;
} | null>(null);
const [generatingCode, setGeneratingCode] = useState(false);
const [deletingCode, setDeletingCode] = useState(false);
const [codeCopied, setCodeCopied] = useState(false);

// Fetch existing master code on user load
useEffect(() => {
  if (user?.id) {
    fetchMasterCode();
  }
}, [user?.id]);

const fetchMasterCode = async () => {
  const { data } = await supabase
    .from('super_admin_master_codes')
    .select('*')
    .eq('target_user_id', user.id)
    .maybeSingle();
  
  setMasterCode(data);
};
```

#### Generate Handler

```typescript
const handleGenerateMasterCode = async () => {
  if (!user) return;
  setGeneratingCode(true);
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-master-code', {
      body: { 
        targetUserId: user.id,
        targetEmail: user.email,
      }
    });
    
    if (error) throw error;
    
    setMasterCode(data.masterCode);
    
    toast({
      title: "Master Code Generated",
      description: "This code can be used to log in as this user at any time.",
    });
  } catch (err) {
    toast({
      title: "Failed to generate code",
      description: err.message,
      variant: "destructive",
    });
  } finally {
    setGeneratingCode(false);
  }
};
```

#### Delete Handler

```typescript
const handleDeleteMasterCode = async () => {
  if (!masterCode) return;
  setDeletingCode(true);
  
  try {
    const { error } = await supabase.functions.invoke('delete-master-code', {
      body: { masterCodeId: masterCode.id }
    });
    
    if (error) throw error;
    
    setMasterCode(null);
    
    toast({
      title: "Master Code Deleted",
      description: "The master code has been revoked.",
    });
  } catch (err) {
    toast({
      title: "Failed to delete code",
      description: err.message,
      variant: "destructive",
    });
  } finally {
    setDeletingCode(false);
  }
};
```

#### UI Section

```tsx
{/* Master Code Section */}
<div>
  <div className="flex items-center gap-1.5 mb-2">
    <Key className="h-3.5 w-3.5 text-muted-foreground" />
    <span className="text-sm font-medium">Login Access</span>
  </div>
  
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-3">
    {!masterCode ? (
      <>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Generate a master code to log in as this user for support purposes.
          The code will remain active until you delete it.
        </p>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleGenerateMasterCode}
          disabled={generatingCode}
          className="w-full"
        >
          {generatingCode ? (
            <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><Key className="h-3 w-3 mr-2" /> Generate Master Code</>
          )}
        </Button>
      </>
    ) : (
      <>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
              Master Code
            </p>
            <code className="text-2xl font-mono font-bold tracking-widest text-amber-800 dark:text-amber-200">
              {masterCode.code}
            </code>
          </div>
          <Button size="sm" variant="ghost" onClick={handleCopyCode}>
            {codeCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 space-y-0.5">
          <p>Created: {format(new Date(masterCode.created_at), 'MMM d, yyyy')}</p>
          {masterCode.last_used_at && (
            <p>Last used: {formatDistanceToNow(new Date(masterCode.last_used_at), { addSuffix: true })} ({masterCode.use_count} times)</p>
          )}
          <p className="pt-1">Enter this code on the login page with {user.email}</p>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={deletingCode}
            >
              {deletingCode ? (
                <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="h-3 w-3 mr-2" /> Delete Master Code</>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Master Code?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently revoke the master code for {user.email}. 
                You can generate a new one later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMasterCode}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )}
  </div>
</div>
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Only super admins can generate/delete | Edge functions check `user_roles` for `super_admin` role |
| Persistent code risk | Super Admin can delete at any time; audit trail tracks all usage |
| One code per user | Unique constraint prevents multiple codes; regenerate replaces existing |
| Audit trail | All generations, uses, and deletions logged to `super_admin_activity_logs` |
| Code entropy | 6-digit numeric (1M combinations), requires email match |
| Usage tracking | `last_used_at` and `use_count` allow monitoring for suspicious activity |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| **Database Migration** | Create `super_admin_master_codes` table with RLS |
| `supabase/functions/generate-master-code/index.ts` | **NEW** - Generate or return existing code |
| `supabase/functions/delete-master-code/index.ts` | **NEW** - Delete master code |
| `supabase/functions/verify-otp/index.ts` | Modify to check master codes |
| `src/components/super-admin/UserDetailSheet.tsx` | Add Master Code management UI |

---

## User Flow

### Generate Master Code
1. Super Admin opens User Detail Sheet
2. Sees "Login Access" section with "Generate Master Code" button
3. Clicks button → code is generated and displayed
4. Can copy code and use it any time to log in as that user

### Use Master Code
1. Open login page (any browser/device)
2. Enter target user's email
3. Click "Send Code" (optional - can skip)
4. Enter the 6-digit master code instead of OTP
5. Successfully logged in as that user
6. Usage is tracked (last_used_at, use_count updated)

### Delete Master Code
1. Super Admin opens User Detail Sheet
2. Sees existing master code with usage stats
3. Clicks "Delete Master Code"
4. Confirms in dialog
5. Code is permanently removed
6. Can generate a new one if needed later

---

## Visual Preview

### No Master Code Yet

```text
+-- Login Access (🔑) ----------------------------------------+
| Generate a master code to log in as this user for support  |
| purposes. The code will remain active until you delete it. |
|                                                            |
| [🔑 Generate Master Code]                                  |
+------------------------------------------------------------+
```

### With Active Master Code

```text
+-- Login Access (🔑) ----------------------------------------+
| Master Code                                          [📋]  |
|                                                            |
|   ┌─────────────────────────────┐                         |
|   │     8  4  7  2  9  1        │                         |
|   └─────────────────────────────┘                         |
|                                                            |
| Created: Jan 15, 2026                                      |
| Last used: 2 hrs ago (5 times)                            |
| Enter this code on login page with user@example.com       |
|                                                            |
| [🗑️ Delete Master Code]                                   |
+------------------------------------------------------------+
```
