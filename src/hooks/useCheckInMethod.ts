/**
 * Shared hook to determine whether an employee should use remote or QR check-in.
 * Consolidates logic previously triplicated in useLayoutState, SelfCheckInCard, and MobileBottomNav.
 */

import { useEmployeeWorkLocation, useHasApprovedWfhToday } from '@/services/useWfh';
import { useMyOfficeAttendanceSettings } from '@/hooks/useMyOfficeAttendanceSettings';

export type CheckInMethod = 'remote' | 'qr' | 'choose';

export const useCheckInMethod = (employeeId?: string | null): CheckInMethod => {
  const { data: workLocation } = useEmployeeWorkLocation(employeeId || undefined);
  const { data: hasApprovedWfhToday } = useHasApprovedWfhToday(employeeId || undefined);
  const { data: officeSettings } = useMyOfficeAttendanceSettings();

  if (!employeeId) return 'qr';

  const isRemoteWorker = workLocation === 'remote' ||
    (workLocation === 'office' && hasApprovedWfhToday);

  if (isRemoteWorker) return 'remote';

  if (workLocation === 'hybrid') {
    const methods = officeSettings?.hybrid_checkin_methods || ['qr', 'remote'];
    const hasRemote = methods.includes('remote') || methods.includes('remote_location');
    const hasOffice = methods.includes('qr') || methods.includes('location');

    // If both remote and office methods are enabled, let user choose
    if (hasRemote && hasOffice) return 'choose';
    if (hasRemote) return 'remote';
    return 'qr';
  }

  // Office workers: default to QR
  return 'qr';
};
