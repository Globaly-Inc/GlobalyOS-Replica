
## Remove Email Automation Toggles and Add Career Page Settings

### Problem
The "Email Automation" toggles in the Configuration tab are redundant -- each email template already has an "Active/Inactive" toggle in the Email Templates tab. The Configuration tab should instead house useful settings like Career Page customization.

### Changes

#### 1. Database: Add career page settings columns to `organizations`
Add new columns to store career page configuration:
- `careers_page_title` (text, default: 'Join Our Team')
- `careers_page_subtitle` (text, default: 'Discover opportunities to grow your career with us...')
- `careers_header_color` (text, default: null -- falls back to primary color)

#### 2. Remove Email Automation from ConfigurationSection
Delete the entire `ConfigurationSection` function body that renders the email automation toggles (the `templateTypes` array, `getTemplateActive`, `handleToggle`, and the Card rendering them). Replace with career page settings.

#### 3. Add Career Page Settings to ConfigurationSection
New UI in the Configuration tab:
- **Page Title** -- text input (e.g. "Join Our Team")
- **Page Subtitle** -- textarea (e.g. "Discover opportunities to grow...")
- **Header Color** -- color picker input for the hero section background
- **Preview** -- small preview strip showing the chosen color with title/subtitle
- Save button that updates the organization record

#### 4. Update CareersPage to use dynamic settings
Modify `src/pages/careers/CareersPage.tsx`:
- Fetch `careers_page_title`, `careers_page_subtitle`, `careers_header_color` from the org query
- Use these values in the hero section instead of hardcoded "Join Our Team" and the description text
- Apply the header color as an inline style on the hero `div` (falling back to `bg-primary` if not set)

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.organizations
  ADD COLUMN careers_page_title text DEFAULT 'Join Our Team',
  ADD COLUMN careers_page_subtitle text DEFAULT 'Discover opportunities to grow your career with us. We''re looking for talented people to help shape the future.',
  ADD COLUMN careers_header_color text;
```

**Files modified:**
- `src/pages/hiring/HiringSettings.tsx` -- rewrite `ConfigurationSection` to show career page settings instead of email automation toggles
- `src/pages/careers/CareersPage.tsx` -- read and apply the new org settings dynamically
- Database migration for the new columns
