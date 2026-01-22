/**
 * Organization Onboarding - Departments & Roles Step
 * Uses curated Super Admin templates with AI-powered suggestions for custom departments only
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Sparkles, Plus, Trash2, Loader2, Building2, Users, CheckSquare, Square, RefreshCw, LayoutTemplate } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { expandPositionName } from '@/utils/position-names';

interface Position {
  name: string;
  department: string;
  selected?: boolean;
}

interface DepartmentsRolesData {
  departments: string[];
  positions: Position[];
  industry?: string;
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
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSuggestingPositions, setIsSuggestingPositions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<string[]>(initialData?.departments || []);
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(
    new Set(initialData?.departments || [])
  );
  const [positions, setPositions] = useState<Position[]>(
    (initialData?.positions || []).map(p => ({ ...p, selected: true }))
  );
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState({ name: '', department: '' });
  const [hasFetched, setHasFetched] = useState(!!initialData?.departments?.length);
  
  // Track which industry was used to fetch current templates
  const [templateForIndustry, setTemplateForIndustry] = useState<string | undefined>(
    initialData?.industry || (initialData?.departments?.length ? industry : undefined)
  );
  const [showRefreshBanner, setShowRefreshBanner] = useState(false);
  
  // Track custom additions for learning
  const [customDepartments, setCustomDepartments] = useState<Set<string>>(new Set());
  const [customPositions, setCustomPositions] = useState<Set<string>>(new Set());
  
  // Track template source
  const [templateSource, setTemplateSource] = useState<string | null>(null);

  // Fetch templates on mount or detect industry change
  useEffect(() => {
    if (!hasFetched && industry) {
      fetchTemplates();
    } else if (hasFetched && industry && templateForIndustry && industry !== templateForIndustry) {
      setShowRefreshBanner(true);
    }
  }, [industry, hasFetched, templateForIndustry]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-org-structure-templates', {
        body: { 
          industry: industry || 'General Business', 
          companySize: companySize || 'small'
        },
      });

      if (error) throw error;

      if (data?.departments && data?.positions) {
        setDepartments(data.departments);
        setSelectedDepartments(new Set(data.departments));
        setPositions(data.positions.map((p: Position) => ({ ...p, selected: true })));
        setTemplateForIndustry(industry);
        setTemplateSource(data.source || 'template');
        setHasFetched(true);
        // Reset custom tracking for fresh templates
        setCustomDepartments(new Set());
        setCustomPositions(new Set());
        
        if (data.source === 'template') {
          toast({
            title: 'Loaded curated structure',
            description: 'Using template departments and positions for your industry.',
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      // Fall back to defaults
      const defaultDepts = ['Executive', 'Operations', 'Sales', 'Marketing', 'Finance', 'Human Resources'];
      const defaultPositions = [
        { name: 'Chief Executive Officer (CEO)', department: 'Executive', selected: true },
        { name: 'Operations Manager', department: 'Operations', selected: true },
        { name: 'Sales Manager', department: 'Sales', selected: true },
        { name: 'Marketing Manager', department: 'Marketing', selected: true },
        { name: 'Finance Manager', department: 'Finance', selected: true },
        { name: 'HR Manager', department: 'Human Resources', selected: true },
      ];
      setDepartments(defaultDepts);
      setSelectedDepartments(new Set(defaultDepts));
      setPositions(defaultPositions);
      setTemplateForIndustry(industry);
      setTemplateSource('default');
      setHasFetched(true);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleRefreshTemplates = () => {
    setShowRefreshBanner(false);
    setHasFetched(false);
    fetchTemplates();
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

  // Add custom department and auto-generate positions with AI
  const addCustomDepartment = async () => {
    if (!newDepartment.trim() || departments.includes(newDepartment.trim())) return;
    
    const dept = newDepartment.trim();
    setDepartments([...departments, dept]);
    setSelectedDepartments(new Set([...selectedDepartments, dept]));
    setCustomDepartments(new Set([...customDepartments, dept]));
    setNewDepartment('');
    
    // Auto-generate positions for this custom department
    setIsSuggestingPositions(true);
    toast({
      title: 'Generating positions...',
      description: `Creating role suggestions for ${dept}`,
    });
    
    try {
      const existingPositionNames = positions.map(p => p.name);
      const { data, error } = await supabase.functions.invoke('suggest-custom-department-positions', {
        body: { 
          departmentName: dept,
          industry: industry || 'General Business', 
          companySize: companySize || 'small',
          existingPositions: existingPositionNames
        },
      });

      if (error) throw error;

      if (data?.positions && data.positions.length > 0) {
        const newPositions = data.positions.map((p: Position) => ({ 
          ...p, 
          selected: true 
        }));
        setPositions(prev => [...prev, ...newPositions]);
        
        // Track AI-generated positions for custom department as custom
        // so they're marked 'added' in learning data
        setCustomPositions(prev => {
          const updated = new Set(prev);
          data.positions.forEach((p: Position) => updated.add(p.name));
          return updated;
        });
        
        toast({
          title: 'Positions added',
          description: `Added ${newPositions.length} positions for ${dept}`,
        });
      }
    } catch (err) {
      console.error('Failed to generate positions for custom department:', err);
      // Add a default position as fallback
      setPositions(prev => [...prev, { 
        name: `${dept} Manager`, 
        department: dept, 
        selected: true 
      }]);
      toast({
        title: 'Added default position',
        description: `You can add more positions manually for ${dept}`,
        variant: 'default',
      });
    } finally {
      setIsSuggestingPositions(false);
    }
  };

  const addCustomPosition = () => {
    if (newPosition.name.trim() && newPosition.department) {
      const posName = newPosition.name.trim();
      setPositions([...positions, { 
        name: posName, 
        department: newPosition.department, 
        selected: true 
      }]);
      setCustomPositions(new Set([...customPositions, posName]));
      setNewPosition({ name: '', department: '' });
    }
  };

  const removePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  // Suggest more positions for template-based departments from templates, custom from AI
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
      
      // Separate custom departments from template departments
      const customDeptsList = Array.from(selectedDepartments).filter(d => customDepartments.has(d));
      const templateDeptsList = Array.from(selectedDepartments).filter(d => !customDepartments.has(d));
      
      let newPositions: Position[] = [];
      
      // For template departments, use the suggest-positions function (which queries templates first)
      if (templateDeptsList.length > 0) {
        const { data, error } = await supabase.functions.invoke('suggest-positions', {
          body: { 
            departments: templateDeptsList,
            existingPositions: existingPositionNames,
            industry: industry || 'General Business', 
            companySize: companySize || 'small' 
          },
        });
        
        if (!error && data?.positions) {
          newPositions = [...newPositions, ...data.positions.filter(
            (p: Position) => !existingPositionNames.includes(p.name)
          ).map((p: Position) => ({ ...p, selected: true }))];
        }
      }
      
      // For custom departments, use AI generation
      for (const dept of customDeptsList) {
        const { data, error } = await supabase.functions.invoke('suggest-custom-department-positions', {
          body: { 
            departmentName: dept,
            industry: industry || 'General Business', 
            companySize: companySize || 'small',
            existingPositions: [...existingPositionNames, ...newPositions.map(p => p.name)]
          },
        });
        
        if (!error && data?.positions) {
          const filtered = data.positions.filter(
            (p: Position) => !existingPositionNames.includes(p.name) && 
                           !newPositions.some(np => np.name === p.name)
          ).map((p: Position) => ({ ...p, selected: true }));
          newPositions = [...newPositions, ...filtered];
        }
      }

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
      // Delete ALL existing positions for this organization
      const { error: deleteError } = await supabase
        .from('positions')
        .delete()
        .eq('organization_id', organizationId);

      if (deleteError) {
        console.error('Failed to clear existing positions:', deleteError);
      }

      // Insert the user-selected positions
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

        if (error) {
          console.error('Failed to insert position:', position.name, error);
        }
      }

      // Save learning data for future template improvements
      if (industry && organizationId) {
        try {
          const { error: learningError } = await supabase.functions.invoke('save-org-structure-learning', {
            body: {
              businessCategory: industry,
              companySize: companySize || 'small',
              selectedDepartments: finalDepartments,
              selectedPositions: finalPositions.map(({ name, department }) => ({ name, department })),
              customDepartments: Array.from(customDepartments),
              customPositions: Array.from(customPositions),
              organizationId
            }
          });
          
          if (learningError) {
            console.error('Learning save error:', learningError);
          }
        } catch (err) {
          console.error('Failed to invoke learning function:', err);
        }
      }

      onSave({
        departments: finalDepartments,
        positions: finalPositions.map(({ name, department }) => ({ name, department })),
        industry,
      });
    } catch (err) {
      console.error('Failed to save positions:', err);
      setIsSubmitting(false);
    }
  };

  if (isLoadingTemplates) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <LayoutTemplate className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Loading Templates</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Fetching curated department and role templates for {industry || 'your industry'}...
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
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <CardTitle className="text-xl flex items-center gap-2">
            Departments & Roles
            <Badge variant="secondary" className="text-xs">
              <LayoutTemplate className="h-3 w-3 mr-1" />
              {templateSource === 'template' ? 'Curated' : templateSource === 'default' ? 'Default' : 'Template'}
            </Badge>
          </CardTitle>
        </div>
        <CardDescription>
          Review the suggested structure for your {industry || 'organization'} or customize it
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Refresh Banner when industry changed */}
          {showRefreshBanner && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-warning-foreground text-sm">
                <LayoutTemplate className="h-4 w-4" />
                <span>
                  Business category changed to <strong>{industry}</strong>. Load new templates?
                </span>
              </div>
              <Button 
                type="button"
                size="sm" 
                variant="outline" 
                onClick={handleRefreshTemplates}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Load Templates
              </Button>
            </div>
          )}
          
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
                  {customDepartments.has(dept) && (
                    <span className="ml-1 text-xs opacity-70">(custom)</span>
                  )}
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
                disabled={isSuggestingPositions}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addCustomDepartment}
                disabled={isSuggestingPositions || !newDepartment.trim()}
              >
                {isSuggestingPositions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isSuggestingPositions && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Generating positions for custom department...
              </p>
            )}
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
                          Suggest More
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
                    <span className="font-medium text-sm">{expandPositionName(position.name)}</span>
                    {customPositions.has(position.name) && (
                      <span className="ml-1 text-xs text-muted-foreground">(custom)</span>
                    )}
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
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting || isSaving} className="flex-1">
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
