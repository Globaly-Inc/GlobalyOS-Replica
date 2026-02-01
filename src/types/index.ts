/**
 * Core type definitions for GlobalyOS
 * All shared types should be defined here and imported throughout the app
 */

// Organization types
export * from './organization';

// Legacy display types for backward compatibility
export type { 
  Employee, 
  Kudos, 
  Update, 
  UpdateMention,
  Achievement,
} from './employee';

// Database record types with explicit naming
export type {
  Employee as EmployeeRecord,
  EmployeeWithProfile,
  EmployeeWithRelations,
  EmployeeDirectoryItem,
  PositionHistory,
  EmployeeSchedule,
  LearningDevelopment,
  Achievement as AchievementRecord,
  EmployeeStatus,
  PositionChangeType,
  LearningType,
  LearningStatus,
} from './employee-new';

// Leave types
export * from './leave';

// Attendance types
export * from './attendance';

// Wiki types
export * from './wiki';

// Feed types - using explicit exports to avoid conflicts
export type {
  FeedUpdate,
  UpdateType,
  DisplayUpdateType,
  FeedUpdateWithRelations,
  UpdateMention as FeedUpdateMention,
  Kudos as KudosRecord,
  KudosWithRelations,
  FeedReaction,
  ReactionEmoji,
  FeedItem,
} from './feed';

// Calendar types
export * from './calendar';

// KPI types
export * from './kpi';

// Notification types
export * from './notification';

// Payroll types (explicit exports to avoid conflicts)
export type {
  PayrollCountry,
  PayFrequency,
  PayrollRunStatus,
  SalaryComponentType,
  CalculationMethod,
  SalaryPeriod,
  SalaryType,
  EmploymentType,
  EarningType,
  DeductionType,
  ContributionType,
  SocialSecurityRuleType,
  StatutoryRuleType,
  SocialSecurityBaseType,
  LegalEntity,
  LegalEntityAddress,
  PayrollProfile,
  SalaryStructure,
  SalaryComponent,
  TaxSlab,
  TaxSlabMetadata,
  SocialSecurityRule,
  SocialSecurityCaps,
  StatutoryRule,
  StatutoryRuleConfig,
  PayrollRun,
  PayrollRunSummary,
  PayrollRunItem,
  CalculationSnapshot,
  PayrollEarning,
  PayrollDeduction,
  EmployerContribution,
  Payslip,
  EmployeeBankAccount,
  CreateLegalEntityInput,
  UpdateLegalEntityInput,
  CreatePayrollProfileInput,
  UpdatePayrollProfileInput,
  CreateSalaryStructureInput,
  CreateSalaryComponentInput,
  CreateTaxSlabInput,
  CreateSocialSecurityRuleInput,
  CreateStatutoryRuleInput,
  CreatePayrollRunInput,
  CreateEmployeeBankAccountInput,
  UpdateEmployeeBankAccountInput,
  PayrollAttendanceSummary,
  PayrollLeaveSummary,
  PayrollCalculationParams,
  PayrollEarningLine,
  PayrollDeductionLine,
  EmployerContributionLine,
  PayrollCalculationResult,
  EmployeeTaxProfile,
  EmployeeWithPayroll,
} from './payroll';

// Activity types
export * from './activity';
