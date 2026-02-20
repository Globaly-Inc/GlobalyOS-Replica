import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useCallQueues, useQueueMembers, useCreateQueue, useUpdateQueue, useAddQueueMember, useRemoveQueueMember } from '@/hooks/useCallQueues';
import { InboxSubNav } from '@/components/inbox/InboxSubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Users, Plus, Settings, Shuffle, ArrowDownUp, Star, Trash2, Loader2,
} from 'lucide-react';

const STRATEGY_LABELS: Record<string, { label: string; icon: typeof Shuffle }> = {
  round_robin: { label: 'Round Robin', icon: Shuffle },
  longest_idle: { label: 'Longest Idle', icon: ArrowDownUp },
  priority: { label: 'Priority Based', icon: Star },
};

const CallQueuesPage = () => {
  const { data: queues = [], isLoading } = useCallQueues();
  const createQueue = useCreateQueue();
  const updateQueue = useUpdateQueue();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const { data: members = [] } = useQueueMembers(selectedQueueId ?? undefined);
  const removeQueueMember = useRemoveQueueMember();

  const [newName, setNewName] = useState('');
  const [newStrategy, setNewStrategy] = useState('round_robin');
  const [newMaxWait, setNewMaxWait] = useState(300);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createQueue.mutateAsync({
      name: newName,
      strategy: newStrategy,
      max_wait_seconds: newMaxWait,
    } as any);
    setShowCreate(false);
    setNewName('');
  };

  const selectedQueue = queues.find((q) => q.id === selectedQueueId);

  return (
    <div>
      <InboxSubNav />
      <div className="container px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Call Queues</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage call routing queues and distribution strategies</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Queue
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
          </div>
        ) : queues.length === 0 ? (
          <Card className="border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">No call queues</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create a queue to distribute incoming calls across agents using round-robin, longest-idle, or priority strategies.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queues.map((q) => {
              const strat = STRATEGY_LABELS[q.strategy] || STRATEGY_LABELS.round_robin;
              const StratIcon = strat.icon;
              return (
                <Card key={q.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelectedQueueId(q.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{q.name}</CardTitle>
                      <Badge variant={q.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {q.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {q.description && <CardDescription className="text-xs">{q.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <StratIcon className="h-3.5 w-3.5" />
                      <span>{strat.label}</span>
                      <span>·</span>
                      <span>Max wait: {Math.round(q.max_wait_seconds / 60)}m</span>
                      <span>·</span>
                      <span>Max size: {q.max_queue_size}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Queue detail dialog */}
        <Dialog open={!!selectedQueueId} onOpenChange={(o) => !o && setSelectedQueueId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedQueue?.name}
                {selectedQueue && (
                  <Badge variant={selectedQueue.is_active ? 'default' : 'secondary'} className="text-[10px]">
                    {selectedQueue.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedQueue && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Strategy</Label>
                    <Select
                      value={selectedQueue.strategy}
                      onValueChange={(v) => updateQueue.mutate({ id: selectedQueue.id, strategy: v } as any)}
                    >
                      <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="longest_idle">Longest Idle</SelectItem>
                        <SelectItem value="priority">Priority Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Active</Label>
                    <Switch
                      checked={selectedQueue.is_active}
                      onCheckedChange={(v) => updateQueue.mutate({ id: selectedQueue.id, is_active: v } as any)}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> Queue Members ({members.length})</h4>
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No members assigned to this queue yet.</p>
                  ) : (
                    <div className="rounded-md border divide-y">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2">
                          <div className="text-xs">
                            <span className="font-medium">Agent</span>
                            <span className="text-muted-foreground ml-2">Priority: {m.priority}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={m.is_available ? 'default' : 'secondary'} className="text-[10px]">
                              {m.is_available ? 'Available' : 'Offline'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeQueueMember.mutate({ id: m.id, queueId: selectedQueue.id })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Call Queue</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Queue Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Sales Queue" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Distribution Strategy</Label>
                <Select value={newStrategy} onValueChange={setNewStrategy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="longest_idle">Longest Idle</SelectItem>
                    <SelectItem value="priority">Priority Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Max Wait Time (seconds)</Label>
                <Input type="number" value={newMaxWait} onChange={(e) => setNewMaxWait(parseInt(e.target.value) || 300)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || createQueue.isPending}>
                {createQueue.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Queue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CallQueuesPage;
