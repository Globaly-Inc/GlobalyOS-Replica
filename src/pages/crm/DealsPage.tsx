import { useState, useMemo } from 'react';
import { Search, Plus, LayoutGrid, List, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageBody } from '@/components/ui/page-body';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCRMPipelines } from '@/services/useCRMPipelines';
import { useCRMDealsByPipeline } from '@/services/useCRMDeals';
import { DealKanbanBoard } from '@/components/deals/DealKanbanBoard';
import { DealListView } from '@/components/deals/DealListView';
import { StartDealDialog } from '@/components/deals/StartDealDialog';
import { Skeleton } from '@/components/ui/skeleton';

const DealsPage = () => {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: pipelines, isLoading: pipelinesLoading } = useCRMPipelines();

  // Auto-select first pipeline
  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id || '';
  const activePipeline = pipelines?.find(p => p.id === activePipelineId);

  const { data: deals, isLoading: dealsLoading } = useCRMDealsByPipeline(activePipelineId);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    if (!search) return deals;
    const q = search.toLowerCase();
    return deals.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.contact?.first_name?.toLowerCase().includes(q) ||
      d.contact?.last_name?.toLowerCase().includes(q)
    );
  }, [deals, search]);

  return (
    <PageBody>
      <PageHeader title="Deals" subtitle="Manage your deals and applications through pipelines">
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Deal
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Select value={activePipelineId} onValueChange={setSelectedPipelineId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')} className="ml-auto">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-3.5 w-3.5" /> List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {pipelinesLoading || dealsLoading ? (
        <div className="grid grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[400px] rounded-lg" />)}
        </div>
      ) : !pipelines?.length ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No pipelines configured yet. Set up pipelines in Settings first.</p>
        </div>
      ) : view === 'kanban' ? (
        <DealKanbanBoard
          pipeline={activePipeline!}
          deals={filteredDeals}
        />
      ) : (
        <DealListView deals={filteredDeals} />
      )}

      <StartDealDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        pipelines={pipelines || []}
        defaultPipelineId={activePipelineId}
      />
    </PageBody>
  );
};

export default DealsPage;
