import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Star, Eye, EyeOff, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { PlanEditorDialog } from './PlanEditorDialog';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  monthly_price: number;
  annual_price: number;
  currency: string;
  trial_days: number;
  is_active: boolean;
  is_public: boolean;
  is_popular: boolean;
  sort_order: number;
  feature_highlights: string[];
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanLimit {
  id: string;
  plan: string;
  feature: string;
  feature_name: string | null;
  feature_description: string | null;
  monthly_limit: number | null;
  overage_rate: number | null;
  unit: string | null;
  sort_order: number | null;
  is_active: boolean;
}

export function PlanManagement() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const { data: planLimits } = useQuery({
    queryKey: ['plan-limits-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_limits')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as PlanLimit[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan status updated');
    },
    onError: () => {
      toast.error('Failed to update plan status');
    },
  });

  const togglePublicMutation = useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_public })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan visibility updated');
    },
    onError: () => {
      toast.error('Failed to update plan visibility');
    },
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Subscription Plans</CardTitle>
          <Button onClick={handleAddPlan} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Annual</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Public</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((plan) => {
                const limits = planLimits?.filter(l => l.plan === plan.slug) || [];
                
                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {plan.name}
                            {plan.is_popular && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Popular
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{plan.tagline}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.monthly_price > 0 ? (
                        <span className="font-medium">{formatCurrency(plan.monthly_price, plan.currency)}/mo</span>
                      ) : (
                        <span className="text-muted-foreground">Custom</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.annual_price > 0 ? (
                        <div>
                          <span className="font-medium">{formatCurrency(plan.annual_price, plan.currency)}/yr</span>
                          {plan.monthly_price > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {Math.round((1 - plan.annual_price / (plan.monthly_price * 12)) * 100)}% off
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Custom</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{plan.trial_days} days</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {limits.length > 0 ? (
                          <span>{limits.length} limits configured</span>
                        ) : (
                          <span>No limits</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: plan.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => 
                          togglePublicMutation.mutate({ id: plan.id, is_public: !plan.is_public })
                        }
                      >
                        {plan.is_public ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPlan(plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlanEditorDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        plan={editingPlan}
        planLimits={planLimits?.filter(l => editingPlan ? l.plan === editingPlan.slug : false) || []}
      />
    </>
  );
}
