

## Auto-Close Vacancy at Application Close Date

### Summary
Add an `auto_close_on_deadline` boolean flag to the `jobs` table and UI, plus a scheduled backend function that automatically closes expired vacancies daily.

### Changes

#### 1. Database Migration
- Add column `auto_close_on_deadline BOOLEAN DEFAULT false` to the `jobs` table.

#### 2. Frontend -- Create Page (`src/pages/hiring/JobCreate.tsx`)
- Add `auto_close_on_deadline: false` to `formData` state.
- Below the Application Close Date picker, add a checkbox with label "Auto close after this date".
- The checkbox is only enabled when `application_close_date` is set; clearing the date resets it to `false`.
- Include `auto_close_on_deadline` in the create mutation payload.

#### 3. Frontend -- Edit Page (`src/pages/hiring/JobEdit.tsx`)
- Same checkbox below the close date picker, populated from the existing job data.
- Include `auto_close_on_deadline` in the update mutation payload.
- Same conditional enable/disable logic tied to `application_close_date`.

#### 4. Frontend -- Detail Page (`src/pages/hiring/JobDetail.tsx`)
- If `auto_close_on_deadline` is true, show a small info badge or note near the close date (e.g., "Will auto-close on [date]").

#### 5. Frontend -- Jobs List (`src/pages/hiring/JobsList.tsx`)
- If a vacancy has `auto_close_on_deadline` enabled, show a subtle indicator (e.g., a small clock icon or tooltip on the close date badge).

#### 6. Backend -- Edge Function (`supabase/functions/auto-close-expired-jobs/index.ts`)
- New edge function that:
  1. Queries all jobs where `status = 'open'`, `auto_close_on_deadline = true`, and `application_close_date < today (UTC)`.
  2. Updates their status to `'closed'`.
  3. Logs an activity entry (`job_closed`) for each affected vacancy.
- Register in `supabase/config.toml` with `verify_jwt = false`.

#### 7. Cron Job (SQL)
- Schedule a daily `pg_cron` + `pg_net` job (runs at midnight UTC) that invokes the `auto-close-expired-jobs` edge function.

### Technical Details
- The checkbox uses the existing `@radix-ui/react-checkbox` component for consistent styling.
- The checkbox text "Auto close after this date" sits directly below the date picker button, using `mt-1.5` spacing and `text-sm text-muted-foreground` styling.
- When `application_close_date` is cleared, `auto_close_on_deadline` is automatically reset to `false` to prevent orphaned flags.
- The edge function uses the Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS, scoping updates by iterating matched rows per organization.
- The cron job uses `pg_net` to call the function URL with the anon key, matching existing patterns (e.g., `process-trial-expirations`).

