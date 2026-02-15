/**
 * Pipeline Settings Section
 * Configure per-stage automation: auto-assignments, auto-reject rules, notifications
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Zap, Clock, Bell, Loader2 } from 'lucide-react';

const PIPELINE_STAGES: ApplicationStage[] = [
  'applied',
  'screening',
  'assignment',
  'interview_1',
  'interview_2',
  'interview_3',
  'offer',
  'hired',
];

interface StageRule {
  id?: string;
  stage_key: string;
  auto_assignment_template_id: string | null;
  auto_reject_after_hours: number | null;
  auto_reject_on_deadline: boolean;
  notify_employee_ids: string[];
  is_active: boolean;
}

function usePipelineStageRules(orgId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-stage-rules', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('pipeline_stage_rules')
        .select('*')
        .eq('organization_id', orgId)
        .is('job_id', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

function useOrgEmployees(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-employees-list', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('employee_directory')
        .select('id, full_name, email')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

export function PipelineSettingsSection() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const { data: existingRules, isLoading: rulesLoading } = usePipelineStageRules(orgId);
  const { data: employees } = useOrgEmployees(orgId);

  const [stageRules, setStageRules] = useState<Record<string, StageRule>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialize state from DB
  useEffect(() => {
    if (rulesLoading || initialized) return;
    const rules: Record<string, StageRule> = {};
    for (const stage of PIPELINE_STAGES) {
      const existing = existingRules?.find((r: any) => r.stage_key === stage);
      rules[stage] = existing
        ? {
            id: existing.id,
            stage_key: stage,
            auto_assignment_template_id: existing.auto_assignment_template_id,
            auto_reject_after_hours: existing.auto_reject_after_hours,
            auto_reject_on_deadline: existing.auto_reject_on_deadline,
            notify_employee_ids: existing.notify_employee_ids || [],
            is_active: existing.is_active,
          }
        : {
            stage_key: stage,
            auto_assignment_template_id: null,
            auto_reject_after_hours: null,
            auto_reject_on_deadline: false,
            notify_employee_ids: [],
            is_active: false,
          };
    }
    setStageRules(rules);
    setInitialized(true);
  }, [existingRules, rulesLoading, initialized]);

  const updateRule = (stage: string, updates: Partial<StageRule>) => {
    setStageRules(prev => ({
      ...prev,
      [stage]: { ...prev[stage], ...updates },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No org');
      const upserts = Object.values(stageRules)
        .filter(r => r.is_active || r.id) // save active rules or update existing
        .map(r => ({
          ...(r.id ? { id: r.id } : {}),
          organization_id: orgId,
          job_id: null,
          stage_key: r.stage_key,
          auto_assignment_template_id: r.auto_assignment_template_id || null,
          auto_reject_after_hours: r.auto_reject_after_hours || null,
          auto_reject_on_deadline: r.auto_reject_on_deadline,
          notify_employee_ids: r.notify_employee_ids,
          is_active: r.is_active,
        }));

      if (upserts.length === 0) return;

      const { error } = await supabase
        .from('pipeline_stage_rules')
        .upsert(upserts as any, { onConflict: 'organization_id,job_id,stage_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pipeline settings saved');
      queryClient.invalidateQueries({ queryKey: ['pipeline-stage-rules'] });
    },
    onError: () => {
      toast.error('Failed to save pipeline settings');
    },
  });

  if (rulesLoading || !initialized) {
    return <Skeleton className="h-96" />;
  }

  const activeCount = Object.values(stageRules).filter(r => r.is_active).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pipeline Stage Rules</CardTitle>
          <CardDescription>
            Configure automation for each hiring stage — auto-assignments, rejection rules, and notifications
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="secondary">{activeCount} active</Badge>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {PIPELINE_STAGES.map((stage) => {
            const rule = stageRules[stage];
            if (!rule) return null;
            const color = APPLICATION_STAGE_COLORS[stage];

            return (
              <AccordionItem
                key={stage}
                value={stage}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className="w-1 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-sm">
                      {APPLICATION_STAGE_LABELS[stage]}
                    </span>
                    {rule.is_active && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 ml-auto mr-4">
                        Active
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-5 pt-2">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Enable automation for this stage</Label>
                      </div>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => updateRule(stage, { is_active: checked })}
                      />
                    </div>

                    {rule.is_active && (
                      <>
                        {/* Auto-Reject Rules */}
                        <div className="space-y-3 pl-6 border-l-2 border-muted ml-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <Label className="text-sm">Auto-Reject Rules</Label>
                          </div>

                          <div className="flex items-center gap-3">
                            <Switch
                              checked={rule.auto_reject_on_deadline}
                              onCheckedChange={(checked) =>
                                updateRule(stage, { auto_reject_on_deadline: checked })
                              }
                            />
                            <Label className="text-sm text-muted-foreground">
                              Auto-reject when assignment deadline passes
                            </Label>
                          </div>

                          <div className="flex items-center gap-3">
                            <Label className="text-sm text-muted-foreground whitespace-nowrap">
                              Auto-reject after
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              className="w-20"
                              placeholder="—"
                              value={rule.auto_reject_after_hours ?? ''}
                              onChange={(e) =>
                                updateRule(stage, {
                                  auto_reject_after_hours: e.target.value
                                    ? parseInt(e.target.value)
                                    : null,
                                })
                              }
                            />
                            <Label className="text-sm text-muted-foreground">
                              hours in this stage
                            </Label>
                          </div>
                        </div>

                        {/* Notifications */}
                        <div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
                          <div className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                            <Label className="text-sm">Stage Notifications</Label>
                          </div>
                          <Select
                            value="placeholder"
                            onValueChange={(empId) => {
                              if (empId === 'placeholder') return;
                              if (!rule.notify_employee_ids.includes(empId)) {
                                updateRule(stage, {
                                  notify_employee_ids: [...rule.notify_employee_ids, empId],
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Add team member to notify..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="placeholder" disabled>
                                Select a team member...
                              </SelectItem>
                              {employees
                                ?.filter((e: any) => !rule.notify_employee_ids.includes(e.id))
                                .map((e: any) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {e.full_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {rule.notify_employee_ids.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {rule.notify_employee_ids.map((empId) => {
                                const emp = employees?.find((e: any) => e.id === empId);
                                return (
                                  <Badge
                                    key={empId}
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-destructive/20 transition-colors"
                                    onClick={() =>
                                      updateRule(stage, {
                                        notify_employee_ids: rule.notify_employee_ids.filter(
                                          (id) => id !== empId
                                        ),
                                      })
                                    }
                                  >
                                    {emp
                                      ? emp.full_name
                                      : empId.slice(0, 8)}
                                    <span className="ml-1 text-muted-foreground">×</span>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            These team members will be notified when a candidate enters this stage. Click a name to remove.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
