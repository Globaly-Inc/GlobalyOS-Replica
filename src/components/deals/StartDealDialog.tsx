import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateDeal } from '@/services/useCRMDeals';
import { useCRMPipeline } from '@/services/useCRMPipelines';
import type { CRMPipeline } from '@/types/crm-pipeline';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: CRMPipeline[];
  defaultPipelineId?: string;
}

export function StartDealDialog({ open, onOpenChange, pipelines, defaultPipelineId }: Props) {
  const [pipelineId, setPipelineId] = useState(defaultPipelineId || '');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const { data: pipeline } = useCRMPipeline(pipelineId || undefined);
  const createDeal = useCreateDeal();

  useEffect(() => {
    if (defaultPipelineId) setPipelineId(defaultPipelineId);
  }, [defaultPipelineId]);

  const firstStage = pipeline?.stages?.sort((a, b) => a.sort_order - b.sort_order)?.[0];

  const handleCreate = async () => {
    if (!title.trim() || !pipelineId) return;
    await createDeal.mutateAsync({
      pipeline_id: pipelineId,
      title,
      priority,
      current_stage_id: firstStage?.id,
    });
    onOpenChange(false);
    setTitle('');
    setPriority('medium');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>Start a new deal or application</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Pipeline</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger><SelectValue placeholder="Select pipeline" /></SelectTrigger>
              <SelectContent>
                {pipelines.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. John's Student Visa Application" />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || !pipelineId || createDeal.isPending}>
            Create Deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
