/**
 * Domain Services Index
 * Central export for all domain-specific hooks and services
 */

export * from './useCurrentEmployee';
export * from './useEmployees';
export * from './useLeave';
export * from './useAttendance';
export * from './useSocialFeed';
export * from './useWiki';
export * from './useKpi';
export * from './useNotifications';
export * from './usePayroll';
export * from './useWorkflows';
export { 
  useStartApplication, 
  useStartWorkflow,
  useAddWorkflow,
  useAddWorkflowTemplate,
  useUpdateWorkflow,
  useUpdateWorkflowTemplate,
  useDeleteWorkflow,
  useDeleteWorkflowTemplate,
  useAddWorkflowStage,
  useUpdateWorkflowStage,
  useDeleteWorkflowStage,
  useReorderWorkflowStages,
  useAddWorkflowTrigger,
  useUpdateWorkflowTrigger,
  useToggleWorkflowTrigger,
  useDeleteWorkflowTrigger,
  useSeedWorkflowData
} from './useWorkflowMutations';
export * from './useLeaveRealtime';
export { useEmployeeActivityTimeline, useInfiniteEmployeeActivityTimeline, logEmployeeActivity } from './useEmployeeActivityTimeline';
