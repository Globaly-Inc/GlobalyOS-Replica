

# Fix: Add Missing `application_close_date` Column to Database

## Root Cause

The previous change added `application_close_date` to the form state and save payload in `JobEdit.tsx`, but the corresponding database column was never created in the `jobs` table. When saving, the update query fails because the column doesn't exist.

## Fix

### 1. Database Migration

Add the missing column to the `jobs` table:

```sql
ALTER TABLE public.jobs
ADD COLUMN application_close_date date;
```

No RLS changes needed -- existing policies already cover the `jobs` table. No default value required since it's an optional field.

### 2. No Code Changes Needed

The frontend code (`JobEdit.tsx`, `JobCreate.tsx`, types) already references `application_close_date` correctly. Once the column exists, saving will work.

