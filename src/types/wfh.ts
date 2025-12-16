/**
 * Work From Home type definitions
 */

export type WorkLocation = 'office' | 'hybrid' | 'remote';

export interface WfhRequest {
  id: string;
  employee_id: string;
  organization_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WfhRequestWithEmployee extends WfhRequest {
  employee: {
    id: string;
    manager_id: string | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  reviewer?: {
    profiles: {
      full_name: string;
    };
  } | null;
}

export const WORK_LOCATION_CONFIG: Record<WorkLocation, {
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  office: {
    label: 'Office',
    description: 'QR code scan required for check-in',
    icon: '🏢',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  hybrid: {
    label: 'Hybrid',
    description: 'Location verification required, no QR scan',
    icon: '🏠🏢',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  remote: {
    label: 'Remote',
    description: 'Location verification required, no QR scan',
    icon: '🏠',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
};
