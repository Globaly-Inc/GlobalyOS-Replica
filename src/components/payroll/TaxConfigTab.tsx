import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  useTaxSlabs, useCreateTaxSlab, useDeleteTaxSlab,
  useSocialSecurityRules, useCreateSocialSecurityRule,
  useStatutoryRules, useCreateStatutoryRule,
  useLegalEntities
} from "@/services/usePayroll";
import { Plus, Percent, Shield, Scale, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PayrollCountry, SocialSecurityRuleType, SocialSecurityBaseType, StatutoryRuleType } from "@/types/payroll";

export const TaxConfigTab = () => {
  const [subTab, setSubTab] = useState("tax");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tax & Statutory Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Configure tax slabs, social security, and statutory rules
        </p>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Tax Slabs
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Social Security
          </TabsTrigger>
          <TabsTrigger value="statutory" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Statutory Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tax" className="mt-4">
          <TaxSlabsSection />
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <SocialSecuritySection />
        </TabsContent>

        <TabsContent value="statutory" className="mt-4">
          <StatutoryRulesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const TaxSlabsSection = () => {
  const { currentOrg } = useOrganization();
  const { data: slabs, isLoading } = useTaxSlabs();
  const { data: entities } = useLegalEntities();
  const createSlab = useCreateTaxSlab();
  const deleteSlab = useDeleteTaxSlab();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    country: 'NP' as PayrollCountry,
    effective_from: format(new Date(), 'yyyy-MM-dd'),
    slab_min: 0,
    slab_max: 0,
    rate_percent: 0,
  });

  const handleOpenCreate = () => {
    const entity = entities?.[0];
    setFormData({
      country: entity?.country || 'NP',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
      slab_min: 0,
      slab_max: 0,
      rate_percent: 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.id) {
      toast.error("Organization not found");
      return;
    }
    try {
      await createSlab.mutateAsync({
        country: formData.country,
        organization_id: currentOrg.id,
        effective_from: formData.effective_from,
        slab_min: formData.slab_min,
        slab_max: formData.slab_max || undefined,
        rate_percent: formData.rate_percent,
      });
      toast.success("Tax slab created");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create tax slab");
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Tax Slab
        </Button>
      </div>

      {slabs?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Percent className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No tax slabs configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {slabs?.map((slab) => (
            <Card key={slab.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{slab.country}</Badge>
                  <span className="text-sm">
                    {slab.slab_min.toLocaleString()} - {slab.slab_max?.toLocaleString() || '∞'}
                  </span>
                  <Badge>{slab.rate_percent}%</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteSlab.mutate(slab.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tax Slab</DialogTitle>
            <DialogDescription>Configure income tax brackets</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value: PayrollCountry) => setFormData(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NP">Nepal</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Income</Label>
                <Input
                  type="number"
                  value={formData.slab_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, slab_min: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Income (0 = no limit)</Label>
                <Input
                  type="number"
                  value={formData.slab_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, slab_max: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.rate_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_percent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createSlab.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SocialSecuritySection = () => {
  const { currentOrg } = useOrganization();
  const { data: rules, isLoading } = useSocialSecurityRules();
  const { data: entities } = useLegalEntities();
  const createRule = useCreateSocialSecurityRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    country: 'NP' as PayrollCountry,
    rule_type: 'ssf' as SocialSecurityRuleType,
    effective_from: format(new Date(), 'yyyy-MM-dd'),
    employee_rate_percent: 0,
    employer_rate_percent: 0,
    base_type: 'basic_salary' as SocialSecurityBaseType,
  });

  const handleOpenCreate = () => {
    const entity = entities?.[0];
    setFormData({
      country: entity?.country || 'NP',
      rule_type: 'ssf',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
      employee_rate_percent: 0,
      employer_rate_percent: 0,
      base_type: 'basic_salary',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.id) {
      toast.error("Organization not found");
      return;
    }
    try {
      await createRule.mutateAsync({
        country: formData.country,
        organization_id: currentOrg.id,
        rule_type: formData.rule_type,
        effective_from: formData.effective_from,
        employee_rate_percent: formData.employee_rate_percent,
        employer_rate_percent: formData.employer_rate_percent,
        base_type: formData.base_type,
      });
      toast.success("Social security rule created");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create rule");
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {rules?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No social security rules configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rules?.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{rule.country}</Badge>
                  <span className="font-medium text-sm uppercase">{rule.rule_type}</span>
                  <span className="text-sm">
                    Employee: {rule.employee_rate_percent}% | Employer: {rule.employer_rate_percent}%
                  </span>
                  {rule.caps?.max_salary_ceiling && (
                    <span className="text-xs text-muted-foreground">
                      Cap: {rule.caps.max_salary_ceiling.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Social Security Rule</DialogTitle>
            <DialogDescription>Configure contribution rates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value: PayrollCountry) => setFormData(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NP">Nepal</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value: SocialSecurityRuleType) => setFormData(prev => ({ ...prev, rule_type: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssf">SSF (Nepal)</SelectItem>
                    <SelectItem value="pf">Provident Fund (India)</SelectItem>
                    <SelectItem value="esi">ESI (India)</SelectItem>
                    <SelectItem value="sg">Superannuation (Australia)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.employee_rate_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_rate_percent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Employer Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.employer_rate_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, employer_rate_percent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Base Type</Label>
              <Select
                value={formData.base_type}
                onValueChange={(value: SocialSecurityBaseType) => setFormData(prev => ({ ...prev, base_type: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic_salary">Basic Salary</SelectItem>
                  <SelectItem value="gross">Gross Salary</SelectItem>
                  <SelectItem value="ote">OTE (Australia)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createRule.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatutoryRulesSection = () => {
  const { currentOrg } = useOrganization();
  const { data: rules, isLoading } = useStatutoryRules();
  const { data: entities } = useLegalEntities();
  const createRule = useCreateStatutoryRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    country: 'NP' as PayrollCountry,
    rule_type: 'overtime' as StatutoryRuleType,
    effective_from: format(new Date(), 'yyyy-MM-dd'),
    overtime_multiplier: 1.5,
  });

  const handleOpenCreate = () => {
    const entity = entities?.[0];
    setFormData({
      country: entity?.country || 'NP',
      rule_type: 'overtime',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
      overtime_multiplier: 1.5,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.id) {
      toast.error("Organization not found");
      return;
    }
    try {
      await createRule.mutateAsync({
        country: formData.country,
        organization_id: currentOrg.id,
        rule_type: formData.rule_type,
        effective_from: formData.effective_from,
        config: {
          overtime_multiplier: formData.overtime_multiplier,
        },
      });
      toast.success("Statutory rule created");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create rule");
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {rules?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Scale className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No statutory rules configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rules?.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{rule.country}</Badge>
                  <span className="font-medium text-sm capitalize">{rule.rule_type.replace('_', ' ')}</span>
                  {rule.config?.overtime_multiplier && (
                    <span className="text-sm">Multiplier: {rule.config.overtime_multiplier}x</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Statutory Rule</DialogTitle>
            <DialogDescription>Configure overtime, minimum wage, etc.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value: PayrollCountry) => setFormData(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NP">Nepal</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value: StatutoryRuleType) => setFormData(prev => ({ ...prev, rule_type: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="min_wage">Minimum Wage</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="pt">Professional Tax</SelectItem>
                    <SelectItem value="gratuity">Gratuity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Overtime Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.overtime_multiplier}
                onChange={(e) => setFormData(prev => ({ ...prev, overtime_multiplier: parseFloat(e.target.value) || 1.5 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createRule.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
