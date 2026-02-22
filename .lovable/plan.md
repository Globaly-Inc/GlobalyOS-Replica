

## Hide Feature Content for Public (Non-Signed-In) Visitors

Only non-authenticated visitors will have feature-related content hidden. Signed-in users will continue to see everything as before.

### Changes

**1. WebsiteHeader.tsx** - Conditionally show "Features" nav link
- Filter out the "Features" link from `navLinks` when `user` is null (not signed in)
- Applies to both desktop and mobile nav menus

**2. Landing.tsx** - Conditionally show feature sections
- Import `useAuth` hook
- Wrap `ProductPillNav` and `ProductSections` in a conditional that only renders them when the user is signed in

**3. HeroSection.tsx** - Update "Book a Demo" button
- The "Book a Demo" button navigates to `/features`, which will be hidden for public users
- Change it to navigate to `/contact` instead (or another public page), so it works for everyone regardless of auth state

### What Stays Visible for Everyone
- Landing hero, trusted-by logos, AI section, Wiki section, mobile showcase, security, testimonials, CTA
- All other public pages (Pricing, Blog, About, Contact, etc.)

### What Gets Hidden for Non-Signed-In Users Only
- "Features" link in the website header nav
- Product pill navigation on landing page
- Product sections on landing page

### Technical Details
- Uses the existing `useAuth()` hook to check `user` state
- No route changes needed -- the `/features` page route remains accessible (a signed-in user can still navigate there directly)
- No database or backend changes required
