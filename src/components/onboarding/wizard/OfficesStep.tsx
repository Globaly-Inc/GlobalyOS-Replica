/**
 * Organization Onboarding - Offices Step
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Building, Plus, Trash2, MapPin } from 'lucide-react';

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
  initialOffices: Office[];
  onSave: (offices: Office[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'BR', name: 'Brazil' },
];

const emptyOffice: Office = {
  name: '',
  type: 'headquarters',
  country: '',
  city: '',
  address: '',
};

export function OfficesStep({ initialOffices, onSave, onBack, isSaving }: OfficesStepProps) {
  const [offices, setOffices] = useState<Office[]>(
    initialOffices.length > 0 ? initialOffices : [{ ...emptyOffice }]
  );

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out incomplete offices
    const validOffices = offices.filter(o => o.name && o.country && o.city);
    if (validOffices.length === 0) {
      return;
    }
    onSave(validOffices);
  };

  const isValid = offices.some(o => o.name && o.country && o.city);

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
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={office.type}
                    onValueChange={(value: 'headquarters' | 'branch') => updateOffice(index, 'type', value)}
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
                  <Select
                    value={office.country}
                    onValueChange={(value) => updateOffice(index, 'country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={office.city}
                    onChange={(e) => updateOffice(index, 'city', e.target.value)}
                    placeholder="e.g., New York"
                    required={index === 0}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Street Address (optional)</Label>
                <Input
                  value={office.address || ''}
                  onChange={(e) => updateOffice(index, 'address', e.target.value)}
                  placeholder="123 Main Street, Suite 100"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addOffice}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Office
          </Button>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isSaving || !isValid} className="flex-1">
              {isSaving ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
