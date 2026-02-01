import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Lock, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeActivityTimeline } from "@/services/useEmployeeActivityTimeline";
import { ActivityTimelineFilters, ActivityTimelineItem, ActivityTimelineEmpty } from "@/components/timeline";
import type { ActivityTimelineFilters as FilterType } from "@/types/activity";

interface ProfileTimelineSheetProps {
  employeeId: string;
  employeeName: string;
}

export const ProfileTimelineSheet = ({ employeeId, employeeName }: ProfileTimelineSheetProps) => {
  const [open, setOpen] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [filters, setFilters] = useState<FilterType>({});
  const [offset, setOffset] = useState(0);
  const { isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { user } = useAuth();

  // Fetch timeline events using the RPC
  const { data: events = [], isLoading, refetch } = useEmployeeActivityTimeline({
    employeeId: open ? employeeId : '',
    limit: 50,
    offset,
    filters,
  });

  // Check access level on open
  useEffect(() => {
    if (open && user) {
      checkAccessLevel();
    }
  }, [open, user, employeeId]);

  // Refetch when filters change
  useEffect(() => {
    if (open) {
      setOffset(0);
      refetch();
    }
  }, [filters, open]);

  const checkAccessLevel = async () => {
    if (!user) return;

    // Check if viewing own profile
    const { data: ownEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (ownEmployee?.id === employeeId) {
      setIsOwnProfile(true);
      return;
    }

    // Check if current user is the manager of this employee
    const { data: employee } = await supabase
      .from("employees")
      .select("manager_id")
      .eq("id", employeeId)
      .single();

    if (employee?.manager_id && ownEmployee?.id === employee.manager_id) {
      setIsManager(true);
    }
  };

  // Determine viewer access level
  const viewerLevel = useMemo(() => {
    if (isAdmin || isHR) return 'hr_admin';
    if (isOwnProfile) return 'self';
    if (isManager) return 'manager';
    return 'public';
  }, [isAdmin, isHR, isOwnProfile, isManager]);

  const showAccessLevel = isAdmin || isHR;
  const hasActiveFilters = filters.eventTypes?.length || filters.startDate || filters.endDate;

  const handleLoadMore = () => {
    setOffset(prev => prev + 50);
  };

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
              {events.length >= 50 && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
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
