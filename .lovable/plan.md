

## Revamp GlobalyOS Public Website

### Overview
A complete redesign of the Landing page (`/`) and Features page (`/features`) inspired by the clean, modern aesthetic of giga.ai -- with a long, scrollable layout featuring distinct sections for each product module. The footer will be upgraded to match the rich, multi-column style from the GlobalyApp project.

### Page Structure (Landing.tsx - Full Rewrite)

The new landing page will be a single long-scrolling page with these sections in order:

**1. Hero Section**
- Large bold headline with typewriter effect (keep existing)
- Subtitle + CTA buttons (Start Free Trial / Book a Demo)
- "No credit card required" note
- Background: clean white/light with subtle gradient accents

**2. Trusted By / Logo Marquee**
- Keep existing two-row animated marquee with company logos
- Clean separator

**3. Product Overview Pill Navigation**
- Horizontal pill tabs: HRMS | CRM | Marketing | Communication | Accounting | Reporting | AI
- Clicking scrolls to the relevant section below (anchor links)

**4. HRMS Section**
- Left: headline, description, bullet features (Employee Profiles, Leave & Attendance, QR Check-in, Position Timeline, Performance Reviews, KPIs/OKRs, Org Chart, Payroll)
- Right: mockup card (keep/adapt existing People & Leave mockups)
- Alternating layout (text-left, visual-right)

**5. CRM Section**
- Contacts, Companies, Deals pipeline, Activities, Email integration
- Right-aligned text, left mockup visual

**6. Marketing & Campaigns Section**
- Email campaigns, WhatsApp messaging, Omnichannel inbox, AI Responder, Forms
- Text-left, visual-right

**7. Communication Section**
- Team Chat, Social Feed (Posts, Wins, Kudos, Announcements), Notifications
- Right-aligned text, left visual

**8. Accounting Section**
- Chart of Accounts, Journal entries, Financial reporting, Invoicing
- Text-left, visual-right

**9. Reporting & Analytics Section**
- Team dashboards, KPI analytics, Attendance reports, Leave reports, CRM analytics, Call analytics
- Full-width feature grid

**10. AI-Powered Section**
- Keep existing AI showcase (Ask AI card with animated border + sparkles)
- Expand to mention AI across all modules (AI review drafts, AI responder, AI wiki Q&A)

**11. Wiki & Knowledge Base Section**
- Rich text editor, folders/pages, file attachments, permissions, AI-powered Q&A
- Mockup card

**12. Mobile App Showcase**
- Keep existing MobileAppShowcase component with phone carousel

**13. Security & Trust Section**
- Enterprise security, Multi-tenancy, GDPR, SOC2, Data encryption
- Badge-style cards

**14. Testimonials**
- Keep existing 3-column testimonial cards

**15. Final CTA**
- Gradient card with "Ready to transform..." + buttons

**16. New Rich Footer**
- Dark background (slate-900)
- 6-column grid: Brand + description + socials | Product | Solutions | Resources | Company | Legal
- Newsletter subscription row with email input + subscribe button
- Bottom bar with copyright + legal links
- Inspired by the GlobalyApp footer structure

### Files to Create/Modify

**1. `src/pages/Landing.tsx`** -- Full rewrite
- Remove inline mockup components, move to separate files
- Build the long-scroll section layout
- Each section: container with max-w-7xl, alternating bg colors, consistent spacing

**2. `src/components/landing/` -- New section components**
- `HeroSection.tsx` -- Hero with typewriter
- `ProductSections.tsx` -- Individual sections for HRMS, CRM, Marketing, Communication, Accounting, Reporting
- `FeatureShowcaseMockups.tsx` -- Visual mockup cards for each section (adapted from existing)
- `SecuritySection.tsx` -- Trust badges and security features
- `AIPoweredSection.tsx` -- AI showcase (extracted from Landing)
- `WikiSection.tsx` -- Wiki feature showcase
- Keep existing `MobileAppShowcase.tsx`

**3. `src/components/website/WebsiteFooter.tsx`** -- Enhanced footer
- Dark background with 6 columns of links
- Newsletter signup with email input
- Social media icon buttons (circular, hover effects)
- Bottom bar with copyright and legal links
- All product categories listed under "Product": HRMS, CRM, Marketing, Communication, Accounting, Wiki, AI

**4. `src/pages/Features.tsx`** -- Update
- Update feature categories to include all new modules: CRM, Marketing (Campaigns, WhatsApp, Omnichannel), Communication (Chat, Feed), Accounting, Telephony/Calls, Forms, Hiring
- Remove "Coming Soon" from Chat (it exists now)

**5. `src/index.css`** or `tailwind.config.ts`
- Keep existing marquee animations
- Add any new scroll-animation utilities if needed

### Design Principles (Giga.ai Inspired)
- Clean white backgrounds with subtle gradient section separators
- Large, bold section headings (text-4xl to text-5xl)
- Generous whitespace and padding (py-20 to py-28 between sections)
- Alternating text-left/text-right layouts for visual rhythm
- Subtle hover effects on cards (translate-y, shadow increase)
- Monochrome/primary color scheme with accent gradients for CTAs
- Section label pills (small uppercase badges like "HRMS", "CRM")

### Technical Notes
- No database changes required
- No new dependencies needed
- All existing components (WebsiteHeader, TestimonialCard, FeatureCard, PricingCard) continue to work
- RootRedirect.tsx unchanged -- still renders Landing for unauthenticated users
- Responsive: desktop-first with clean mobile stacking
