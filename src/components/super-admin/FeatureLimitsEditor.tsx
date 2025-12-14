import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PlanLimit } from './PlanManagement';

interface FeatureLimitsEditorProps {
  planSlug: string;
  limits: PlanLimit[];
}

const DEFAULT_FEATURES = [
  { feature: 'storage_gb', feature_name: 'Storage', unit: 'GB', sort_order: 1 },
  { feature: 'ai_queries', feature_name: 'AI Queries', unit: 'queries', sort_order: 2 },
  { feature: 'team_members', feature_name: 'Team Members', unit: 'count', sort_order: 3 },
  { feature: 'performance_reviews', feature_name: 'Performance Reviews', unit: 'count', sort_order: 4 },
  { feature: 'wiki_pages', feature_name: 'Wiki Pages', unit: 'count', sort_order: 5 },
  { feature: 'chat_spaces', feature_name: 'Chat Spaces', unit: 'count', sort_order: 6 },
];

interface EditableLimit {
  id?: string;
  feature: string;
  feature_name: string;
  monthly_limit: number | null;
  overage_rate: number | null;
  unit: string;
  is_active: boolean;
  isNew?: boolean;
}

export function FeatureLimitsEditor({ planSlug, limits }: FeatureLimitsEditorProps) {
  const queryClient = useQueryClient();
  const [editableLimits, setEditableLimits] = useState<EditableLimit[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize editable limits from props or defaults
  useState(() => {
    if (limits.length > 0) {
      setEditableLimits(limits.map(l => ({
        id: l.id,
        feature: l.feature,
        feature_name: l.feature_name || l.feature,
        monthly_limit: l.monthly_limit,
        overage_rate: l.overage_rate,
        unit: l.unit || 'count',
        is_active: l.is_active,
      })));
    } else if (planSlug) {
      // Initialize with default features for new plans
      setEditableLimits(DEFAULT_FEATURES.map(f => ({
        feature: f.feature,
        feature_name: f.feature_name,
        monthly_limit: null,
        overage_rate: null,
        unit: f.unit,
        is_active: true,
        isNew: true,
      })));
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!planSlug) {
        throw new Error('Plan slug is required');
      }

      // Delete existing limits for this plan
      const { error: deleteError } = await supabase
        .from('plan_limits')
        .delete()
        .eq('plan', planSlug);

      if (deleteError) throw deleteError;

      // Insert updated limits
      const limitsToInsert = editableLimits
        .filter(l => l.is_active)
        .map(l => ({
          plan: planSlug,
          feature: l.feature,
          feature_name: l.feature_name,
          monthly_limit: l.monthly_limit,
          overage_rate: l.overage_rate,
          unit: l.unit,
          is_active: true,
        }));

      if (limitsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('plan_limits')
          .insert(limitsToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-limits-all'] });
      setHasChanges(false);
      toast.success('Feature limits saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save feature limits');
    },
  });

  const updateLimit = (index: number, field: keyof EditableLimit, value: any) => {
    setEditableLimits(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const addNewLimit = () => {
    setEditableLimits(prev => [
      ...prev,
      {
        feature: '',
        feature_name: '',
        monthly_limit: null,
        overage_rate: null,
        unit: 'count',
        is_active: true,
        isNew: true,
      },
    ]);
    setHasChanges(true);
  };

  const removeLimit = (index: number) => {
    setEditableLimits(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  if (!planSlug) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Save the plan first to configure feature limits</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Feature Limits</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Configure usage limits and overage rates for this plan. Set limit to -1 for unlimited.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addNewLimit}>
            <Plus className="h-4 w-4 mr-2" />
            Add Limit
          </Button>
          {hasChanges && (
            <Button 
              type="button" 
              size="sm" 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Limits'}
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Limit</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Overage Rate</TableHead>
            <TableHead>Active</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {editableLimits.map((limit, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input
                  value={limit.feature}
                  onChange={(e) => updateLimit(index, 'feature', e.target.value)}
                  placeholder="feature_key"
                  className="w-32"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={limit.feature_name}
                  onChange={(e) => updateLimit(index, 'feature_name', e.target.value)}
                  placeholder="Feature Name"
                  className="w-40"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={limit.monthly_limit ?? ''}
                  onChange={(e) => updateLimit(index, 'monthly_limit', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Unlimited"
                  className="w-24"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={limit.unit}
                  onChange={(e) => updateLimit(index, 'unit', e.target.value)}
                  placeholder="count"
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={limit.overage_rate ?? ''}
                  onChange={(e) => updateLimit(index, 'overage_rate', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="N/A"
                  className="w-24"
                  step={0.01}
                />
              </TableCell>
              <TableCell>
                <Switch
                  checked={limit.is_active}
                  onCheckedChange={(checked) => updateLimit(index, 'is_active', checked)}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLimit(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {editableLimits.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No feature limits configured. Click "Add Limit" to add one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Set <strong>monthly_limit</strong> to <code>-1</code> or leave empty for unlimited</li>
          <li>• <strong>Overage rate</strong> is the cost per unit above the limit</li>
          <li>• Common features: <code>storage_gb</code>, <code>ai_queries</code>, <code>team_members</code></li>
        </ul>
      </div>
    </div>
  );
}
