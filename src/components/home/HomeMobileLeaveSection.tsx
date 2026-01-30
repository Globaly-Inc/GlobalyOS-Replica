import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Palmtree } from "lucide-react";
import { OrgLink } from "@/components/OrgLink";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { PendingLeaveApprovals } from "@/components/PendingLeaveApprovals";
import { SelfCheckInCard } from "@/components/home/SelfCheckInCard";
import type { PersonOnLeave } from "@/hooks/useHomeData";

const AllPendingLeavesCard = lazy(() => import("@/components/home/AllPendingLeavesCard").then(m => ({ default: m.AllPendingLeavesCard })));

interface HomeMobileLeaveSectionProps {
  peopleOnLeave: PersonOnLeave[];
  onLeaveDataChange: () => void;
}

export const HomeMobileLeaveSection = ({ peopleOnLeave, onLeaveDataChange }: HomeMobileLeaveSectionProps) => {
  return (
    <div className="lg:hidden space-y-3 mb-4">
      <SelfCheckInCard />
      <PendingLeaveApprovals onApprovalChange={onLeaveDataChange} />
      <Suspense fallback={<CardSkeleton />}>
        <AllPendingLeavesCard />
      </Suspense>
      
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Palmtree className="h-3.5 w-3.5 text-primary" />
            On Leave Today
          </h3>
          {peopleOnLeave.length > 0 && <span className="text-[11px] text-muted-foreground">{peopleOnLeave.length} people</span>}
        </div>
        {peopleOnLeave.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {peopleOnLeave.slice(0, 8).map(leave => (
              <OrgLink key={leave.id} to={`/team/${leave.employee.id}`}>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-background shadow-sm cursor-pointer transition-transform hover:scale-110">
                    <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  {leave.half_day_type !== "full" && (
                    <span className="absolute -top-0.5 -right-0.5 text-[5px] font-semibold text-white bg-primary rounded-full px-0.5 shadow-sm border border-background z-10">
                      {leave.half_day_type === "first_half" ? "1" : "2"}
                    </span>
                  )}
                </div>
              </OrgLink>
            ))}
            {peopleOnLeave.length > 8 && (
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                +{peopleOnLeave.length - 8}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No one is on leave today</p>
        )}
      </Card>
    </div>
  );
};
