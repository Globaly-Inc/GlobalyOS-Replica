import { useState, useMemo } from 'react';
import { Bug, Lightbulb, Headphones, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { useUserSupportRequests } from '@/services/useSupportRequests';
import { UserSupportRequestCard } from './UserSupportRequestCard';
import { UserSupportRequestDetailSheet } from './UserSupportRequestDetailSheet';
import { SupportRequest } from '@/types/support';

export const UserHelpRequests = () => {
  const { data: requests = [], isLoading } = useUserSupportRequests();
  const [bugsOpen, setBugsOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const bugs = useMemo(() => requests.filter(r => r.type === 'bug'), [requests]);
  const features = useMemo(() => requests.filter(r => r.type === 'feature'), [requests]);

  const handleCardClick = (request: SupportRequest) => {
    setSelectedRequest(request);
    setDetailSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Headphones className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">GlobalyOS Help</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-muted rounded-lg" />
          <div className="h-10 bg-muted rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Headphones className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">GlobalyOS Help</h3>
        </div>

        <div className="space-y-3">
          {/* Bugs Section */}
          <Collapsible open={bugsOpen} onOpenChange={setBugsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-destructive" />
                <span className="font-medium text-sm">Bugs</span>
                <Badge variant="secondary" className="h-5 text-xs">
                  {bugs.length}
                </Badge>
              </div>
              {bugsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {bugs.length > 0 ? (
                <div className="relative">
                  <Carousel
                    opts={{
                      align: 'start',
                      slidesToScroll: 1,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-2">
                      {bugs.map(request => (
                        <CarouselItem key={request.id} className="pl-2 basis-[90%]">
                          <UserSupportRequestCard 
                            request={request} 
                            onClick={() => handleCardClick(request)} 
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {bugs.length > 1 && (
                      <>
                        <CarouselPrevious className="left-0 h-7 w-7" />
                        <CarouselNext className="right-0 h-7 w-7" />
                      </>
                    )}
                  </Carousel>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No bug reports submitted
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Features Section */}
          <Collapsible open={featuresOpen} onOpenChange={setFeaturesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Feature Requests</span>
                <Badge variant="secondary" className="h-5 text-xs">
                  {features.length}
                </Badge>
              </div>
              {featuresOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {features.length > 0 ? (
                <div className="relative">
                  <Carousel
                    opts={{
                      align: 'start',
                      slidesToScroll: 1,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-2">
                      {features.map(request => (
                        <CarouselItem key={request.id} className="pl-2 basis-[90%]">
                          <UserSupportRequestCard 
                            request={request} 
                            onClick={() => handleCardClick(request)} 
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {features.length > 1 && (
                      <>
                        <CarouselPrevious className="left-0 h-7 w-7" />
                        <CarouselNext className="right-0 h-7 w-7" />
                      </>
                    )}
                  </Carousel>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No feature requests submitted
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {requests.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            No requests submitted yet. Use the "Get Help" button to report bugs or suggest features.
          </p>
        )}
      </Card>

      <UserSupportRequestDetailSheet
        request={selectedRequest}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </>
  );
};
