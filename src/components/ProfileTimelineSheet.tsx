import { useState, useEffect, useMemo, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Lock, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteEmployeeActivityTimeline } from "@/services/useEmployeeActivityTimeline";
import { ActivityTimelineFilters, ActivityTimelineItem, ActivityTimelineEmpty } from "@/components/timeline";
import type { ActivityTimelineFilters as FilterType } from "@/types/activity";

interface ProfileTimelineSheetProps {
  employeeId: string;
  employeeName: string;
  /** Pre-computed: is the viewer HR/Admin/Owner? */
  isAdminOrHR?: boolean;
  /** Pre-computed: is the viewer viewing their own profile? */
  isOwnProfile?: boolean;
  /** Pre-computed: is the viewer the direct manager of this employee? */
  isManagerOfEmployee?: boolean;
}

export const ProfileTimelineSheet = ({ 
  employeeId, 
  employeeName,
  isAdminOrHR: propIsAdminOrHR,
  isOwnProfile: propIsOwnProfile,
  isManagerOfEmployee: propIsManagerOfEmployee,
}: ProfileTimelineSheetProps) => {
  const [open, setOpen] = useState(false);
  const [localIsOwnProfile, setLocalIsOwnProfile] = useState(false);
  const [localIsManager, setLocalIsManager] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [filters, setFilters] = useState<FilterType>({});
  const { isAdmin, isHR, isOwner, loading: roleLoading } = useUserRole();
  const { user } = useAuth();

  // Use props if provided, otherwise fall back to local state
  const isOwnProfile = propIsOwnProfile ?? localIsOwnProfile;
  const isManager = propIsManagerOfEmployee ?? localIsManager;
  const isAdminOrHR = propIsAdminOrHR ?? (isOwner || isAdmin || isHR);

  // Determine if user can view timeline
  const canViewTimeline = isAdminOrHR || isOwnProfile || isManager;

  // Fetch timeline events using infinite query for proper pagination
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteEmployeeActivityTimeline(
    open && canViewTimeline ? employeeId : undefined,
    filters
  );

  // Flatten all pages into single events array
  const events = useMemo(() => {
    return data?.pages.flatMap(page => page.events) ?? [];
  }, [data]);

  // Check access level when props are not provided
  const checkAccessLevel = useCallback(async () => {
    if (!user || propIsOwnProfile !== undefined || propIsManagerOfEmployee !== undefined) {
      setAccessChecked(true);
      return;
    }

    try {
      // Check if viewing own profile
      const { data: ownEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (ownEmployee?.id === employeeId) {
        setLocalIsOwnProfile(true);
        setAccessChecked(true);
        return;
      }

      // Check if current user is the manager of this employee
      const { data: employee } = await supabase
        .from("employees")
        .select("manager_id")
        .eq("id", employeeId)
        .single();

      if (employee?.manager_id && ownEmployee?.id === employee.manager_id) {
        setLocalIsManager(true);
      }
    } finally {
      setAccessChecked(true);
    }
  }, [user, employeeId, propIsOwnProfile, propIsManagerOfEmployee]);

  // Check access on mount (for button visibility)
  useEffect(() => {
    if (user && !accessChecked) {
      checkAccessLevel();
    }
  }, [user, accessChecked, checkAccessLevel]);

  // Determine viewer access level
  const viewerLevel = useMemo(() => {
    if (isAdminOrHR) return 'hr_admin';
    if (isOwnProfile) return 'self';
    if (isManager) return 'manager';
    return 'public';
  }, [isAdminOrHR, isOwnProfile, isManager]);

  const showAccessLevel = isAdminOrHR;
  const hasActiveFilters = filters.eventTypes?.length || filters.startDate || filters.endDate;

  // Don't render button if user doesn't have access
  if (!roleLoading && accessChecked && !canViewTimeline) {
    return null;
  }

  // Show loading state while checking access
  if (roleLoading || !accessChecked) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          Timeline
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {employeeName}'s Timeline
          </SheetTitle>
        </SheetHeader>
        
        {/* Access level indicator */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>
            Viewing as: {viewerLevel === 'hr_admin' ? 'HR/Admin' : viewerLevel === 'self' ? 'Self' : viewerLevel === 'manager' ? 'Manager' : 'Team Member'}
          </span>
        </div>

        {/* Filters */}
        <div className="mt-4 pb-2 border-b">
          <ActivityTimelineFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        
        <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
          {isLoading || roleLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <ActivityTimelineEmpty hasFilters={!!hasActiveFilters} />
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-6">
                {events.map((event) => (
                  <ActivityTimelineItem
                    key={event.event_id}
                    event={event}
                    showAccessLevel={showAccessLevel}
                  />
                ))}
              </div>

              {/* Load More button */}
              {hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
