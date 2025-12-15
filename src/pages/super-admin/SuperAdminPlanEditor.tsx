import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Calculator, Sparkles, Save, Loader2 } from 'lucide-react';
import { FeatureLimitsEditor } from '@/components/super-admin/FeatureLimitsEditor';
import { FeatureHighlightsEditor } from '@/components/super-admin/FeatureHighlightsEditor';
import type { SubscriptionPlan, PlanLimit } from '@/components/super-admin/PlanManagement';

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'INR', label: 'INR (₹)' },
];

const SuperAdminPlanEditor = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!planId;

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

  // Fetch plan data when editing
  const { data: plan, isLoading: isPlanLoading } = useQuery({
    queryKey: ['subscription-plan', planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (error) throw error;
      return data as SubscriptionPlan;
    },
    enabled: isEditing,
  });

  // Fetch plan limits
  const { data: planLimits, isLoading: isLimitsLoading } = useQuery({
    queryKey: ['plan-limits', plan?.slug],
    queryFn: async () => {
      if (!plan?.slug) return [];
      const { data, error } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan', plan.slug)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as PlanLimit[];
    },
    enabled: !!plan?.slug,
  });

  // Populate form when plan data loads
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
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        stripe_monthly_price_id: data.stripe_monthly_price_id || null,
        stripe_annual_price_id: data.stripe_annual_price_id || null,
      };

      if (isEditing && planId) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(payload)
          .eq('id', planId);
        
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
      navigate('/super-admin/payments');
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

  if (isEditing && isPlanLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <form onSubmit={handleSubmit}>
        {/* Header with back button and save */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/super-admin/payments')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plans
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold">
              {isEditing ? `Edit Plan: ${plan?.name || ''}` : 'New Plan'}
            </h1>
          </div>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Plan' : 'Create Plan'}
              </>
            )}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="grid grid-cols-4 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
                  <p className="text-xs text-muted-foreground">Set to 0 for custom pricing</p>
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
                  className="w-32"
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
            </CardContent>
          </Card>

          {/* Feature Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <FeatureHighlightsEditor
                highlights={formData.feature_highlights}
                onChange={(highlights) => setFormData(prev => ({ ...prev, feature_highlights: highlights }))}
              />
            </CardContent>
          </Card>

          {/* Feature Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <FeatureLimitsEditor
                planSlug={formData.slug}
                limits={planLimits || []}
                isLoading={isLimitsLoading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-background border-t py-4 mt-6 -mx-4 px-4">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/super-admin/payments')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Plan' : 'Create Plan'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </SuperAdminLayout>
  );
};

export default SuperAdminPlanEditor;
