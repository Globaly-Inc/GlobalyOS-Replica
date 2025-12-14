import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Sparkles } from 'lucide-react';
import { FeatureLimitsEditor } from './FeatureLimitsEditor';
import { FeatureHighlightsEditor } from './FeatureHighlightsEditor';
import type { SubscriptionPlan, PlanLimit } from './PlanManagement';

interface PlanEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  planLimits: PlanLimit[];
}

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'INR', label: 'INR (₹)' },
];

export function PlanEditorDialog({ open, onOpenChange, plan, planLimits }: PlanEditorDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!plan;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    tagline: '',
    monthly_price: 0,
    annual_price: 0,
    currency: 'USD',
    trial_days: 7,
    is_active: true,
    is_public: true,
    is_popular: false,
    sort_order: 0,
    feature_highlights: [] as string[],
    stripe_monthly_price_id: '',
    stripe_annual_price_id: '',
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        slug: plan.slug,
        description: plan.description || '',
        tagline: plan.tagline || '',
        monthly_price: plan.monthly_price,
        annual_price: plan.annual_price,
        currency: plan.currency,
        trial_days: plan.trial_days,
        is_active: plan.is_active,
        is_public: plan.is_public,
        is_popular: plan.is_popular,
        sort_order: plan.sort_order,
        feature_highlights: plan.feature_highlights || [],
        stripe_monthly_price_id: plan.stripe_monthly_price_id || '',
        stripe_annual_price_id: plan.stripe_annual_price_id || '',
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        tagline: '',
        monthly_price: 0,
        annual_price: 0,
        currency: 'USD',
        trial_days: 7,
        is_active: true,
        is_public: true,
        is_popular: false,
        sort_order: 0,
        feature_highlights: [],
        stripe_monthly_price_id: '',
        stripe_annual_price_id: '',
      });
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        stripe_monthly_price_id: data.stripe_monthly_price_id || null,
        stripe_annual_price_id: data.stripe_annual_price_id || null,
      };

      if (isEditing && plan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(payload)
          .eq('id', plan.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(payload);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success(isEditing ? 'Plan updated successfully' : 'Plan created successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save plan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    
    if (!formData.slug.trim()) {
      toast.error('Plan slug is required');
      return;
    }

    saveMutation.mutate(formData);
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const calculateAnnualDiscount = () => {
    const annualWithDiscount = Math.round(formData.monthly_price * 12 * 0.8);
    setFormData(prev => ({ ...prev, annual_price: annualWithDiscount }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Plan: ${plan.name}` : 'Create New Plan'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Growth"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g., growth"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={generateSlug}>
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g., Most popular choice"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this plan offers..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="is_public" className="cursor-pointer">Public</Label>
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="is_popular" className="cursor-pointer">Popular Badge</Label>
                  <Switch
                    id="is_popular"
                    checked={formData.is_popular}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Display Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_price">Monthly Price</Label>
                  <Input
                    id="monthly_price"
                    type="number"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_price: parseFloat(e.target.value) || 0 }))}
                    min={0}
                    step={0.01}
                  />
                  <p className="text-xs text-muted-foreground">Set to 0 for custom/enterprise pricing</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annual_price">Annual Price</Label>
                  <div className="flex gap-2">
                    <Input
                      id="annual_price"
                      type="number"
                      value={formData.annual_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, annual_price: parseFloat(e.target.value) || 0 }))}
                      min={0}
                      step={0.01}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={calculateAnnualDiscount}
                      title="Calculate 20% annual discount"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.monthly_price > 0 && formData.annual_price > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round((1 - formData.annual_price / (formData.monthly_price * 12)) * 100)}% discount from monthly
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trial_days">Trial Period (days)</Label>
                <Input
                  id="trial_days"
                  type="number"
                  value={formData.trial_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4">Stripe Integration (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripe_monthly_price_id">Stripe Monthly Price ID</Label>
                    <Input
                      id="stripe_monthly_price_id"
                      value={formData.stripe_monthly_price_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, stripe_monthly_price_id: e.target.value }))}
                      placeholder="price_..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripe_annual_price_id">Stripe Annual Price ID</Label>
                    <Input
                      id="stripe_annual_price_id"
                      value={formData.stripe_annual_price_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, stripe_annual_price_id: e.target.value }))}
                      placeholder="price_..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 mt-4">
              <FeatureHighlightsEditor
                highlights={formData.feature_highlights}
                onChange={(highlights) => setFormData(prev => ({ ...prev, feature_highlights: highlights }))}
              />
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 mt-4">
              <FeatureLimitsEditor
                planSlug={formData.slug}
                limits={planLimits}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
