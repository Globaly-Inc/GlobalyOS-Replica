import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calendar, Palmtree, Cake, Award, CalendarDays } from "lucide-react";
import { OrgLink } from "@/components/OrgLink";
import { format, parseISO } from "date-fns";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { PendingLeaveApprovals } from "@/components/PendingLeaveApprovals";
import { PendingWfhApprovals } from "@/components/PendingWfhApprovals";
import { PendingKpiUpdates } from "@/components/PendingKpiUpdates";
import { cn } from "@/lib/utils";
import type { PersonOnLeave, UpcomingTeamLeave, UpcomingEvent, UpcomingCalendarEvent } from "@/hooks/useHomeData";

const AllPendingLeavesCard = lazy(() => import("@/components/home/AllPendingLeavesCard").then(m => ({ default: m.AllPendingLeavesCard })));
const NotCheckedInCard = lazy(() => import("@/components/home/NotCheckedInCard").then(m => ({ default: m.NotCheckedInCard })));
const UserHelpRequests = lazy(() => import("@/components/home/UserHelpRequests").then(m => ({ default: m.UserHelpRequests })));
const MyWorkflowTasks = lazy(() => import("@/components/home/MyWorkflowTasks").then(m => ({ default: m.MyWorkflowTasks })));

const getEventTypeBadgeStyle = (eventType: string) => {
  switch (eventType) {
    case 'holiday':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'event':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'meeting':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'training':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getEventTypeLabel = (eventType: string) => 
  eventType.charAt(0).toUpperCase() + eventType.slice(1);

interface HomeSidebarProps {
  currentEmployeeId: string | null;
  peopleOnLeave: PersonOnLeave[];
  upcomingTeamLeave: UpcomingTeamLeave[];
  upcomingBirthdays: UpcomingEvent[];
  upcomingAnniversaries: UpcomingEvent[];
  upcomingCalendarEvents: UpcomingCalendarEvent[];
  onLeaveDataChange: () => void;
}

export const HomeSidebar = ({
  currentEmployeeId,
  peopleOnLeave,
  upcomingTeamLeave,
  upcomingBirthdays,
  upcomingAnniversaries,
  upcomingCalendarEvents,
  onLeaveDataChange,
}: HomeSidebarProps) => {
  return (
    <div className="hidden lg:block space-y-6 lg:pl-2">
      <PendingLeaveApprovals onApprovalChange={onLeaveDataChange} />
      <PendingWfhApprovals />
      <PendingKpiUpdates />

      <Suspense fallback={<CardSkeleton />}>
        <NotCheckedInCard />
      </Suspense>

      <Suspense fallback={<CardSkeleton />}>
        <AllPendingLeavesCard />
      </Suspense>

      {currentEmployeeId && (
        <Suspense fallback={<CardSkeleton />}>
          <MyWorkflowTasks employeeId={currentEmployeeId} />
        </Suspense>
      )}

      {/* People on Leave Today */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Palmtree className="h-5 w-5 text-primary" />
            On Leave Today
          </h3>
          {peopleOnLeave.length > 0 && <span className="text-sm text-muted-foreground">{peopleOnLeave.length} people</span>}
        </div>
        {peopleOnLeave.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {peopleOnLeave.map(leave => (
              <HoverCard key={leave.id}>
                <HoverCardTrigger asChild>
                  <OrgLink to={`/team/${leave.employee.id}`}>
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer transition-transform hover:scale-110">
                        <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      {leave.half_day_type !== "full" && (
                        <span className="absolute -top-0.5 -right-0.5 text-[6px] font-semibold text-white bg-primary rounded-full px-0.5 py-px shadow-sm border border-background z-10 tracking-tighter">
                          {leave.half_day_type === "first_half" ? "1ˢᵗ" : "2ⁿᵈ"}
                        </span>
                      )}
                    </div>
                  </OrgLink>
                </HoverCardTrigger>
                <HoverCardContent className="w-64" side="top">
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {leave.employee.profiles.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {leave.employee.position}
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 capitalize">
                          <Palmtree className="h-3 w-3" />
                          {leave.leave_type.replace("_", " ")}
                          {leave.half_day_type !== "full" && ` (${leave.half_day_type === "first_half" ? "1st Half" : "2nd Half"})`}
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No one is on leave today</p>
        )}
        
        {upcomingTeamLeave.length > 0 && (
          <>
            <div className="border-t border-border my-4" />
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <CalendarDays className="h-4 w-4" />
                Upcoming Team Leave
              </h4>
              <div className="space-y-2">
                {upcomingTeamLeave.slice(0, 3).map(leave => {
                  const isMultiDay = leave.start_date !== leave.end_date;
                  const daysLabel = leave.days_count === 1 ? "1 day" : `${leave.days_count} days`;
                  const dateRange = isMultiDay 
                    ? `${format(parseISO(leave.start_date), "d MMM")} - ${format(parseISO(leave.end_date), "d MMM yyyy")}` 
                    : format(parseISO(leave.start_date), "d MMM yyyy");
                  return (
                    <OrgLink key={leave.id} to={`/team/${leave.employee.id}`} className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground flex-shrink-0">
                        {leave.employee.profiles.full_name.split(" ")[0]}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {leave.leave_type} · {daysLabel} · {dateRange}
                      </span>
                    </OrgLink>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Card>
      
      {/* Upcoming Events */}
      {upcomingCalendarEvents.length > 0 && (
        <Card className="p-6">
          <OrgLink to="/calendar" className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Events
          </OrgLink>
          <div className="space-y-3">
            {upcomingCalendarEvents.map(event => {
              const startDate = parseISO(event.start_date);
              const endDate = parseISO(event.end_date);
              const isMultiDay = event.start_date !== event.end_date;
              
              let dateTimeDisplay = format(startDate, "EEE, d MMM yyyy");
              if (event.start_time) {
                dateTimeDisplay += ` ${format(new Date(`2000-01-01T${event.start_time}`), "h:mm a")}`;
              }
              if (event.end_time && !isMultiDay) {
                dateTimeDisplay += ` - ${format(new Date(`2000-01-01T${event.end_time}`), "h:mm a")}`;
              }
              if (isMultiDay) {
                dateTimeDisplay += ` - ${format(endDate, "EEE, d MMM yyyy")}`;
                if (event.end_time) {
                  dateTimeDisplay += ` ${format(new Date(`2000-01-01T${event.end_time}`), "h:mm a")}`;
                }
              }
              
              const daysLabel = event.daysUntil === 0 
                ? "today" 
                : event.daysUntil === 1 
                  ? "tomorrow" 
                  : `in ${event.daysUntil} days`;
              
              const officeDisplay = event.applies_to_all_offices 
                ? "All Offices" 
                : event.office_names.length > 0 
                  ? event.office_names.join(", ")
                  : "No office assigned";
              
              return (
                <div key={event.id} className="rounded-lg p-3 transition-colors hover:bg-muted space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap",
                      getEventTypeBadgeStyle(event.event_type)
                    )}>
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {event.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{officeDisplay}</p>
                  <p className="text-xs text-muted-foreground">{dateTimeDisplay} · {daysLabel}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      
      {/* Upcoming Birthdays */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Cake className="h-5 w-5 text-primary" />
          Upcoming Birthdays
        </h3>
        {upcomingBirthdays.length > 0 ? (
          <div className="space-y-3">
            {upcomingBirthdays.map(birthday => (
              <OrgLink key={birthday.id} to={`/team/${birthday.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={birthday.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {birthday.profiles.full_name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {birthday.profiles.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {birthday.daysUntil === 0 ? "Today! 🎉" : birthday.daysUntil === 1 ? "Tomorrow" : `In ${birthday.daysUntil} days`}
                  </p>
                </div>
              </OrgLink>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming birthdays</p>
        )}
      </Card>

      {/* Work Anniversaries */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Award className="h-5 w-5 text-primary" />
          Work Anniversaries
        </h3>
        {upcomingAnniversaries.length > 0 ? (
          <div className="space-y-3">
            {upcomingAnniversaries.map(anniversary => (
              <OrgLink key={anniversary.id} to={`/team/${anniversary.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={anniversary.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {anniversary.profiles.full_name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {anniversary.profiles.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {anniversary.yearsCount} {anniversary.yearsCount === 1 ? "year" : "years"} · {anniversary.daysUntil === 0 ? "Today! 🎉" : anniversary.daysUntil === 1 ? "Tomorrow" : `In ${anniversary.daysUntil} days`}
                  </p>
                </div>
              </OrgLink>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming anniversaries</p>
        )}
      </Card>

      <Suspense fallback={<CardSkeleton />}>
        <UserHelpRequests />
      </Suspense>
    </div>
  );
};
