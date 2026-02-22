import { useParams } from 'react-router-dom';
import { PageBody } from '@/components/ui/page-body';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trophy, User, Building2, Users, Calendar, DollarSign, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCRMDeal, useCloseDeal, useReopenDeal } from '@/services/useCRMDeals';
import { useCRMPipeline } from '@/services/useCRMPipelines';
import { useDealNotes, useAddDealNote, useDealTasks, useDealActivityLog } from '@/services/useCRMDeals';
import { DealNotesTab } from '@/components/deals/DealNotesTab';
import { DealTasksTab } from '@/components/deals/DealTasksTab';
import { DealActivityLog } from '@/components/deals/DealActivityLog';
import { DealDocumentsTab } from '@/components/deals/DealDocumentsTab';
import { DealFeesTab } from '@/components/deals/DealFeesTab';
import { DealRequirementsTab } from '@/components/deals/DealRequirementsTab';
import { DealStageProgress } from '@/components/deals/DealStageProgress';
import { CloseDealDialog } from '@/components/deals/CloseDealDialog';
import { OrgLink } from '@/components/OrgLink';
import { format } from 'date-fns';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

function ReopenButton({ dealId, pipelineId }: { dealId: string; pipelineId: string }) {
  const { data: pipeline } = useCRMPipeline(pipelineId);
  const reopenDeal = useReopenDeal();
  const firstStage = pipeline?.stages?.sort((a, b) => a.sort_order - b.sort_order)?.[0];

  if (!firstStage) return null;

  return (
    <Button
      variant="outline"
      className="gap-2"
      disabled={reopenDeal.isPending}
      onClick={() => reopenDeal.mutate({ dealId, stageId: firstStage.id })}
    >
      <RotateCcw className="h-4 w-4" /> Reopen Deal
    </Button>
  );
}

const DealDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading } = useCRMDeal(id);
  const { data: pipeline } = useCRMPipeline(deal?.pipeline_id);
  const [showClose, setShowClose] = useState(false);
  const [closeType, setCloseType] = useState<'won' | 'lost' | 'cancelled'>('won');

  if (isLoading) {
    return <PageBody><Skeleton className="h-[600px] rounded-lg" /></PageBody>;
  }

  if (!deal) {
    return (
      <PageBody>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Deal not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <OrgLink to="/crm/deals"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Deals</OrgLink>
          </Button>
        </div>
      </PageBody>
    );
  }

  const stages = pipeline?.stages?.sort((a, b) => a.sort_order - b.sort_order) || [];

  return (
    <PageBody>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <OrgLink to="/crm/deals" className="hover:text-foreground">Deals</OrgLink>
        <span>/</span>
        <span className="text-foreground truncate">{deal.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{deal.title}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant={deal.status === 'active' ? 'default' : deal.status === 'won' ? 'default' : 'secondary'} className={deal.status === 'won' ? 'bg-emerald-500' : ''}>
                  {deal.status}
                </Badge>
                <Badge variant={deal.priority === 'high' ? 'destructive' : deal.priority === 'medium' ? 'default' : 'secondary'}>
                  {deal.priority} priority
                </Badge>
              </div>
            </div>

            {deal.status === 'active' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Close Deal <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setCloseType('won'); setShowClose(true); }}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Mark as Won
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setCloseType('lost'); setShowClose(true); }}>
                    <XCircle className="h-4 w-4 mr-2 text-destructive" /> Mark as Lost
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setCloseType('cancelled'); setShowClose(true); }}>
                    <XCircle className="h-4 w-4 mr-2 text-muted-foreground" /> Cancel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <ReopenButton dealId={deal.id} pipelineId={deal.pipeline_id} />
            )}
          </div>

          {/* Stage Progress */}
          {stages.length > 0 && deal.status === 'active' && (
            <div className="mt-4">
              <DealStageProgress stages={stages} currentStageId={deal.current_stage_id} dealId={deal.id} />
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="requirements" className="mt-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="requirements">
              <DealRequirementsTab dealId={deal.id} />
            </TabsContent>
            <TabsContent value="notes">
              <DealNotesTab dealId={deal.id} />
            </TabsContent>
            <TabsContent value="documents">
              <DealDocumentsTab dealId={deal.id} />
            </TabsContent>
            <TabsContent value="tasks">
              <DealTasksTab dealId={deal.id} />
            </TabsContent>
            <TabsContent value="fees">
              <DealFeesTab dealId={deal.id} />
            </TabsContent>
            <TabsContent value="activity">
              <DealActivityLog dealId={deal.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[320px] space-y-4 shrink-0">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Deal Info</h3>

            {deal.contact && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{deal.contact.first_name} {deal.contact.last_name}</p>
                  {deal.contact.email && <p className="text-xs text-muted-foreground">{deal.contact.email}</p>}
                </div>
              </div>
            )}

            {deal.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{deal.company.name}</p>
              </div>
            )}

            {deal.assignee && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={deal.assignee.avatar_url || ''} />
                    <AvatarFallback className="text-[10px]">{deal.assignee.first_name?.[0]}{deal.assignee.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm">{deal.assignee.first_name} {deal.assignee.last_name}</p>
                </div>
              </div>
            )}

            {deal.agent_partner && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">Agent: {deal.agent_partner.name}</p>
              </div>
            )}

            {deal.deal_value != null && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">{deal.currency} {Number(deal.deal_value).toLocaleString()}</p>
              </div>
            )}

            {deal.expected_close_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">Expected: {format(new Date(deal.expected_close_date), 'dd MMM yyyy')}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              Created {format(new Date(deal.created_at), 'dd MMM yyyy')}
            </div>
          </Card>

          {deal.lost_reason && (
            <Card className="p-4 border-destructive/50">
              <h3 className="text-sm font-semibold text-destructive">Close Reason</h3>
              <p className="text-sm mt-1">{deal.lost_reason}</p>
              {deal.lost_notes && <p className="text-xs text-muted-foreground mt-1">{deal.lost_notes}</p>}
            </Card>
          )}
        </div>
      </div>

      <CloseDealDialog
        open={showClose}
        onOpenChange={setShowClose}
        dealId={deal.id}
        type={closeType}
      />
    </PageBody>
  );
};

export default DealDetailPage;
