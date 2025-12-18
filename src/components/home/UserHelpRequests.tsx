import { useState, useMemo } from 'react';
import { Bug, Lightbulb, Headphones, LifeBuoy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { useUserSupportRequests } from '@/services/useSupportRequests';
import { UserSupportRequestCard } from './UserSupportRequestCard';
import { UserSupportRequestDetailSheet } from './UserSupportRequestDetailSheet';
import { GetHelpDialog } from '@/components/dialogs/GetHelpDialog';
import { SupportRequest } from '@/types/support';
import { cn } from '@/lib/utils';

export const UserHelpRequests = () => {
  const { data: requests = [], isLoading } = useUserSupportRequests();
  const [activeTab, setActiveTab] = useState<'bugs' | 'features'>('bugs');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const bugs = useMemo(() => requests.filter(r => r.type === 'bug'), [requests]);
  const features = useMemo(() => requests.filter(r => r.type === 'feature'), [requests]);
  const activeRequests = activeTab === 'bugs' ? bugs : features;

  const handleCardClick = (request: SupportRequest) => {
    setSelectedRequest(request);
    setDetailSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">GlobalyOS Help</h3>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-muted rounded-full w-48" />
          <div className="h-24 bg-muted rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">GlobalyOS Help</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setHelpDialogOpen(true)}
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Get Help
          </Button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('bugs')}
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
            onClick={() => setActiveTab('features')}
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

        {/* Cards Carousel */}
        {activeRequests.length > 0 ? (
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
              {activeRequests.length > 1 && (
                <>
                  <CarouselPrevious className="left-0 h-7 w-7" />
                  <CarouselNext className="right-0 h-7 w-7" />
                </>
              )}
            </Carousel>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No {activeTab === 'bugs' ? 'bug reports' : 'feature requests'} submitted
          </p>
        )}

        {requests.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
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
