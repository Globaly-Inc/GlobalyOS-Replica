/**
 * Employee Tour Steps Configuration
 * Defines the spotlight tour steps for new employees after onboarding
 */

import { Step } from 'react-joyride';

interface TourStep extends Step {
  requiredRoute?: string;
}

export const getEmployeeTourSteps = (orgCode: string): TourStep[] => [
  {
    target: '.tour-profile-avatar',
    title: 'Your Profile',
    content: 'View and update your profile anytime. Add your photo, personal details, and superpowers!',
    placement: 'bottom',
    disableBeacon: true,
    requiredRoute: `/org/${orgCode}`,
  },
  {
    target: '.tour-check-in-button',
    title: 'Daily Check-In',
    content: 'Use this button to check in when you start work and check out when you finish. Your hours are tracked automatically.',
    placement: 'bottom',
    requiredRoute: `/org/${orgCode}`,
  },
  {
    target: '.tour-leave-balance',
    title: 'Leave Balances',
    content: 'Track your annual, sick, and other leave balances here. You can request time off whenever needed.',
    placement: 'bottom',
    requiredRoute: `/org/${orgCode}`,
  },
  {
    target: '.tour-team-feed',
    title: 'Team Feed',
    content: 'Stay connected with your team! Share updates, celebrate wins, send kudos, and see announcements.',
    placement: 'top',
    requiredRoute: `/org/${orgCode}`,
  },
  {
    target: '.tour-nav-wiki',
    title: 'Wiki & Resources',
    content: 'Find company documentation, policies, and helpful resources. You can also browse the team directory here.',
    placement: 'bottom',
    requiredRoute: `/org/${orgCode}`,
  },
];
