

## Move Logo Left, Add "Go to Website" Button Right

### Changes to `src/pages/careers/CareersPage.tsx`

**1. Update the org query (line 42)**
- Add `website` to the select: `'name, logo_url, website'`

**2. Restyle the header (lines 82-90)**
- Change from `justify-center` to `justify-between` with horizontal padding
- Move the logo/org name to the left side
- Add a "Go to Website" button on the right side that links to `org.website`
- The button opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- Only show the button when `org.website` is available

### Layout

```text
|  [Logo/Name]              [Go to Website ->]  |
```

