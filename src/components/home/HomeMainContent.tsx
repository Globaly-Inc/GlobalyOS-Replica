import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Heart, MessageSquare, Megaphone, CalendarDays, Filter, Crown, Users } from "lucide-react";
import { InlinePostComposer } from "@/components/feed/InlinePostComposer";
import { UnifiedFeed } from "@/components/feed/UnifiedFeed";
import { SelfCheckInCard } from "@/components/home/SelfCheckInCard";
import { useHomeFilters } from "@/hooks/useHomeFilters";
import { useUserRole } from "@/hooks/useUserRole";

type DateFilter = "all" | "today" | "week" | "month";

interface HomeMainContentProps {
  hasEmployeeProfile: boolean;
}

export const HomeMainContent = ({ hasEmployeeProfile }: HomeMainContentProps) => {
  const { isHR, isAdmin, isOwner } = useUserRole();
  const {
    feedFilter, setFeedFilter,
    dateFilter, setDateFilter,
  } = useHomeFilters();

  return (
    <div className="lg:col-span-2 lg:pr-2">
      {/* Self Check-In Card - Desktop */}
      <div className="mb-6 hidden lg:block">
        <SelfCheckInCard />
      </div>
      
      {hasEmployeeProfile && (
        <div className="mb-6">
          <InlinePostComposer 
            canPostAnnouncement={isOwner || isAdmin || isHR}
            canPostExecutive={isOwner || isAdmin}
          />
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={feedFilter} onValueChange={setFeedFilter}>
            <SelectTrigger className="w-[180px] h-9 bg-background">
              <SelectValue placeholder="Filter posts" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> All Posts
                </span>
              </SelectItem>
              <SelectItem value="win">
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" /> Wins
                </span>
              </SelectItem>
              <SelectItem value="kudos">
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" /> Kudos
                </span>
              </SelectItem>
              <SelectItem value="social">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" /> Social
                </span>
              </SelectItem>
              <SelectItem value="update">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-cyan-500" /> Updates
                </span>
              </SelectItem>
              <SelectItem value="announcement">
                <span className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-blue-500" /> Announcements
                </span>
              </SelectItem>
              <SelectItem value="executive_message">
                <span className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-purple-500" /> Executive
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
          <SelectTrigger className="w-9 md:w-[130px] h-9 bg-background px-2 md:px-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="hidden md:inline md:ml-2">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feed Content */}
      <UnifiedFeed 
        feedFilter={feedFilter} 
        dateFilter={dateFilter}
      />
    </div>
  );
};
