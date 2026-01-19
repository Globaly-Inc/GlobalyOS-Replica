/**
 * Default Leave Types Configuration
 * These are seeded when the Leave feature is enabled during onboarding
 */

import type { EmploymentType } from '@/types/leave';

export interface DefaultLeaveType {
  name: string;
  category: 'paid' | 'unpaid';
  description: string;
  default_days: number;
  min_days_advance: number;
  applies_to_all_offices: boolean;
  applies_to_employment_types: EmploymentType[];
  applies_to_gender: 'all' | 'male' | 'female';
  max_negative_days: number;
  is_system: boolean;
  is_active: boolean;
}

export const DEFAULT_LEAVE_TYPES: DefaultLeaveType[] = [
  {
    name: 'Annual Leave',
    category: 'paid',
    description: 'Standard vacation/holiday leave for rest and relaxation',
    default_days: 12,
    min_days_advance: 2,
    applies_to_all_offices: true,
    applies_to_employment_types: ['contract', 'employee'],
    applies_to_gender: 'all',
    max_negative_days: 0,
    is_system: true,
    is_active: true,
  },
  {
    name: 'Sick/Personal Leave',
    category: 'paid',
    description: 'For illness, medical appointments, or personal matters',
    default_days: 10,
    min_days_advance: 0,
    applies_to_all_offices: true,
    applies_to_employment_types: ['trainee', 'intern', 'contract', 'employee'],
    applies_to_gender: 'all',
    max_negative_days: 0,
    is_system: true,
    is_active: true,
  },
  {
    name: 'Long Service Leave',
    category: 'paid',
    description: 'Extended leave accrued based on tenure (typically after 7+ years)',
    default_days: 0, // Accumulates over time, not auto-granted
    min_days_advance: 14,
    applies_to_all_offices: true,
    applies_to_employment_types: ['employee'],
    applies_to_gender: 'all',
    max_negative_days: 0,
    is_system: true,
    is_active: true,
  },
  {
    name: 'Substitute Leave',
    category: 'paid',
    description: 'Compensatory time off for work done on holidays or rest days',
    default_days: 0,
    min_days_advance: 1,
    applies_to_all_offices: true,
    applies_to_employment_types: ['trainee', 'intern', 'contract', 'employee'],
    applies_to_gender: 'all',
    max_negative_days: 0,
    is_system: true,
    is_active: true,
  },
  {
    name: 'Unpaid Leave',
    category: 'unpaid',
    description: 'Leave without pay when other balances are depleted',
    default_days: 0,
    min_days_advance: 1,
    applies_to_all_offices: true,
    applies_to_employment_types: ['trainee', 'intern', 'contract', 'employee'],
    applies_to_gender: 'all',
    max_negative_days: 30, // Allow up to 30 days unpaid
    is_system: true,
    is_active: true,
  },
];
