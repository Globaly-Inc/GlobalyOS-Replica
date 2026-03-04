/**
 * PipelineCard – displays a single pipeline with its stages as expandable accordion rows.
 * Each stage row includes inline automation rules, rejection settings, notifications, and email trigger.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  APPLICATION_STAGE_COLORS,
  type ApplicationStage,
} from '@/types/hiring';
import {
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  GripVertical,
  ChevronDown,
  Zap,
  Clock,
  Bell,
  Mail,
  Save,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
} from '@/services/useHiringMutations';
import { PlaceholderDropdown } from '@/components/hiring/PlaceholderDropdown';
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

export interface StageRule {
  id?: string;
  stage_key: string;
  auto_reject_after_hours: number | null;
  auto_reject_on_deadline: boolean;
  notify_employee_ids: string[];
  email_trigger_type: string | null;
  is_active: boolean;
}

export interface Employee {
  id: string;
  full_name: string;
  email?: string;
  office_name?: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  body: string;
  is_active: boolean;
  stage_id?: string | null;
}


interface PipelineCardProps {
  pipeline: Pipeline;
  stageRules: Record<string, StageRule>;
  employees: Employee[];
  emailTemplates: EmailTemplate[];
  onRenamePipeline: (pipelineId: string, newName: string) => void;
  onDeletePipeline: (pipelineId: string) => void;
  onRenameStage: (stageId: string, newName: string) => void;
  onDeleteStage: (stageId: string) => void;
  onAddStage: (pipelineId: string, stageKey: string, name: string) => void;
  onReorderStages: (pipelineId: string, orderedStageIds: string[]) => void;
  onRuleChange: (stageKey: string, updates: Partial<StageRule>) => void;
  onSaveRules: () => void;
  isSavingRules: boolean;
  canDeletePipeline: boolean;
  canDeleteStage: (stageId: string) => boolean;
  onGenerateTemplates?: (pipeline: Pipeline) => void;
  isGeneratingTemplates?: boolean;
}

// ── Auto-resize hook ─────────────────────────────────────────
const MAX_BODY_HEIGHT = 480; // ~20 lines
const useAutoResize = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, MAX_BODY_HEIGHT);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > MAX_BODY_HEIGHT ? 'auto' : 'hidden';
  }, [value]);
  return ref;
};

// ── Email Template Dialog ─────────────────────────────────────

interface EmailTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  triggerType: string;
  stageId: string;
  existingTemplate?: { id: string; name: string; subject: string; body: string; is_active: boolean } | null;
  onSaved?: () => void;
}

interface TemplateFormValues {
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
}

function EmailTemplateDialog({ open, onClose, triggerType, stageId, existingTemplate, onSaved }: EmailTemplateDialogProps) {
  const isEdit = !!existingTemplate;
  const triggerLabel = 'Stage Entry Email';

  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TemplateFormValues>({
    defaultValues: {
      name: existingTemplate?.name ?? triggerLabel,
      subject: existingTemplate?.subject ?? '',
      body: existingTemplate?.body ?? '',
      is_active: existingTemplate?.is_active ?? true,
    },
  });

  const isActive = watch('is_active');
  const bodyValue = watch('body');
  const bodyRef = useAutoResize(bodyValue ?? '');
  const { ref: registerBodyRef, ...registerBodyProps } = register('body');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInsertPlaceholder = (key: string) => {
    const el = textareaRef.current;
    if (!el) {
      // fallback: append
      setValue('body', (bodyValue ?? '') + key);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = bodyValue ?? '';
    const next = current.slice(0, start) + key + current.slice(end);
    setValue('body', next);
    // restore cursor after inserted text
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + key.length, start + key.length);
    }, 0);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      onClose();
    } else {
      reset({
        name: existingTemplate?.name ?? triggerLabel,
        subject: existingTemplate?.subject ?? '',
        body: existingTemplate?.body ?? '',
        is_active: existingTemplate?.is_active ?? true,
      });
    }
  };

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      if (isEdit && existingTemplate) {
        await updateMutation.mutateAsync({ id: existingTemplate.id, input: values });
      } else {
        await createMutation.mutateAsync({
          ...values,
          template_type: triggerType,
          stage_id: stageId,
        });
      }
      onSaved?.();
      onClose();
    } catch {
      // error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Email Template' : 'Create Email Template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 overflow-y-auto">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. Application Received"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-subject"
              {...register('subject', { required: 'Subject is required' })}
              placeholder="Thank you for applying to {{job_title}}"
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">Email Body</Label>
            <Textarea
              id="tpl-body"
              {...registerBodyProps}
              ref={(el) => {
                registerBodyRef(el);
                (bodyRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                textareaRef.current = el;
              }}
              placeholder={`Dear {{candidate_name}},\n\nThank you for applying...`}
              style={{ minHeight: '360px', maxHeight: '800px', overflowY: 'hidden' }}
              className="resize-none font-mono text-sm"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <PlaceholderDropdown onInsert={handleInsertPlaceholder} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sortable Stage Accordion ──────────────────────────────────


interface SortableStageAccordionProps {
  stage: PipelineStage;
  idx: number;
  color: string;
  deletable: boolean;
  rule: StageRule | undefined;
  employees: Employee[];
  emailTemplates: EmailTemplate[];
  editingStageId: string | null;
  stageNameValue: string;
  setStageNameValue: (v: string) => void;
  onStartRename: (stage: PipelineStage) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteStage: (id: string) => void;
  onRuleChange: (stageKey: string, updates: Partial<StageRule>) => void;
}

function SortableStageAccordion({
  stage,
  idx,
  color,
  deletable,
  rule,
  employees,
  emailTemplates,
  editingStageId,
  stageNameValue,
  setStageNameValue,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDeleteStage,
  onRuleChange,
}: SortableStageAccordionProps) {
  const [open, setOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Notify on Entry toggle — preserve employee list in a ref when toggled off
  const [notifyEnabled, setNotifyEnabled] = useState(() => (rule?.notify_employee_ids?.length ?? 0) > 0);
  const preservedNotifyIds = useRef<string[]>(rule?.notify_employee_ids ?? []);
  const [notifySearch, setNotifySearch] = useState('');
  const [notifyDropdownOpen, setNotifyDropdownOpen] = useState(false);

  const handleNotifyToggle = (enabled: boolean) => {
    setNotifyEnabled(enabled);
    if (!enabled) {
      preservedNotifyIds.current = rule?.notify_employee_ids ?? [];
      onRuleChange(stageKey, { notify_employee_ids: [] });
    } else {
      onRuleChange(stageKey, { notify_employee_ids: preservedNotifyIds.current, is_active: true });
    }
  };

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

  const stageKey = stage.stage_key as ApplicationStage;

  // Per-stage: effectiveTrigger comes from the stage rule, not from a hardcoded map
  const effectiveTrigger = rule?.email_trigger_type ?? null;

  // Match template by stage_id
  const matchedTpl = emailTemplates.find(t => t.stage_id === stage.id) as
    | (EmailTemplate & { subject?: string; body?: string })
    | undefined;

  // Summary badges for collapsed view
  
  const notifyCount = rule?.notify_employee_ids?.length ?? 0;
  const hasEmail = !!effectiveTrigger && !!matchedTpl;
  

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border rounded-xl bg-card transition-shadow',
        isDragging && 'opacity-50 shadow-lg z-50',
        open && 'shadow-sm',
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 px-4 py-3 group">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors" />
          </div>

          {/* Color dot */}
          <div
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: color }}
          />

          {/* Stage number */}
          <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">{idx + 1}.</span>

          {/* Stage name / inline edit */}
          {editingStageId === stage.id ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={stageNameValue}
                onChange={e => setStageNameValue(e.target.value)}
                className="h-8 text-base flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') onCancelRename();
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onSaveRename}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancelRename}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-base font-semibold min-w-0 truncate">{stage.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={e => { e.stopPropagation(); onStartRename(stage); }}
              >
                <Pencil className="h-3 w-3" />
              </Button>

              <div className="flex-1" />

              {/* Activity badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {notifyCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 h-5">
                    <Bell className="h-2.5 w-2.5" /> {notifyCount} notified
                  </Badge>
                )}
                {hasEmail && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 h-5">
                    <Mail className="h-2.5 w-2.5" /> Email
                  </Badge>
                )}
              </div>

              {/* Hover actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      disabled={!deletable}
                      onClick={e => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
                      <AlertDialogAction
                        onClick={() => onDeleteStage(stage.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Expand trigger */}
              <CollapsibleTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform duration-200',
                      open && 'rotate-180',
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t">
            <div className="pt-4 grid grid-cols-1 gap-6">

              {/* ── Notifications ───────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-secondary text-secondary-foreground shrink-0">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold flex-1">Notify on Entry</span>
                  <Switch
                    checked={notifyEnabled}
                    onCheckedChange={handleNotifyToggle}
                  />
                </div>
                {notifyEnabled && (
                  <div className="pl-8 space-y-2">
                    {/* Searchable employee picker */}
                    {(() => {
                      const selectedIds = rule?.notify_employee_ids ?? [];
                      const availableEmployees = employees.filter(e => !selectedIds.includes(e.id));
                      const filtered = notifySearch.trim()
                        ? availableEmployees.filter(e =>
                            e.full_name.toLowerCase().includes(notifySearch.toLowerCase()) ||
                            (e.office_name ?? '').toLowerCase().includes(notifySearch.toLowerCase()),
                          )
                        : availableEmployees;

                      return (
                        <div className="relative">
                          <Input
                            value={notifySearch}
                            onChange={e => { setNotifySearch(e.target.value); setNotifyDropdownOpen(true); }}
                            onFocus={() => setNotifyDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setNotifyDropdownOpen(false), 150)}
                            placeholder="Search team member to notify…"
                            className="h-9 text-sm"
                          />
                          {notifyDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
                              <div className="max-h-52 overflow-y-auto">
                                {filtered.length === 0 ? (
                                  <p className="px-3 py-2 text-sm text-muted-foreground">No members found</p>
                                ) : (
                                  filtered.map(emp => (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                                      onMouseDown={e => {
                                        e.preventDefault();
                                        onRuleChange(stageKey, {
                                          notify_employee_ids: [...selectedIds, emp.id],
                                          is_active: true,
                                        });
                                        setNotifySearch('');
                                        setNotifyDropdownOpen(false);
                                      }}
                                    >
                                      <span className="font-medium">{emp.full_name}</span>
                                      {emp.office_name && (
                                        <span className="text-xs text-muted-foreground ml-2">{emp.office_name}</span>
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Selected chips */}
                    {(rule?.notify_employee_ids?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {rule!.notify_employee_ids.map(empId => {
                          const emp = employees.find(e => e.id === empId);
                          return (
                            <Badge
                              key={empId}
                              variant="secondary"
                              className="cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors pr-1"
                              onClick={() => onRuleChange(stageKey, {
                                notify_employee_ids: rule!.notify_employee_ids.filter(id => id !== empId),
                              })}
                            >
                              <span>{emp?.full_name ?? empId.slice(0, 8)}</span>
                              {emp?.office_name && (
                                <span className="ml-1 text-muted-foreground font-normal">· {emp.office_name}</span>
                              )}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      These team members will be notified when a candidate enters this stage.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Email Trigger ────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent text-accent-foreground shrink-0">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold flex-1">Email Trigger</span>
                  {/* Toggle always visible — ON sets stage_entry, OFF clears it */}
                  <Switch
                    checked={!!effectiveTrigger}
                    onCheckedChange={enabled => {
                      if (enabled) {
                        onRuleChange(stageKey, { email_trigger_type: 'stage_entry', is_active: true });
                        if (!matchedTpl) setTemplateDialogOpen(true);
                      } else {
                        onRuleChange(stageKey, { email_trigger_type: null });
                      }
                    }}
                  />
                </div>

                <div className="pl-8 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Automatically send an email when a candidate enters this stage.
                  </p>

                  {effectiveTrigger && (
                    matchedTpl ? (
                      /* ── Template exists ── */
                      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            matchedTpl.is_active ? 'bg-primary' : 'bg-muted-foreground/40',
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{matchedTpl.name}</p>
                            {matchedTpl.subject && (
                              <p className="text-xs text-muted-foreground truncate">
                                Subject: {matchedTpl.subject}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {matchedTpl.is_active ? 'Active — will send automatically' : 'Inactive — will not send'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 shrink-0 ml-2"
                          onClick={() => setTemplateDialogOpen(true)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    ) : (
                      /* ── No template yet ── */
                      <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/20 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">No template configured</p>
                            <p className="text-xs text-muted-foreground">Create a template to send emails</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="h-7 gap-1.5 shrink-0 ml-2"
                          onClick={() => setTemplateDialogOpen(true)}
                        >
                          <Plus className="h-3 w-3" />
                          Create
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>

            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Email Template Dialog — always rendered, visibility controlled by open state */}
      <EmailTemplateDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        triggerType="stage_entry"
        stageId={stage.id}
        existingTemplate={
          matchedTpl
            ? { id: matchedTpl.id, name: matchedTpl.name, subject: matchedTpl.subject ?? '', body: matchedTpl.body ?? '', is_active: matchedTpl.is_active }
            : null
        }
      />
    </div>
  );
}

// ── Main PipelineCard ─────────────────────────────────────────

export function PipelineCard({
  pipeline,
  stageRules,
  employees,
  emailTemplates,
  onRenamePipeline,
  onDeletePipeline,
  onRenameStage,
  onDeleteStage,
  onAddStage,
  onReorderStages,
  onRuleChange,
  onSaveRules,
  isSavingRules,
  canDeletePipeline,
  canDeleteStage,
  onGenerateTemplates,
  isGeneratingTemplates = false,
}: PipelineCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(pipeline.name);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageNameValue, setStageNameValue] = useState('');
  const [addingStage, setAddingStage] = useState(false);
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

  const usedStageKeys = new Set(activeStages.map(s => s.stage_key));

  const handleAddStage = () => {
    const trimmedName = newStageName.trim();
    if (!trimmedName) return;
    const generatedKey = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const uniqueKey = usedStageKeys.has(generatedKey as ApplicationStage)
      ? `${generatedKey}_${Date.now()}`
      : generatedKey;
    onAddStage(pipeline.id, uniqueKey, trimmedName);
    setNewStageName('');
    setAddingStage(false);
  };

  // Count active automations for this pipeline
  const activeAutomationCount = activeStages.filter(s => {
    const rule = stageRules[s.stage_key];
    return (rule?.notify_employee_ids?.length ?? 0) > 0 || rule?.email_trigger_type;
  }).length;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
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
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSavePipelineName}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingName(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-semibold text-base truncate">{pipeline.name}</span>
              {pipeline.is_default && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Default</Badge>
              )}
              {activeAutomationCount > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  {activeAutomationCount} stage{activeAutomationCount !== 1 ? 's' : ''} with rules
                </Badge>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => { setNameValue(pipeline.name); setEditingName(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onGenerateTemplates && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => onGenerateTemplates(pipeline)}
              disabled={isGeneratingTemplates}
            >
              {isGeneratingTemplates
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />}
              Generate Templates
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={onSaveRules}
            disabled={isSavingRules}
          >
            {isSavingRules
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />}
            Save Rules
          </Button>

          {!pipeline.is_default && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={!canDeletePipeline}
                >
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
                  <AlertDialogAction
                    onClick={() => onDeletePipeline(pipeline.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={activeStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {activeStages.map((stage, idx) => {
                const color = APPLICATION_STAGE_COLORS[stage.stage_key as ApplicationStage] || stage.color || '#94A3B8';
                return (
                  <SortableStageAccordion
                    key={stage.id}
                    stage={stage}
                    idx={idx}
                    color={color}
                    deletable={canDeleteStage(stage.id)}
                    rule={stageRules[stage.stage_key]}
                    employees={employees}
                    emailTemplates={emailTemplates}
                    editingStageId={editingStageId}
                    stageNameValue={stageNameValue}
                    setStageNameValue={setStageNameValue}
                    onStartRename={handleStartStageRename}
                    onSaveRename={handleSaveStageRename}
                    onCancelRename={() => setEditingStageId(null)}
                    onDeleteStage={onDeleteStage}
                    onRuleChange={onRuleChange}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add stage */}
        {addingStage ? (
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="Stage name"
              className="h-8 text-sm flex-1"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddStage();
                if (e.key === 'Escape') setAddingStage(false);
              }}
            />
            <Button
              size="sm"
              variant="default"
              className="h-8"
              onClick={handleAddStage}
              disabled={!newStageName.trim()}
            >
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingStage(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setAddingStage(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Stage
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
