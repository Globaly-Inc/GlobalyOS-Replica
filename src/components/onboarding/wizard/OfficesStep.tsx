/**
 * Organization Onboarding - Offices Step
 * Persists offices to database immediately for use in subsequent steps
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountrySelector } from '@/components/ui/country-selector';
import { ArrowLeft, ArrowRight, Building, Plus, Trash2, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Office {
  id?: string;
  name: string;
  type: 'headquarters' | 'branch';
  country: string;
  city: string;
  address?: string;
  timezone?: string;
}

interface OfficesStepProps {
  organizationId: string;
  initialOffices: Office[];
  onSave: (offices: Office[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

const emptyOffice: Office = {
  name: '',
  type: 'headquarters',
  country: '',
  city: '',
  address: '',
};

export function OfficesStep({ organizationId, initialOffices, onSave, onBack, isSaving }: OfficesStepProps) {
  const { toast } = useToast();
  const [offices, setOffices] = useState<Office[]>(
    initialOffices.length > 0 ? initialOffices : [{ ...emptyOffice }]
  );
  const [isPersisting, setIsPersisting] = useState(false);

  const addOffice = () => {
    setOffices([...offices, { ...emptyOffice, type: 'branch' }]);
  };

  const removeOffice = (index: number) => {
    if (offices.length > 1) {
      setOffices(offices.filter((_, i) => i !== index));
    }
  };

  const updateOffice = (index: number, field: keyof Office, value: string) => {
    setOffices(offices.map((office, i) => 
      i === index ? { ...office, [field]: value } : office
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out incomplete offices
    const validOffices = offices.filter(o => o.name && o.country && o.city);
    if (validOffices.length === 0) {
      toast({
        title: 'At least one office required',
        description: 'Please add at least one office with name, country, and city.',
        variant: 'destructive',
      });
      return;
    }

    setIsPersisting(true);

    try {
      // Persist offices to database
      const insertedOffices: Office[] = [];
      
      for (const office of validOffices) {
        // Check if office already exists (by name in this org)
        const { data: existing } = await supabase
          .from('offices')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', office.name)
          .maybeSingle();

        if (existing) {
          // Update existing
          await supabase
            .from('offices')
            .update({
              country: office.country,
              city: office.city,
              address: office.address || null,
              is_headquarters: office.type === 'headquarters',
            })
            .eq('id', existing.id);
          
          insertedOffices.push({ ...office, id: existing.id });
        } else {
          // Insert new
          const { data: newOffice, error } = await supabase
            .from('offices')
            .insert({
              organization_id: organizationId,
              name: office.name,
              country: office.country,
              city: office.city,
              address: office.address || null,
              is_headquarters: office.type === 'headquarters',
            })
            .select('id')
            .single();

          if (error) {
            console.error('Failed to insert office:', error);
            throw error;
          }

          insertedOffices.push({ ...office, id: newOffice.id });
        }
      }

      toast({
        title: 'Offices saved',
        description: `${insertedOffices.length} office${insertedOffices.length > 1 ? 's' : ''} saved successfully.`,
      });

      onSave(insertedOffices);
    } catch (err) {
      console.error('Failed to persist offices:', err);
      toast({
        title: 'Error saving offices',
        description: 'Some offices may not have been saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPersisting(false);
    }
  };

  const isValid = offices.some(o => o.name && o.country && o.city);
  const isLoading = isSaving || isPersisting;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Your Offices</CardTitle>
        <CardDescription>
          Add your office locations. You need at least one office to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {offices.map((office, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border bg-muted/30 space-y-4 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {index === 0 ? 'Primary Office' : `Office ${index + 1}`}
                  </span>
                </div>
                {offices.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOffice(index)}
                    className="text-destructive hover:text-destructive"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Office Name *</Label>
                  <Input
                    value={office.name}
                    onChange={(e) => updateOffice(index, 'name', e.target.value)}
                    placeholder="e.g., Head Office"
                    required={index === 0}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={office.type}
                    onValueChange={(value: 'headquarters' | 'branch') => updateOffice(index, 'type', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">Headquarters</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <CountrySelector
                    value={office.country}
                    onChange={(value) => updateOffice(index, 'country', value)}
                    placeholder="Select country"
                    valueType="code"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={office.city}
                    onChange={(e) => updateOffice(index, 'city', e.target.value)}
                    placeholder="e.g., New York"
                    required={index === 0}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Street Address (optional)</Label>
                <Input
                  value={office.address || ''}
                  onChange={(e) => updateOffice(index, 'address', e.target.value)}
                  placeholder="123 Main Street, Suite 100"
                  disabled={isLoading}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addOffice}
            className="w-full"
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Office
          </Button>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isLoading || !isValid} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
