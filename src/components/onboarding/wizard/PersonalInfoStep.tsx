/**
 * Employee Onboarding - Personal Info Step
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { ArrowRight, User } from 'lucide-react';

interface PersonalInfoStepProps {
  employeeId: string;
  initialData?: Record<string, unknown>;
  prefillData?: { full_name?: string; email?: string };
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function PersonalInfoStep({ initialData, prefillData, onSave, isSaving }: PersonalInfoStepProps) {
  const [formData, setFormData] = useState({
    preferred_name: (initialData?.preferred_name as string) || '',
    phone: (initialData?.phone as string) || '',
    date_of_birth: (initialData?.date_of_birth as string) || '',
    linkedin_url: (initialData?.linkedin_url as string) || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Your Information</CardTitle>
        <CardDescription>
          Help your team get to know you better
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={prefillData?.full_name || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Preferred Name</Label>
              <Input
                value={formData.preferred_name}
                onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                placeholder="How should we call you?"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <DatePicker
                value={formData.date_of_birth}
                onChange={(value) => setFormData({ ...formData, date_of_birth: value })}
                placeholder="Select date of birth"
                allowFutureDates={false}
                fromYear={1940}
                toYear={new Date().getFullYear() - 16}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>LinkedIn (optional)</Label>
            <Input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <Button type="submit" disabled={isSaving} className="w-full mt-4">
            {isSaving ? 'Saving...' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
