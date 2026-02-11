
# Freeze Info Section, Scroll Only Description

## What Changes
The preview card will be restructured so that the **header** (title), **badges**, and **details** (location, department, close date, salary) remain fixed/frozen at the top. Only the **description area** below the separator will scroll.

## Technical Approach

### File: `src/components/hiring/JobPostPreview.tsx`

1. **Remove** the single scrollable `CardContent` wrapper (line 141) that currently scrolls everything together.

2. **Split into two sections**:
   - **Fixed section** (no scroll): Contains badges, details (location, department, close date, salary), and separator -- wrapped in a non-scrolling `CardContent`.
   - **Scrollable section**: Contains only the "About the Role" heading and description content, with a fixed max-height and `overflow-y: auto`.

3. **Layout structure** will become:
   ```
   Card (sticky, overflow-hidden)
   +-- CardHeader (title, company) -- already fixed
   +-- CardContent (p-4, no scroll)
   |   +-- Badges row
   |   +-- Details (location, dept, date, salary)
   |   +-- Separator
   +-- div (scrollable, max-h, overflow-y-auto, px-4 pb-4)
       +-- "About the Role" heading
       +-- Description content
       +-- Empty state hint
   ```

4. The scrollable description area will use `max-h-[calc(100vh-420px)]` (approximate, accounting for header + info section height) with `overflow-y: auto`.
