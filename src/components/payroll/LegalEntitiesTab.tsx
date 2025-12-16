import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { useLegalEntities, useCreateLegalEntity, useUpdateLegalEntity, useDeleteLegalEntity } from "@/services/usePayroll";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { LegalEntity, PayrollCountry, CreateLegalEntityInput } from "@/types/payroll";

const COUNTRIES: { value: PayrollCountry; label: string }[] = [
  { value: 'NP', label: 'Nepal' },
  { value: 'IN', label: 'India' },
  { value: 'AU', label: 'Australia' },
];

export const LegalEntitiesTab = () => {
  const { currentOrg } = useOrganization();
  const { data: entities, isLoading } = useLegalEntities();
  const createEntity = useCreateLegalEntity();
  const updateEntity = useUpdateLegalEntity();
  const deleteEntity = useDeleteLegalEntity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null);
  const [formData, setFormData] = useState<Partial<CreateLegalEntityInput>>({
    name: '',
    country: 'NP',
    registration_number: '',
    tax_id: '',
    address: { street: '', city: '', state: '', postcode: '', country: '' },
  });

  const handleOpenCreate = () => {
    setEditingEntity(null);
    setFormData({
      name: '',
      country: 'NP',
      registration_number: '',
      tax_id: '',
      address: { street: '', city: '', state: '', postcode: '', country: '' },
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (entity: LegalEntity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      country: entity.country,
      registration_number: entity.registration_number || '',
      tax_id: entity.tax_id || '',
      address: entity.address || { street: '', city: '', state: '', postcode: '', country: '' },
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.id || !formData.name || !formData.country) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      if (editingEntity) {
        await updateEntity.mutateAsync({
          id: editingEntity.id,
          ...formData,
        });
        toast.success("Legal entity updated");
      } else {
        await createEntity.mutateAsync({
          ...formData as CreateLegalEntityInput,
          organization_id: currentOrg.id,
        });
        toast.success("Legal entity created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save legal entity");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this legal entity?")) return;
    try {
      await deleteEntity.mutateAsync(id);
      toast.success("Legal entity deleted");
    } catch (error) {
      toast.error("Failed to delete legal entity");
    }
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
          <h2 className="text-lg font-semibold">Legal Entities</h2>
          <p className="text-sm text-muted-foreground">
            Manage registered business entities for payroll processing
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Entity
        </Button>
      </div>

      {entities?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Legal Entities</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first legal entity to start processing payroll
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Legal Entity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entities?.map((entity) => (
            <Card key={entity.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{entity.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {entity.registration_number || 'No registration number'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {COUNTRIES.find(c => c.value === entity.country)?.label || entity.country}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {entity.tax_id && (
                    <p className="text-muted-foreground">
                      Tax ID: {entity.tax_id}
                    </p>
                  )}
                  {entity.address?.city && (
                    <p className="text-muted-foreground">
                      {entity.address.city}, {entity.address.state || entity.address.country}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(entity)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(entity.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
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
            <DialogTitle>{editingEntity ? 'Edit' : 'Create'} Legal Entity</DialogTitle>
            <DialogDescription>
              {editingEntity ? 'Update the legal entity details' : 'Add a new legal entity for payroll processing'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Entity Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Company Pvt. Ltd."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value: PayrollCountry) => setFormData(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                value={formData.registration_number}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                placeholder="REG-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID / PAN</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                placeholder="123456789"
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Street"
                value={formData.address?.street || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address!, street: e.target.value }
                }))}
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={formData.address?.city || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address!, city: e.target.value }
                  }))}
                />
                <Input
                  placeholder="State/Province"
                  value={formData.address?.state || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address!, state: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createEntity.isPending || updateEntity.isPending}>
              {editingEntity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
