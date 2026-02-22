import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageBody } from '@/components/ui/page-body';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2, ChevronDown, GripVertical, Trophy, FileText, Upload, ListChecks, MessageSquare, FormInput, ArrowLeft } from 'lucide-react';
import { useCRMPipeline, useCreateStage, useUpdateStage, useDeleteStage, useCreateRequirement, useDeleteRequirement } from '@/services/useCRMPipelines';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { CRMPipelineStage, CRMStageRequirement, RequirementType, TargetRole } from '@/types/crm-pipeline';
import { OrgLink } from '@/components/OrgLink';

const REQUIREMENT_ICONS: Record<RequirementType, React.ReactNode> = {
  task: <ListChecks className="h-4 w-4" />,
  document: <Upload className="h-4 w-4" />,
  field: <FormInput className="h-4 w-4" />,
  form: <FileText className="h-4 w-4" />,
  note_question: <MessageSquare className="h-4 w-4" />,
};

const REQUIREMENT_LABELS: Record<RequirementType, string> = {
  task: 'Task',
  document: 'Document',
  field: 'Required Field',
  form: 'Form',
  note_question: 'Note / Question',
};

const TARGET_LABELS: Record<TargetRole, string> = {
  assignee: 'Team Member',
  contact: 'Contact',
  agent: 'Agent',
};

