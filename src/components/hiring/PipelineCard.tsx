/**
 * PipelineCard – displays a single pipeline with its stages,
 * inline rename, add/delete stage, delete pipeline, and drag-and-drop reordering.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGE_COLORS,
  type ApplicationStage,
} from '@/types/hiring';
import { Pencil, Trash2, Plus, Check, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

export interface PipelineStage {
  id: string;
  stage_key: string;
  name: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  sort_order: number;
  stages: PipelineStage[];
}

const ALL_STAGE_KEYS: ApplicationStage[] = [
  'applied', 'screening', 'assignment',
  'interview_1', 'interview_2', 'interview_3',
  'offer', 'hired',
];

interface PipelineCardProps {
  pipeline: Pipeline;
  onRenamePipeline: (pipelineId: string, newName: string) => void;
  onDeletePipeline: (pipelineId: string) => void;
  onRenameStage: (stageId: string, newName: string) => void;
  onDeleteStage: (stageId: string) => void;
  onAddStage: (pipelineId: string, stageKey: string, name: string) => void;
  onReorderStages: (pipelineId: string, orderedStageIds: string[]) => void;
  canDeletePipeline: boolean;
  canDeleteStage: (stageId: string) => boolean;
}

// ── Sortable stage row ────────────────────────────────────────

function SortableStageRow({
  stage,
  idx,
  color,
  deletable,
  editingStageId,
  stageNameValue,
  setStageNameValue,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDeleteStage,
}: {
  stage: PipelineStage;
  idx: number;
  color: string;
  deletable: boolean;
  editingStageId: string | null;
  stageNameValue: string;
  setStageNameValue: (v: string) => void;
  onStartRename: (stage: PipelineStage) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteStage: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 group',
        isDragging && 'opacity-50 z-50 bg-background shadow-lg rounded-md',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>

      {editingStageId === stage.id ? (
        <div className="flex items-center gap-1.5 flex-1">
          <Input
            value={stageNameValue}
            onChange={e => setStageNameValue(e.target.value)}
            className="h-7 text-sm flex-1"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') onSaveRename();
              if (e.key === 'Escape') onCancelRename();
            }}
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onSaveRename}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelRename}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className="text-sm flex-1">{stage.name}</span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onStartRename(stage)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" disabled={!deletable}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete stage?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove "{stage.name}" from this pipeline. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteStage(stage.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main PipelineCard ─────────────────────────────────────────

export function PipelineCard({
  pipeline,
  onRenamePipeline,
  onDeletePipeline,
  onRenameStage,
  onDeleteStage,
  onAddStage,
  onReorderStages,
  canDeletePipeline,
  canDeleteStage,
}: PipelineCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(pipeline.name);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageNameValue, setStageNameValue] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [newStageKey, setNewStageKey] = useState('');
  const [newStageName, setNewStageName] = useState('');

  const activeStages = pipeline.stages.filter(s => s.is_active).sort((a, b) => a.sort_order - b.sort_order);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeStages.findIndex(s => s.id === active.id);
    const newIndex = activeStages.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activeStages, oldIndex, newIndex);
    onReorderStages(pipeline.id, reordered.map(s => s.id));
  };

  const handleSavePipelineName = () => {
    if (nameValue.trim() && nameValue.trim() !== pipeline.name) {
      onRenamePipeline(pipeline.id, nameValue.trim());
    }
    setEditingName(false);
  };

  const handleStartStageRename = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setStageNameValue(stage.name);
  };

  const handleSaveStageRename = () => {
    if (editingStageId && stageNameValue.trim()) {
      onRenameStage(editingStageId, stageNameValue.trim());
    }
    setEditingStageId(null);
  };

  const handleAddStage = () => {
    if (newStageKey && newStageName.trim()) {
      onAddStage(pipeline.id, newStageKey, newStageName.trim());
      setNewStageKey('');
      setNewStageName('');
      setAddingStage(false);
    }
  };

  const usedStageKeys = new Set(activeStages.map(s => s.stage_key));

  return (
    <Card className="border">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <div className="flex items-center gap-2 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                className="h-8 text-sm font-semibold"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSavePipelineName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSavePipelineName}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingName(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-semibold text-sm">{pipeline.name}</span>
              {pipeline.is_default && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 ml-1" onClick={() => { setNameValue(pipeline.name); setEditingName(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {!pipeline.is_default && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" disabled={!canDeletePipeline}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete pipeline?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{pipeline.name}" and all its stages. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeletePipeline(pipeline.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={activeStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {activeStages.map((stage, idx) => {
                const color = APPLICATION_STAGE_COLORS[stage.stage_key as ApplicationStage] || stage.color || '#94A3B8';
                return (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    idx={idx}
                    color={color}
                    deletable={canDeleteStage(stage.id)}
                    editingStageId={editingStageId}
                    stageNameValue={stageNameValue}
                    setStageNameValue={setStageNameValue}
                    onStartRename={handleStartStageRename}
                    onSaveRename={handleSaveStageRename}
                    onCancelRename={() => setEditingStageId(null)}
                    onDeleteStage={onDeleteStage}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add stage */}
        {addingStage ? (
          <div className="mt-3 flex items-center gap-2">
            <Select value={newStageKey} onValueChange={v => { setNewStageKey(v); setNewStageName(APPLICATION_STAGE_LABELS[v as ApplicationStage] || v); }}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="Stage type" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STAGE_KEYS.filter(k => !usedStageKeys.has(k)).map(k => (
                  <SelectItem key={k} value={k}>{APPLICATION_STAGE_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="Display name"
              className="h-8 text-sm flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleAddStage(); if (e.key === 'Escape') setAddingStage(false); }}
            />
            <Button size="sm" variant="default" className="h-8" onClick={handleAddStage} disabled={!newStageKey || !newStageName.trim()}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingStage(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setAddingStage(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add Stage
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
