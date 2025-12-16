import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { useLegalEntities, usePayrollProfiles, useCreatePayrollProfile, useUpdatePayrollProfile } from "@/services/usePayroll";
import { Plus, Settings, Pencil, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PayrollProfile, PayFrequency, CreatePayrollProfileInput, PayrollCountry } from "@/types/payroll";

const PAY_FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

const CURRENCIES = [
  { value: 'NPR', label: 'NPR - Nepali Rupee' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'USD', label: 'USD - US Dollar' },
];

export const PayrollProfilesTab = () => {
  const { currentOrg } = useOrganization();
  const { data: profiles, isLoading } = usePayrollProfiles();
  const { data: entities } = useLegalEntities();
  const createProfile = useCreatePayrollProfile();
  const updateProfile = useUpdatePayrollProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PayrollProfile | null>(null);
  const [formData, setFormData] = useState<Partial<CreatePayrollProfileInput>>({
    name: '',
    legal_entity_id: '',
    country: 'NP',
    currency: 'NPR',
    pay_frequency: 'monthly',
    standard_hours_per_week: 40,
    timezone: 'Asia/Kathmandu',
    effective_from: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleOpenCreate = () => {
    if (!entities?.length) {
      toast.error("Please create a legal entity first");
      return;
    }
    const entity = entities[0];
    setEditingProfile(null);
    setFormData({
      name: '',
      legal_entity_id: entity.id,
      country: entity.country,
      currency: entity.country === 'NP' ? 'NPR' : entity.country === 'IN' ? 'INR' : 'AUD',
      pay_frequency: 'monthly',
      standard_hours_per_week: 40,
      timezone: 'Asia/Kathmandu',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (profile: PayrollProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      legal_entity_id: profile.legal_entity_id,
      country: profile.country,
      currency: profile.currency,
      pay_frequency: profile.pay_frequency,
      standard_hours_per_week: profile.standard_hours_per_week,
      timezone: profile.timezone,
      effective_from: profile.effective_from,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.id || !formData.name || !formData.legal_entity_id) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      if (editingProfile) {
        await updateProfile.mutateAsync({
          id: editingProfile.id,
          name: formData.name,
          currency: formData.currency,
          pay_frequency: formData.pay_frequency,
          standard_hours_per_week: formData.standard_hours_per_week,
          timezone: formData.timezone,
        });
        toast.success("Payroll profile updated");
      } else {
        await createProfile.mutateAsync({
          ...formData as CreatePayrollProfileInput,
          organization_id: currentOrg.id,
        });
        toast.success("Payroll profile created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save payroll profile");
    }
  };

  const getEntityName = (entityId: string) => {
    return entities?.find(e => e.id === entityId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Payroll Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Configure pay schedules and currency settings
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Profile
        </Button>
      </div>

      {profiles?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Payroll Profiles</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Create a payroll profile to configure pay schedules
            </p>
            <Button onClick={handleOpenCreate} disabled={!entities?.length}>
              <Plus className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles?.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {getEntityName(profile.legal_entity_id)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{profile.currency}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="capitalize">{profile.pay_frequency}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{profile.standard_hours_per_week}h/week</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(profile)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit' : 'Create'} Payroll Profile</DialogTitle>
            <DialogDescription>
              Configure pay schedule and currency settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Monthly Nepal Payroll"
              />
            </div>

            {!editingProfile && (
              <div className="space-y-2">
                <Label htmlFor="legal_entity">Legal Entity *</Label>
                <Select
                  value={formData.legal_entity_id}
                  onValueChange={(value) => {
                    const entity = entities?.find(e => e.id === value);
                    setFormData(prev => ({ 
                      ...prev, 
                      legal_entity_id: value,
                      country: entity?.country || 'NP',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities?.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="pay_frequency">Pay Frequency</Label>
                <Select
                  value={formData.pay_frequency}
                  onValueChange={(value: PayFrequency) => setFormData(prev => ({ ...prev, pay_frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="standard_hours">Standard Hours per Week</Label>
              <Input
                id="standard_hours"
                type="number"
                min={1}
                max={80}
                value={formData.standard_hours_per_week}
                onChange={(e) => setFormData(prev => ({ ...prev, standard_hours_per_week: parseInt(e.target.value) || 40 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kathmandu">Asia/Kathmandu</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                  <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                  <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!editingProfile && (
              <div className="space-y-2">
                <Label htmlFor="effective_from">Effective From</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createProfile.isPending || updateProfile.isPending}>
              {editingProfile ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
