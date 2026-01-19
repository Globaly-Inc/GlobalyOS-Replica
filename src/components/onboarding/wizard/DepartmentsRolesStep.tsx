/**
 * Organization Onboarding - Departments & Roles Step
 * AI-powered suggestions for departments and positions based on industry
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Sparkles, Plus, Trash2, Loader2, Building2, Users, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Position {
  name: string;
  department: string;
  selected?: boolean;
}

interface DepartmentsRolesData {
  departments: string[];
  positions: Position[];
}

interface DepartmentsRolesStepProps {
  organizationId: string;
  industry?: string;
  companySize?: string;
  initialData?: DepartmentsRolesData;
  onSave: (data: DepartmentsRolesData) => void;
  onBack: () => void;
  isSaving: boolean;
}

export function DepartmentsRolesStep({
  organizationId,
  industry,
  companySize,
  initialData,
  onSave,
  onBack,
  isSaving,
}: DepartmentsRolesStepProps) {
  const { toast } = useToast();
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSuggestingPositions, setIsSuggestingPositions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<string[]>(initialData?.departments || []);
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(
    new Set(initialData?.departments || [])
  );
  const [positions, setPositions] = useState<Position[]>(initialData?.positions || []);
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState({ name: '', department: '' });
  const [hasFetched, setHasFetched] = useState(!!initialData?.departments?.length);

  // Fetch AI suggestions on mount
  useEffect(() => {
    if (!hasFetched && industry) {
      fetchSuggestions();
    }
  }, [industry, hasFetched]);

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-org-structure', {
        body: { industry: industry || 'General Business', companySize: companySize || 'small' },
      });

      if (error) throw error;

      if (data?.departments && data?.positions) {
        setDepartments(data.departments);
        setSelectedDepartments(new Set(data.departments));
        setPositions(data.positions.map((p: Position) => ({ ...p, selected: true })));
        setHasFetched(true);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      // Fall back to defaults
      const defaultDepts = ['Executive', 'Operations', 'Sales', 'Marketing', 'Finance', 'Human Resources'];
      const defaultPositions = [
        { name: 'CEO', department: 'Executive', selected: true },
        { name: 'Operations Manager', department: 'Operations', selected: true },
        { name: 'Sales Manager', department: 'Sales', selected: true },
        { name: 'Marketing Manager', department: 'Marketing', selected: true },
        { name: 'Finance Manager', department: 'Finance', selected: true },
        { name: 'HR Manager', department: 'Human Resources', selected: true },
      ];
      setDepartments(defaultDepts);
      setSelectedDepartments(new Set(defaultDepts));
      setPositions(defaultPositions);
      setHasFetched(true);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const toggleDepartment = (dept: string) => {
    const newSelected = new Set(selectedDepartments);
    if (newSelected.has(dept)) {
      newSelected.delete(dept);
      // Also deselect positions in this department
      setPositions(positions.map(p => 
        p.department === dept ? { ...p, selected: false } : p
      ));
    } else {
      newSelected.add(dept);
    }
    setSelectedDepartments(newSelected);
  };

  const togglePosition = (index: number) => {
    setPositions(positions.map((p, i) => 
      i === index ? { ...p, selected: !p.selected } : p
    ));
  };

  const addCustomDepartment = () => {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      const dept = newDepartment.trim();
      setDepartments([...departments, dept]);
      setSelectedDepartments(new Set([...selectedDepartments, dept]));
      setNewDepartment('');
    }
  };

  const addCustomPosition = () => {
    if (newPosition.name.trim() && newPosition.department) {
      setPositions([...positions, { 
        name: newPosition.name.trim(), 
        department: newPosition.department, 
        selected: true 
      }]);
      setNewPosition({ name: '', department: '' });
    }
  };

  const removePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  const suggestMorePositions = async () => {
    if (selectedDepartments.size === 0) {
      toast({
        title: 'Select departments first',
        description: 'Please select at least one department to get position suggestions.',
        variant: 'destructive',
      });
      return;
    }

    setIsSuggestingPositions(true);
    try {
      const existingPositionNames = positions.map(p => p.name);
      const { data, error } = await supabase.functions.invoke('suggest-positions', {
        body: { 
          departments: Array.from(selectedDepartments),
          existingPositions: existingPositionNames,
          industry: industry || 'General Business', 
          companySize: companySize || 'small' 
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: 'Suggestion failed',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      if (data?.positions && data.positions.length > 0) {
        // Filter out any duplicates and add new positions
        const newPositions = data.positions.filter(
          (p: Position) => !existingPositionNames.includes(p.name)
        ).map((p: Position) => ({ ...p, selected: true }));

        if (newPositions.length > 0) {
          setPositions([...positions, ...newPositions]);
          toast({
            title: 'Positions suggested',
            description: `Added ${newPositions.length} new position suggestions.`,
          });
        } else {
          toast({
            title: 'No new positions',
            description: 'All suggested positions already exist.',
          });
        }
      } else {
        toast({
          title: 'No suggestions',
          description: 'Could not generate additional positions. Try adding custom positions.',
        });
      }
    } catch (err) {
      console.error('Failed to suggest positions:', err);
      toast({
        title: 'Suggestion failed',
        description: 'Could not generate position suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSuggestingPositions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-clicks
    if (isSubmitting || isSaving) return;

    const finalDepartments = Array.from(selectedDepartments);
    const finalPositions = positions.filter(p => p.selected && selectedDepartments.has(p.department));

    if (finalDepartments.length === 0) {
      toast({
        title: 'Please select departments',
        description: 'At least one department is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Persist positions to database (ignore duplicates from seeded data)
      for (const position of finalPositions) {
        const { error } = await supabase
          .from('positions')
          .insert({
            organization_id: organizationId,
            name: position.name,
            department: position.department,
          })
          .select()
          .maybeSingle();

        // Ignore unique constraint violations (position already exists from seeded/template data)
        if (error && error.code !== '23505' && !error.message?.includes('duplicate')) {
          console.error('Failed to insert position:', position.name, error);
        }
      }

      onSave({
        departments: finalDepartments,
        positions: finalPositions.map(({ name, department }) => ({ name, department })),
      });
    } catch (err) {
      console.error('Failed to save positions:', err);
      setIsSubmitting(false);
    }
  };

  if (isLoadingSuggestions) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Analyzing Your Industry</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Our AI is generating department and role suggestions based on {industry || 'your industry'}...
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-primary mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          Departments & Roles
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Suggested
          </Badge>
        </CardTitle>
        <CardDescription>
          Review the suggested structure for your {industry || 'organization'} or customize it
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Departments Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </Label>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <Badge
                  key={dept}
                  variant={selectedDepartments.has(dept) ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1.5 text-sm transition-colors"
                  onClick={() => toggleDepartment(dept)}
                >
                  {dept}
                </Badge>
              ))}
            </div>
            
            {/* Add custom department */}
            <div className="flex gap-2 mt-3">
              <Input
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Add custom department..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomDepartment())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomDepartment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Positions Section */}
          <div className="space-y-3">
            {(() => {
              const visiblePositions = positions.filter(p => selectedDepartments.has(p.department));
              const allSelected = visiblePositions.length > 0 && visiblePositions.every(p => p.selected);
              
              const toggleSelectAll = () => {
                const shouldSelectAll = !allSelected;
                setPositions(positions.map(p => 
                  selectedDepartments.has(p.department) 
                    ? { ...p, selected: shouldSelectAll } 
                    : p
                ));
              };

              return (
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Positions
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      disabled={visiblePositions.length === 0}
                      className="gap-1.5"
                    >
                      {allSelected ? (
                        <>
                          <Square className="h-3.5 w-3.5" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-3.5 w-3.5" />
                          Select All
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={suggestMorePositions}
                      disabled={isSuggestingPositions || selectedDepartments.size === 0}
                      className="gap-1.5"
                    >
                      {isSuggestingPositions ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Suggesting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Suggest
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {positions.filter(p => selectedDepartments.has(p.department)).map((position, index) => (
                <div 
                  key={`${position.name}-${position.department}-${index}`}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30"
                >
                  <Checkbox
                    checked={position.selected}
                    onCheckedChange={() => togglePosition(index)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{position.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {position.department}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePosition(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add custom position */}
            <div className="flex gap-2 mt-3">
              <Input
                value={newPosition.name}
                onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                placeholder="Position name..."
                className="flex-1"
              />
              <Select
                value={newPosition.department}
                onValueChange={(value) => setNewPosition({ ...newPosition, department: value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(selectedDepartments).map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addCustomPosition}
                disabled={!newPosition.name || !newPosition.department}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedDepartments.size}</span> departments and{' '}
            <span className="font-medium text-foreground">
              {positions.filter(p => p.selected && selectedDepartments.has(p.department)).length}
            </span>{' '}
            positions selected
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isSaving || selectedDepartments.size === 0} 
              className="flex-1"
            >
              {(isSubmitting || isSaving) ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
