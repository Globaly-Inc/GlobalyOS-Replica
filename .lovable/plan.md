

## Enhance HRMS Section: Stacked Animated Cards + Missing Features

### What Changes

**1. Add missing features to HRMS left-side content**
Add these to the features list in the HRMS `ProductSection`:
- Hiring & Recruitment (with Kanban icon or Briefcase)
- Onboarding Workflows
- Offboarding Workflows

**2. Replace the single HRMS mockup with a stacked, scroll-animated card group**
Currently there is one card (`HRMSMockup` -- the employee profile). We will create a new `HRMSStackedMockup` component containing 3 stacked cards that animate in sequentially as the user scrolls down:

- **Card 1 (front/top)**: The existing Employee Profile card (Sarah Chen) -- appears first
- **Card 2 (middle, offset behind)**: A **Hiring Pipeline** card showing stages (Applied, Screening, Interview, Offer) with candidate counts and a mini list of recent applicants
- **Card 3 (back, further offset)**: An **Onboarding Workflow** card showing a checklist-style progress tracker (e.g., "IT Setup", "HR Documents", "Team Intro", "First Project") with a progress bar

The cards will be positioned with CSS transforms (`translateY` + `scale` to create a subtle perspective stack), and each will fade+slide in with increasing delays using the existing `useScrollAnimation` hook from the codebase.

### Technical Details

**File modified: `src/components/landing/ProductSections.tsx`**

1. Import `useScrollAnimation` from `@/hooks/useScrollAnimation`
2. Import additional icons: `Briefcase`, `UserPlus`, `UserMinus`, `ClipboardCheck`
3. Add 3 new feature items to the HRMS features array:
   ```
   { icon: Briefcase, text: "Hiring & Recruitment" }
   { icon: UserPlus, text: "Onboarding Workflows" }
   { icon: UserMinus, text: "Offboarding Workflows" }
   ```
4. Create two new mockup sub-components:
   - `HiringPipelineMockup` -- mini Kanban-style card with stage columns
   - `OnboardingWorkflowMockup` -- checklist progress card with a progress bar
5. Create `HRMSStackedMockup` wrapper that uses `useScrollAnimation` and renders all three cards in a stacked layout:
   - Container uses `relative` positioning
   - Cards use `absolute` positioning with increasing `top` and decreasing `scale` offsets
   - Each card transitions from `opacity-0 translateY(40px)` to its final position with staggered delays (0ms, 200ms, 400ms)
   - The front card (Employee Profile) is largest and on top
   - The back cards peek out behind with slight offsets creating a "deck" effect

### Visual Result
When the user scrolls to the HRMS section, the three cards animate in one after another, creating a layered "card stack" effect. The left side now includes Hiring, Onboarding, and Offboarding as feature items.

