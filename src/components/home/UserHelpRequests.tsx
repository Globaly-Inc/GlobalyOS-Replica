import { useState, useMemo } from 'react';
import { Bug, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { useUserSupportRequests } from '@/services/useSupportRequests';
import { UserSupportRequestCard } from './UserSupportRequestCard';
import { UserSupportRequestDetailSheet } from './UserSupportRequestDetailSheet';
import { GetHelpDialog } from '@/components/dialogs/GetHelpDialog';
import { SupportRequest } from '@/types/support';
import { cn } from '@/lib/utils';

type TabType = 'bugs' | 'features' | null;

export const UserHelpRequests = () => {
  const { data: requests = [], isLoading } = useUserSupportRequests();
  const [activeTab, setActiveTab] = useState<TabType>(null);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // Only show pending items (not resolved, closed, or wont_fix)
  const pendingStatuses = ['new', 'triaging', 'in_progress'];
  const bugs = useMemo(() => requests.filter(r => r.type === 'bug' && pendingStatuses.includes(r.status)), [requests]);
  const features = useMemo(() => requests.filter(r => r.type === 'feature' && pendingStatuses.includes(r.status)), [requests]);

  const handleTabClick = (tab: Exclude<TabType, null>) => {
    setActiveTab(current => current === tab ? null : tab);
  };

  const getActiveRequests = () => {
    if (activeTab === 'bugs') return bugs;
    if (activeTab === 'features') return features;
    return [];
  };

  const activeRequests = getActiveRequests();
  const handleCardClick = (request: SupportRequest) => {
    setSelectedRequest(request);
    setDetailSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 bg-muted rounded-full w-20 animate-pulse" />
            <div className="h-8 bg-muted rounded-full w-24 animate-pulse" />
          </div>
          <div className="h-7 bg-muted rounded w-16 animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        {/* Header with tabs and Get Help button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabClick('bugs')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeTab === 'bugs'
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Bug className="h-3.5 w-3.5" />
              Bugs
              <Badge variant="secondary" className="h-4 text-[10px] px-1.5 ml-0.5">
                {bugs.length}
              </Badge>
            </button>

            <button
              onClick={() => handleTabClick('features')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeTab === 'features'
                  ? "bg-primary/10 text-primary"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Features
              <Badge variant="secondary" className="h-4 text-[10px] px-1.5 ml-0.5">
                {features.length}
              </Badge>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setHelpDialogOpen(true)}
          >
            Get Help
          </Button>
        </div>

        {/* Cards Carousel - only show when a tab is selected and has content */}
        {activeTab && activeRequests.length > 0 && (
          <div className="relative">
            <Carousel
              opts={{
                align: 'start',
                slidesToScroll: 1,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {activeRequests.map(request => (
                  <CarouselItem key={request.id} className="pl-2 basis-[75%]">
                    <UserSupportRequestCard
                      request={request}
                      onClick={() => handleCardClick(request)}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        )}

        {/* Helper text only when no requests exist at all */}
        {requests.length === 0 && !activeTab && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Use the "Get Help" button to report bugs or suggest features.
          </p>
        )}
      </Card>

      <GetHelpDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />

      <UserSupportRequestDetailSheet
        request={selectedRequest}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </>
  );
};
