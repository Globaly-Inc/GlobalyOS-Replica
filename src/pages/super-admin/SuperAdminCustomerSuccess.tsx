import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Lightbulb, Search, Filter, Headphones, BookOpen } from 'lucide-react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SupportRequestCard } from '@/components/super-admin/SupportRequestCard';
import { SupportRequestDetailSheet } from '@/components/super-admin/SupportRequestDetailSheet';
import { useAllSupportRequests, useUpdateSupportRequest } from '@/services/useSupportRequests';
import { useSupportRequestsListRealtime } from '@/hooks/useSupportRequestRealtime';
import { 
  SupportRequest, 
  SupportRequestType, 
  SupportRequestStatus, 
  KANBAN_COLUMNS, 
  STATUS_CONFIG,
  SupportRequestPriority 
} from '@/types/support';
import { cn } from '@/lib/utils';

const SuperAdminCustomerSuccess = () => {
  const [typeFilter, setTypeFilter] = useState<'all' | SupportRequestType>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | SupportRequestPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const { data: requests = [], isLoading } = useAllSupportRequests();
  const updateRequest = useUpdateSupportRequest();
  
  // Enable realtime updates for the list
  useSupportRequestsListRealtime();

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      if (typeFilter !== 'all' && request.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          request.title.toLowerCase().includes(query) ||
          request.description.toLowerCase().includes(query) ||
          request.profiles?.full_name?.toLowerCase().includes(query) ||
          request.organizations?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [requests, typeFilter, priorityFilter, searchQuery]);

  // Group by status for Kanban
  const requestsByStatus = useMemo(() => {
    const grouped: Record<SupportRequestStatus, SupportRequest[]> = {
      new: [],
      triaging: [],
      in_progress: [],
      resolved: [],
      closed: [],
      wont_fix: [],
    };

    filteredRequests.forEach(request => {
      grouped[request.status].push(request);
    });

    return grouped;
  }, [filteredRequests]);

  // Counts
  const bugCount = requests.filter(r => r.type === 'bug').length;
  const featureCount = requests.filter(r => r.type === 'feature').length;

  const handleCardClick = (request: SupportRequest) => {
    setSelectedRequest(request);
    setDetailSheetOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, request: SupportRequest) => {
    e.dataTransfer.setData('requestId', request.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: SupportRequestStatus) => {
    e.preventDefault();
    const requestId = e.dataTransfer.getData('requestId');
    if (requestId) {
      updateRequest.mutate({ id: requestId, status });
    }
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Customer Success</h1>
          <p className="text-muted-foreground">Manage bug reports and feature requests</p>
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-4">
            <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground">
              <Headphones className="h-4 w-4" />
              Support Requests
            </div>
            <Link
              to="/super-admin/documentation"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-sm">
            <Bug className="h-4 w-4 mr-1.5 text-destructive" />
            {bugCount} Bugs
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-sm">
            <Lightbulb className="h-4 w-4 mr-1.5 text-primary" />
            {featureCount} Features
          </Badge>
        </div>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Type Tabs */}
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <TabsList>
              <TabsTrigger value="all">
                All ({requests.length})
              </TabsTrigger>
              <TabsTrigger value="bug" className="gap-1.5">
                <Bug className="h-3.5 w-3.5" />
                Bugs ({bugCount})
              </TabsTrigger>
              <TabsTrigger value="feature" className="gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Features ({featureCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1" />

          {/* Search & Priority Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-5 gap-4 min-h-[600px]">
          {KANBAN_COLUMNS.map(status => {
            const config = STATUS_CONFIG[status];
            const columnRequests = requestsByStatus[status];

            return (
              <div
                key={status}
                className="flex flex-col bg-muted/30 rounded-lg"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
                    <span className="font-medium text-sm">{config.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnRequests.length}
                  </Badge>
                </div>

                {/* Column Content */}
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2">
                    {columnRequests.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        No requests
                      </div>
                    ) : (
                      columnRequests.map(request => (
                        <div
                          key={request.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, request)}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <SupportRequestCard
                            request={request}
                            onClick={() => handleCardClick(request)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
            })}
          </div>
      </div>

      {/* Detail Sheet */}
      <SupportRequestDetailSheet
        request={selectedRequest}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomerSuccess;
