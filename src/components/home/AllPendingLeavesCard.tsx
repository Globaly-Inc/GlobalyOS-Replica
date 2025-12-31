import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { OrgLink } from "@/components/OrgLink";
import { format, parseISO } from "date-fns";

interface PendingLeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  employee: {
    id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export const AllPendingLeavesCard = () => {
  const [pendingRequests, setPendingRequests] = useState<PendingLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR } = useUserRole();

  const canView = isOwner || isAdmin || isHR;

  useEffect(() => {
    if (currentOrg?.id && canView) {
      loadPendingRequests();

      // Set up realtime subscription
      const channel = supabase
        .channel('all-pending-leaves')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `organization_id=eq.${currentOrg.id}`
        }, () => {
          loadPendingRequests();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentOrg?.id, canView]);

  const loadPendingRequests = async () => {
    if (!currentOrg?.id) return;

    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_count,
          employee:employees!leave_requests_employee_id_fkey(
            id,
            position,
            profiles:profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;
      
      // Transform to match expected interface
      const transformed = (data || []).map(item => ({
        ...item,
        employee: {
          id: item.employee?.id || '',
          position: item.employee?.position || '',
          profiles: {
            full_name: item.employee?.profiles?.full_name || 'Unknown',
            avatar_url: item.employee?.profiles?.avatar_url || null
          }
        }
      }));
      
      setPendingRequests(transformed);
    } catch (error) {
      console.error('Error loading pending leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render for non-privileged users or when loading/empty
  if (!canView || loading || pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          All Pending Leaves
        </h3>
        <span className="text-sm text-muted-foreground">
          {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {pendingRequests.map((request) => {
          const initials = request.employee.profiles.full_name
            .split(" ")
            .map((n) => n[0])
            .join("");
          const isMultiDay = request.start_date !== request.end_date;
          const dateRange = isMultiDay
            ? `${format(parseISO(request.start_date), "d MMM")} - ${format(parseISO(request.end_date), "d MMM")}`
            : format(parseISO(request.start_date), "d MMM yyyy");

          return (
            <HoverCard key={request.id}>
              <HoverCardTrigger asChild>
                <OrgLink to={`/team/${request.employee.id}`}>
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer transition-transform hover:scale-110">
                    <AvatarImage src={request.employee.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </OrgLink>
              </HoverCardTrigger>
              <HoverCardContent className="w-64" side="top">
                <div className="flex gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.employee.profiles.avatar_url || undefined} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {request.employee.profiles.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {request.employee.position}
                    </p>
                    <div className="mt-2 space-y-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {request.leave_type.replace("_", " ")}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {dateRange} ({request.days_count} {request.days_count === 1 ? 'day' : 'days'})
                      </div>
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                        Pending Approval
                      </Badge>
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    </Card>
  );
};
