

# Leave Approval Latency Optimization (5-10s to Under 1 second)

## Problem Summary

When a manager approves a leave request, the UI takes 5-10 seconds to respond. This creates a poor user experience.

## Root Causes Identified

| Issue | Time Impact |
|-------|-------------|
| Notification edge function blocks UI | 2-4 seconds |
| Full data reload after approval | 1-2 seconds |
| Sequential database queries | 0.5-1.5 seconds |

## Solution Overview

We will make three key changes to make leave approval feel instant:

1. **Background notifications** - Send the email notification without waiting for it
2. **Instant UI update** - Remove the approved request from the list immediately
3. **Skip redundant data fetching** - Don't reload all data after each approval

---

## Technical Implementation

### Change 1: Fire-and-Forget Notification

**File:** `src/components/PendingLeaveApprovals.tsx`

Remove the `await` keyword so the notification runs in the background:

```typescript
// BEFORE (lines 503-515):
try {
  const reviewerName = (currentEmployee as any)?.profiles?.full_name || "Manager";
  await supabase.functions.invoke("notify-leave-decision", {
    body: { request_id: requestId, decision: approved ? "approved" : "rejected", reviewer_name: reviewerName },
  });
} catch (notifyError) {
  console.error("Failed to send notification:", notifyError);
}

// AFTER:
const reviewerName = (currentEmployee as any)?.profiles?.full_name || "Manager";
supabase.functions.invoke("notify-leave-decision", {
  body: { request_id: requestId, decision: approved ? "approved" : "rejected", reviewer_name: reviewerName },
}).catch(err => console.error("Failed to send notification:", err));
```

**Time saved: 2-4 seconds**

---

### Change 2: Optimistic UI Update

**File:** `src/components/PendingLeaveApprovals.tsx`

Remove the request from the list immediately, before the database update completes:

```typescript
// Add at the START of handleApproval, after setProcessing(requestId):
const previousRequests = [...pendingRequests];
setPendingRequests(prev => prev.filter(r => r.id !== requestId));

// Modify the error handling to rollback on failure:
if (error) {
  toast.error(getErrorMessage(error, "Failed to update leave request"));
  console.error("Update leave status error:", error);
  setPendingRequests(previousRequests); // Rollback
} else {
  // ... success handling ...
  // REMOVE: loadPendingRequests(); // No longer needed
  onApprovalChange?.();
}
```

**Time saved: 1-2 seconds**

---

### Change 3: Add Edge Function to Warmup Schedule

**File:** SQL migration (optional enhancement)

Add the leave decision function to the warmup cron job:

```sql
-- Add to the existing warmup schedule
SELECT net.http_post(
  url := 'https://rygowmzkvxgnxagqlyxf.supabase.co/functions/v1/notify-leave-decision',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
  body := '{"warmup": true}'::jsonb
);
```

**File:** `supabase/functions/notify-leave-decision/index.ts`

Add warmup handler:

```typescript
// Add after parsing request body
const requestBody = await req.json();
if (requestBody.warmup) {
  console.log("Warmup ping received - keeping container warm");
  return new Response(JSON.stringify({ status: "warm" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/PendingLeaveApprovals.tsx` | Fire-and-forget notification + optimistic UI update |
| `supabase/functions/notify-leave-decision/index.ts` | Add warmup handler |
| Database migration | Update cron job to include leave notification function |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Notification delay | 2-4s (blocking) | 0s (background) |
| Data reload | 1-2s | 0s (optimistic) |
| **Total perceived latency** | **5-10 seconds** | **Under 1 second** |

The manager will see the leave request disappear instantly when they click approve, while the email notification and database operations complete in the background.

