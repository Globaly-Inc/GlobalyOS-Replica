

## Remove "Application Settings" Card from Hiring Settings

Since these settings (application confirmation emails, cover letter requirements, internal applications) are already managed at the individual vacancy level, the entire "Application Settings" card in Hiring Settings is redundant and should be removed.

### Changes

**`src/pages/hiring/HiringSettings.tsx`** (lines 678-732):
- Remove the entire "Application Settings" `<Card>` block containing the three toggle switches:
  - Auto-send application confirmation
  - Require cover letter
  - Allow internal applications

No database changes needed -- the `hiring_config` table columns can remain for backward compatibility and per-vacancy usage.

