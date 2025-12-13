/**
 * Legacy employee types for backward compatibility with existing components
 * These are VIEW types used for display, separate from DATABASE types
 */

// Display/View type for employee cards (camelCase for React components)
export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  manager?: string;
  joinDate: string;
  avatar?: string;
  phone?: string;
  city?: string;
  country?: string;
  superpowers?: string[];
  status?: 'invited' | 'active' | 'inactive';
  officeName?: string;
  officeEmployeeCount?: number;
}

// Display type for kudos
export interface Kudos {
  id: string;
  employeeId: string;
  employeeName: string;
  givenBy: string;
  givenById: string;
  givenByAvatar?: string;
  comment: string;
  date: string;
  avatar?: string;
  batchId?: string;
  otherRecipients?: string[];
  otherRecipientIds?: string[];
}

// Display type for update mentions
export interface UpdateMention {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar?: string;
}

// Display type for feed updates
export interface Update {
  id: string;
  employeeId: string;
  employeeName: string;
  content: string;
  date: string;
  avatar?: string;
  imageUrl?: string;
  type: "win" | "announcement" | "achievement";
  mentions?: UpdateMention[];
}

// Display type for achievements
export interface Achievement {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  date: string;
}

// Re-export database types with explicit naming
export type {
  Employee as EmployeeRecord,
  EmployeeWithProfile,
  EmployeeWithRelations,
  EmployeeDirectoryItem,
  EmployeeStatus,
  PositionHistory,
  PositionChangeType,
  EmployeeSchedule,
  LearningDevelopment,
  LearningType,
  LearningStatus,
  Achievement as AchievementRecord,
} from './employee-new';
