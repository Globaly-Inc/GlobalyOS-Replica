/**
 * Owner Profile Step
 * Collects essential profile information for the organization owner
 * Provides industry-based suggestions for position and department
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowRight, Loader2, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Industry-based suggestions for positions and departments
const INDUSTRY_SUGGESTIONS: Record<string, { positions: string[]; departments: string[] }> = {
  'Technology': {
    positions: ['CEO', 'CTO', 'Founder', 'Co-Founder', 'Director of Engineering', 'VP of Product', 'Chief Product Officer', 'Technical Director'],
    departments: ['Executive', 'Engineering', 'Product', 'Operations', 'Technology', 'Research & Development'],
  },
  'Healthcare': {
    positions: ['CEO', 'Medical Director', 'Practice Manager', 'Chief Medical Officer', 'Administrator', 'Clinical Director', 'Hospital Administrator'],
    departments: ['Executive', 'Medical', 'Administration', 'Operations', 'Clinical', 'Nursing'],
  },
  'Finance & Banking': {
    positions: ['CEO', 'CFO', 'Managing Director', 'Partner', 'Director', 'VP of Finance', 'Chief Investment Officer', 'Portfolio Manager'],
    departments: ['Executive', 'Finance', 'Compliance', 'Operations', 'Investment', 'Risk Management'],
  },
  'Education': {
    positions: ['Principal', 'Dean', 'Director', 'Superintendent', 'Department Head', 'Academic Director', 'Chancellor', 'Provost'],
    departments: ['Executive', 'Administration', 'Academic', 'Student Services', 'Curriculum', 'Research'],
  },
  'Retail': {
    positions: ['CEO', 'Store Manager', 'Regional Director', 'Operations Manager', 'Merchandising Director', 'VP of Retail', 'District Manager'],
    departments: ['Executive', 'Operations', 'Sales', 'Merchandising', 'Inventory', 'Customer Service'],
  },
  'Manufacturing': {
    positions: ['CEO', 'Plant Manager', 'Operations Director', 'Production Manager', 'VP of Manufacturing', 'Quality Director', 'Supply Chain Director'],
    departments: ['Executive', 'Production', 'Operations', 'Quality Control', 'Supply Chain', 'Engineering'],
  },
  'Professional Services': {
    positions: ['Managing Partner', 'Senior Partner', 'Director', 'Principal', 'CEO', 'Practice Lead', 'Department Head'],
    departments: ['Executive', 'Consulting', 'Advisory', 'Operations', 'Client Services', 'Business Development'],
  },
  'Real Estate': {
    positions: ['CEO', 'Broker', 'Managing Director', 'VP of Operations', 'Property Manager', 'Development Director', 'Investment Director'],
    departments: ['Executive', 'Sales', 'Property Management', 'Development', 'Investment', 'Leasing'],
  },
  'Hospitality': {
    positions: ['General Manager', 'CEO', 'Hotel Director', 'Operations Director', 'F&B Director', 'Resort Manager', 'Regional Director'],
    departments: ['Executive', 'Operations', 'Food & Beverage', 'Guest Services', 'Housekeeping', 'Sales'],
  },
  'Non-Profit': {
    positions: ['Executive Director', 'CEO', 'President', 'Program Director', 'Development Director', 'Managing Director', 'Board Chair'],
    departments: ['Executive', 'Programs', 'Development', 'Operations', 'Fundraising', 'Communications'],
  },
  'Media & Entertainment': {
    positions: ['CEO', 'Creative Director', 'Executive Producer', 'Managing Director', 'Content Director', 'VP of Production', 'Studio Head'],
    departments: ['Executive', 'Creative', 'Production', 'Content', 'Marketing', 'Distribution'],
  },
  'Government': {
    positions: ['Director', 'Administrator', 'Commissioner', 'Secretary', 'Department Head', 'Chief of Staff', 'Executive Director'],
    departments: ['Executive', 'Administration', 'Policy', 'Operations', 'Public Affairs', 'Legal'],
  },
  'Other': {
    positions: ['CEO', 'Founder', 'Owner', 'Managing Director', 'President', 'Director', 'General Manager'],
    departments: ['Executive', 'Management', 'Operations', 'Administration', 'Business Development'],
  },
};

// Default suggestions when industry is not set
const DEFAULT_SUGGESTIONS = {
  positions: ['CEO', 'Founder', 'Owner', 'Director', 'Managing Director', 'President', 'Partner', 'General Manager'],
  departments: ['Executive', 'Management', 'Operations', 'Administration', 'Leadership'],
};

interface OwnerProfileStepProps {
  organizationId: string;
  industry?: string;
  initialData?: {
    position?: string;
    department?: string;
    join_date?: string;
    date_of_birth?: string;
  };
  onSave: (data: {
    position: string;
    department: string;
    join_date: string;
    date_of_birth: string | null;
  }) => void;
  onBack: () => void;
  isSaving: boolean;
}

export function OwnerProfileStep({
  organizationId,
  industry,
  initialData,
  onSave,
  onBack,
  isSaving,
}: OwnerProfileStepProps) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    position: initialData?.position || '',
    department: initialData?.department || '',
    join_date: initialData?.join_date || new Date().toISOString().split('T')[0],
    date_of_birth: initialData?.date_of_birth || '',
  });
  
  const [positionOpen, setPositionOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [positionSearch, setPositionSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Get suggestions based on industry
  const suggestions = useMemo(() => {
    if (!industry) return DEFAULT_SUGGESTIONS;
    return INDUSTRY_SUGGESTIONS[industry] || DEFAULT_SUGGESTIONS;
  }, [industry]);

  // Filter suggestions based on search
  const filteredPositions = useMemo(() => {
    if (!positionSearch) return suggestions.positions;
    return suggestions.positions.filter((p) =>
      p.toLowerCase().includes(positionSearch.toLowerCase())
    );
  }, [suggestions.positions, positionSearch]);

  const filteredDepartments = useMemo(() => {
    if (!departmentSearch) return suggestions.departments;
    return suggestions.departments.filter((d) =>
      d.toLowerCase().includes(departmentSearch.toLowerCase())
    );
  }, [suggestions.departments, departmentSearch]);

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
          .select('position, department, join_date, date_of_birth')
          .eq('user_id', session.user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (employee) {
          setFormData({
            position: employee.position || '',
            department: employee.department || '',
            join_date: employee.join_date || new Date().toISOString().split('T')[0],
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

    if (!formData.position || !formData.department) {
      toast({
        title: 'Required fields missing',
        description: 'Please select or enter your position and department.',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.user?.id || !organizationId) {
      toast({
        title: 'Error',
        description: 'Missing user or organization information',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Step 1: Get or create Head Office for the organization
      let headOfficeId: string | null = null;
      
      // Try to find existing head office
      const { data: existingOffice } = await supabase
        .from('offices')
        .select('id')
        .eq('organization_id', organizationId)
        .or('name.ilike.Head Office,name.ilike.Headquarters,is_headquarters.eq.true')
        .limit(1)
        .maybeSingle();
      
      if (existingOffice) {
        headOfficeId = existingOffice.id;
      } else {
        // Create head office - get country from organization
        const { data: org } = await supabase
          .from('organizations')
          .select('country')
          .eq('id', organizationId)
          .single();
        
        const { data: newOffice, error: officeError } = await supabase
          .from('offices')
          .insert({
            organization_id: organizationId,
            name: 'Head Office',
            country: org?.country || null,
            is_headquarters: true,
          })
          .select('id')
          .single();
        
        if (officeError) {
          console.warn('Could not create head office:', officeError);
        } else {
          headOfficeId = newOffice.id;
        }
      }

      // Step 2: Check if employee record exists
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
            join_date: formData.join_date,
            date_of_birth: formData.date_of_birth || null,
            status: 'active',
            employment_type: 'employee',
            office_id: headOfficeId,
          })
          .eq('id', existingEmployee.id);

        if (updateError) throw updateError;
      } else {
        // Create new employee record with is_new_hire = false for owner (skip onboarding workflow)
        const { data: newEmployee, error: insertError } = await supabase
          .from('employees')
          .insert({
            organization_id: organizationId,
            user_id: session.user.id,
            position: formData.position,
            department: formData.department,
            join_date: formData.join_date,
            date_of_birth: formData.date_of_birth || null,
            status: 'active',
            employment_type: 'employee',
            office_id: headOfficeId,
            is_new_hire: false, // Owner doesn't need onboarding workflow
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
            effective_date: formData.join_date,
            is_current: true,
            change_type: 'hire',
          });
        }
      }

      // Save to onboarding data and advance
      onSave({
        position: formData.position,
        department: formData.department,
        join_date: formData.join_date,
        date_of_birth: formData.date_of_birth || null,
      });
    } catch (error) {
      console.error('Failed to save owner profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to save your profile: ${errorMessage}`,
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
            {/* Position Field with Combobox */}
            <div className="space-y-2">
              <Label>Position / Job Title *</Label>
              <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={positionOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.position || 'Select position...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search or type custom..."
                      value={positionSearch}
                      onValueChange={setPositionSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded cursor-pointer"
                          onClick={() => {
                            setFormData({ ...formData, position: positionSearch });
                            setPositionOpen(false);
                            setPositionSearch('');
                          }}
                        >
                          Use "{positionSearch}"
                        </button>
                      </CommandEmpty>
                      <CommandGroup heading={industry ? `${industry} roles` : 'Common roles'}>
                        {filteredPositions.map((position) => (
                          <CommandItem
                            key={position}
                            value={position}
                            onSelect={() => {
                              setFormData({ ...formData, position });
                              setPositionOpen(false);
                              setPositionSearch('');
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.position === position ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {position}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Department Field with Combobox */}
            <div className="space-y-2">
              <Label>Department *</Label>
              <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={departmentOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.department || 'Select department...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search or type custom..."
                      value={departmentSearch}
                      onValueChange={setDepartmentSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded cursor-pointer"
                          onClick={() => {
                            setFormData({ ...formData, department: departmentSearch });
                            setDepartmentOpen(false);
                            setDepartmentSearch('');
                          }}
                        >
                          Use "{departmentSearch}"
                        </button>
                      </CommandEmpty>
                      <CommandGroup heading={industry ? `${industry} departments` : 'Common departments'}>
                        {filteredDepartments.map((department) => (
                          <CommandItem
                            key={department}
                            value={department}
                            onSelect={() => {
                              setFormData({ ...formData, department });
                              setDepartmentOpen(false);
                              setDepartmentSearch('');
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.department === department ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {department}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Joined Company */}
            <div className="space-y-2">
              <Label>Date Joined Company *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.join_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.join_date
                      ? format(new Date(formData.join_date), 'PPP')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.join_date ? new Date(formData.join_date) : undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        join_date: date ? date.toISOString().split('T')[0] : '',
                      })
                    }
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.date_of_birth && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date_of_birth
                      ? format(new Date(formData.date_of_birth), 'PPP')
                      : 'Select date (optional)'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date_of_birth ? new Date(formData.date_of_birth) : undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        date_of_birth: date ? date.toISOString().split('T')[0] : '',
                      })
                    }
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
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
