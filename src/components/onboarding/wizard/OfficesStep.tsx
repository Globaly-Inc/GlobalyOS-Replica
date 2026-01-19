/**
 * Organization Onboarding - Offices Step
 * Simplified with AddressAutocomplete and organization prefill
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/address-autocomplete';
import { ArrowLeft, ArrowRight, Building, Plus, Trash2, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Office {
  id?: string;
  name: string;
  address: string;
  address_components?: {
    country?: string;
    country_code?: string;
    city?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
  };
}

interface OrganizationInfo {
  name?: string;
  business_address?: string;
  business_address_components?: {
    country?: string;
    country_code?: string;
    locality?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
  };
}

interface OfficesStepProps {
  organizationId: string;
  organizationInfo?: OrganizationInfo;
  initialOffices: Office[];
  onSave: (offices: Office[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

export function OfficesStep({ 
  organizationId, 
  organizationInfo,
  initialOffices, 
  onSave, 
  onBack, 
  isSaving 
}: OfficesStepProps) {
  const { toast } = useToast();
  const [isPersisting, setIsPersisting] = useState(false);

  // Initialize offices with prefill from organization
  const getInitialOffices = (): Office[] => {
    if (initialOffices.length > 0 && initialOffices[0].address) {
      return initialOffices;
    }
    
    const orgAddress = organizationInfo?.business_address || '';
    const components = organizationInfo?.business_address_components;
    
    return [{
      name: organizationInfo?.name ? `${organizationInfo.name} HQ` : 'Head Office',
      address: orgAddress,
      address_components: components ? {
        country: components.country,
        country_code: components.country_code,
        city: components.locality,
        postal_code: components.postal_code,
        lat: components.lat,
        lng: components.lng,
      } : undefined,
    }];
  };

  const [offices, setOffices] = useState<Office[]>(getInitialOffices);

  // Update offices when organizationInfo changes (if not already set)
  useEffect(() => {
    if (organizationInfo && offices.length === 1 && !offices[0].address && organizationInfo.business_address) {
      setOffices(getInitialOffices());
    }
  }, [organizationInfo]);

  const addOffice = () => {
    setOffices([...offices, { name: '', address: '' }]);
  };

  const removeOffice = (index: number) => {
    if (offices.length > 1) {
      setOffices(offices.filter((_, i) => i !== index));
    }
  };

  const updateOfficeName = (index: number, name: string) => {
    setOffices(offices.map((office, i) => 
      i === index ? { ...office, name } : office
    ));
  };

  const handleAddressChange = (index: number, address: string, components?: AddressComponents) => {
    setOffices(offices.map((office, i) => 
      i === index ? { 
        ...office, 
        address,
        address_components: components ? {
          country: components.country,
          country_code: components.country_code,
          city: components.locality,
          postal_code: components.postal_code,
          lat: components.lat,
          lng: components.lng,
        } : office.address_components
      } : office
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out incomplete offices
    const validOffices = offices.filter(o => o.name && o.address);
    if (validOffices.length === 0) {
      toast({
        title: 'At least one office required',
        description: 'Please add at least one office with name and address.',
        variant: 'destructive',
      });
      return;
    }

    setIsPersisting(true);

    try {
      const insertedOffices: Office[] = [];
      
      for (let i = 0; i < validOffices.length; i++) {
        const office = validOffices[i];
        const country = office.address_components?.country_code || '';
        const city = office.address_components?.city || '';

        // Check if office already exists (by name in this org)
        const { data: existing } = await supabase
          .from('offices')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', office.name)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('offices')
            .update({
              country,
              city,
              address: office.address,
            })
            .eq('id', existing.id);
          
          insertedOffices.push({ ...office, id: existing.id });
        } else {
          const { data: newOffice, error } = await supabase
            .from('offices')
            .insert({
              organization_id: organizationId,
              name: office.name,
              country,
              city,
              address: office.address,
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

  const isValid = offices.some(o => o.name && o.address);
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
                {index !== 0 && offices.length > 1 && (
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
                {index === 0 && (
                  <span className="text-xs text-muted-foreground">Headquarters</span>
                )}
              </div>

              <div className="space-y-2">
                <Label>Office Name *</Label>
                <Input
                  value={office.name}
                  onChange={(e) => updateOfficeName(index, e.target.value)}
                  placeholder="e.g., Head Office, Sydney Branch"
                  required={index === 0}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Office Address *</Label>
                <AddressAutocomplete
                  value={office.address}
                  onChange={(address, components) => handleAddressChange(index, address, components)}
                  placeholder="Start typing the office address..."
                  required={index === 0}
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
