

# Automatic Notification Cleanup (15-Day Retention)

## Overview

We'll set up an automatic daily cleanup job that deletes notifications older than 15 days. This will keep your database lean and performant.

## Current State

- **Total notifications:** 2,736
- **Older than 15 days:** 2,323 (will be cleaned up)
- **Index exists:** `idx_notifications_created_at` - deletions will be fast

---

## Implementation

### Single Database Migration

We'll create a `pg_cron` scheduled job that runs daily at 3:00 AM UTC to delete old notifications:

```sql
-- Schedule daily cleanup of notifications older than 15 days
SELECT cron.schedule(
  'cleanup-old-notifications',     -- Job name
  '0 3 * * *',                      -- Run at 3:00 AM UTC daily
  $$
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '15 days';
  $$
);
```

**Why 3 AM UTC?**
- Low-traffic time for most users
- Doesn't conflict with other scheduled jobs (which run at different hours)
- Simple SQL execution - no edge function needed (faster, cheaper)

---

## What This Does

| Action | Description |
|--------|-------------|
| **Runs daily at 3 AM UTC** | Automatic, no manual intervention |
| **Deletes notifications > 15 days old** | Based on `created_at` timestamp |
| **Uses existing index** | `idx_notifications_created_at` ensures fast deletions |
| **Immediate first cleanup** | Will delete ~2,323 old notifications on first run |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Notification count | 2,736+ (growing) | ~400-500 (capped at 15 days) |
| Storage growth | Unbounded | Controlled |
| Query performance | May degrade over time | Consistently fast |

---

## Files to Modify

| Change | Type |
|--------|------|
| Add cron job for notification cleanup | Database migration |

No code changes needed - this is purely a database-level automated task.