const STAGE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const SettingsPipelineDetail = () => {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const { data: pipeline, isLoading } = useCRMPipeline(pipelineId);
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const createRequirement = useCreateRequirement();
  const deleteRequirement = useDeleteRequirement();
  const { navigateOrg } = useOrgNavigation();

  const [showStageDialog, setShowStageDialog] = useState(false);
  const [editStage, setEditStage] = useState<CRMPipelineStage | null>(null);
  const [stageForm, setStageForm] = useState({ name: '', color: '#6366f1', stage_type: 'normal' as 'normal' | 'win' });

  const [showReqDialog, setShowReqDialog] = useState(false);
  const [reqStageId, setReqStageId] = useState<string>('');
  const [reqForm, setReqForm] = useState({
    requirement_type: 'task' as RequirementType,
    title: '',
    description: '',
    is_required: true,
    target_role: 'assignee' as TargetRole,
  });

  const [openStages, setOpenStages] = useState<Set<string>>(new Set());

  const toggleStage = (id: string) => {
    setOpenStages(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreateStage = () => {
    setStageForm({ name: '', color: STAGE_COLORS[pipeline?.stages?.length || 0 % STAGE_COLORS.length], stage_type: 'normal' });
    setEditStage(null);
    setShowStageDialog(true);
  };

  const openEditStage = (s: CRMPipelineStage) => {
    setStageForm({ name: s.name, color: s.color, stage_type: s.stage_type });
    setEditStage(s);
    setShowStageDialog(true);
  };

  const handleSaveStage = async () => {
    if (!stageForm.name.trim() || !pipelineId) return;
    if (editStage) {
      await updateStage.mutateAsync({ id: editStage.id, ...stageForm });
    } else {
      await createStage.mutateAsync({
        pipeline_id: pipelineId,
        ...stageForm,
        sort_order: (pipeline?.stages?.length || 0),
      });
    }
    setShowStageDialog(false);
  };

  const openAddReq = (stageId: string) => {
    setReqStageId(stageId);
    setReqForm({ requirement_type: 'task', title: '', description: '', is_required: true, target_role: 'assignee' });
    setShowReqDialog(true);
  };

  const handleSaveReq = async () => {
    if (!reqForm.title.trim() || !pipelineId || !reqStageId) return;
    await createRequirement.mutateAsync({
      stage_id: reqStageId,
      pipeline_id: pipelineId,
      requirement_type: reqForm.requirement_type,
      title: reqForm.title,
      description: reqForm.description || null,
      is_required: reqForm.is_required,
      target_role: reqForm.target_role,
      config: {},
      sort_order: 0,
    });
    setShowReqDialog(false);
  };

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </PageBody>
    );
  }

  if (!pipeline) {
    return (
      <PageBody>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Pipeline not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigateOrg('/settings/pipelines')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Pipelines
          </Button>
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <OrgLink to="/settings/pipelines" className="hover:text-foreground">Pipelines</OrgLink>
        <span>/</span>
        <span className="text-foreground">{pipeline.name}</span>
      </div>

      <PageHeader title={pipeline.name} subtitle={pipeline.description || 'Configure stages and requirements'}>
        <Button onClick={openCreateStage} className="gap-2">
          <Plus className="h-4 w-4" /> Add Stage
        </Button>
      </PageHeader>

      <div className="space-y-3">
        {pipeline.stages?.map((stage, idx) => (
          <Card key={stage.id} className="overflow-hidden">
            <Collapsible open={openStages.has(stage.id)} onOpenChange={() => toggleStage(stage.id)}>
              <div className="flex items-center gap-3 p-4">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage.name}</span>
                    {stage.stage_type === 'win' && (
                      <Badge variant="default" className="gap-1 text-xs bg-emerald-500">
                        <Trophy className="h-3 w-3" /> Win Stage
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {stage.requirements?.length || 0} requirements
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditStage(stage)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Stage
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openAddReq(stage.id)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Requirement
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteStage.mutate(stage.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Stage
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <ChevronDown className={`h-4 w-4 transition-transform ${openStages.has(stage.id) ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="border-t px-4 py-3 bg-muted/30">
                  {!stage.requirements?.length ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      <p>No requirements for this stage</p>
                      <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => openAddReq(stage.id)}>
                        <Plus className="h-3 w-3" /> Add Requirement
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stage.requirements.map(req => (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                          <div className="text-muted-foreground">{REQUIREMENT_ICONS[req.requirement_type]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{req.title}</span>
                              {req.is_required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">{REQUIREMENT_LABELS[req.requirement_type]}</Badge>
                              <Badge variant="secondary" className="text-[10px]">For: {TARGET_LABELS[req.target_role]}</Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteRequirement.mutate(req.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full gap-1 mt-1" onClick={() => openAddReq(stage.id)}>
                        <Plus className="h-3 w-3" /> Add Requirement
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {!pipeline.stages?.length && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">No stages yet. Add stages to define your pipeline workflow.</p>
            <Button onClick={openCreateStage} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Add First Stage
            </Button>
          </Card>
        )}
      </div>

      {/* Stage Dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editStage ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
            <DialogDescription>Configure a pipeline stage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={stageForm.name} onChange={e => setStageForm({ ...stageForm, name: e.target.value })} placeholder="e.g. Document Collection" />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {STAGE_COLORS.map(c => (
                  <button key={c} className={`h-7 w-7 rounded-full border-2 transition-all ${stageForm.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} onClick={() => setStageForm({ ...stageForm, color: c })} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Win Stage</Label>
                <p className="text-xs text-muted-foreground">Mark as the success/completion stage</p>
              </div>
              <Switch checked={stageForm.stage_type === 'win'} onCheckedChange={v => setStageForm({ ...stageForm, stage_type: v ? 'win' : 'normal' })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStageDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveStage} disabled={!stageForm.name.trim()}>
              {editStage ? 'Save' : 'Add Stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requirement Dialog */}
      <Dialog open={showReqDialog} onOpenChange={setShowReqDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Requirement</DialogTitle>
            <DialogDescription>Define what must be completed at this stage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={reqForm.requirement_type} onValueChange={(v: RequirementType) => setReqForm({ ...reqForm, requirement_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(REQUIREMENT_LABELS) as RequirementType[]).map(t => (
                    <SelectItem key={t} value={t} className="gap-2">
                      <span className="flex items-center gap-2">{REQUIREMENT_ICONS[t]} {REQUIREMENT_LABELS[t]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={reqForm.title} onChange={e => setReqForm({ ...reqForm, title: e.target.value })} placeholder="e.g. Upload passport copy" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={reqForm.description} onChange={e => setReqForm({ ...reqForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Target</Label>
              <Select value={reqForm.target_role} onValueChange={(v: TargetRole) => setReqForm({ ...reqForm, target_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TARGET_LABELS) as TargetRole[]).map(t => (
                    <SelectItem key={t} value={t}>{TARGET_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch checked={reqForm.is_required} onCheckedChange={v => setReqForm({ ...reqForm, is_required: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReqDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveReq} disabled={!reqForm.title.trim()}>Add Requirement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
};

export default SettingsPipelineDetail;
