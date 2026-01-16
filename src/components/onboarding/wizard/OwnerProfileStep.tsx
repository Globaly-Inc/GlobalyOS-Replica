/**
 * Owner Profile Step
 * Collects essential profile information for the organization owner
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface OwnerProfileStepProps {
  organizationId: string;
  initialData?: {
    position?: string;
    department?: string;
    phone?: string;
    date_of_birth?: string;
  };
  onSave: (data: {
    position: string;
    department: string;
    phone: string;
    date_of_birth: string | null;
  }) => void;
  onBack: () => void;
  isSaving: boolean;
}

export function OwnerProfileStep({
  organizationId,
  initialData,
  onSave,
  onBack,
  isSaving,
}: OwnerProfileStepProps) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    position: initialData?.position || 'Owner',
    department: initialData?.department || 'Management',
    phone: initialData?.phone || '',
    date_of_birth: initialData?.date_of_birth || '',
  });

  // Fetch existing employee data if available
  useEffect(() => {
    async function fetchExistingData() {
      if (!session?.user?.id || !organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('position, department, phone, date_of_birth')
          .eq('user_id', session.user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (employee) {
          setFormData({
            position: employee.position || 'Owner',
            department: employee.department || 'Management',
            phone: employee.phone || '',
            date_of_birth: employee.date_of_birth || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExistingData();
  }, [session?.user?.id, organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id || !organizationId) {
      toast({
        title: 'Error',
        description: 'Missing user or organization information',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if employee record exists
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            position: formData.position,
            department: formData.department,
            phone: formData.phone || null,
            date_of_birth: formData.date_of_birth || null,
            status: 'active',
          })
          .eq('id', existingEmployee.id);

        if (updateError) throw updateError;
      } else {
        // Create new employee record
        const { data: newEmployee, error: insertError } = await supabase
          .from('employees')
          .insert({
            organization_id: organizationId,
            user_id: session.user.id,
            position: formData.position,
            department: formData.department,
            phone: formData.phone || null,
            date_of_birth: formData.date_of_birth || null,
            join_date: new Date().toISOString().split('T')[0],
            status: 'active',
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Create initial position history record
        if (newEmployee) {
          await supabase.from('position_history').insert({
            employee_id: newEmployee.id,
            organization_id: organizationId,
            position: formData.position,
            department: formData.department,
            effective_date: new Date().toISOString().split('T')[0],
            is_current: true,
            change_type: 'hire',
          });
        }
      }

      // Save to onboarding data and advance
      onSave({
        position: formData.position,
        department: formData.department,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth || null,
      });
    } catch (error) {
      console.error('Failed to save owner profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <User className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>
          Set up your employee profile as the organization owner
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="position">Position / Job Title</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., CEO, Founder, Director"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Management, Executive"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
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
