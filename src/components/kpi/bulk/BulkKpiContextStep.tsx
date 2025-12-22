import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Globe, 
  Building, 
  MapPin, 
  Users, 
  Upload, 
  FileText, 
  ChevronDown,
  X,
  Sparkles,
  Calendar,
  CalendarDays,
  Rocket,
  FileSpreadsheet,
  File,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import type { BulkKpiWizardState } from "@/pages/BulkKpiCreate";

interface Props {
  state: BulkKpiWizardState;
  updateState: (updates: Partial<BulkKpiWizardState>) => void;
}

const quarters = [1, 2, 3, 4];
const years = [2024, 2025, 2026];

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv'];
const TEXT_EXTENSIONS = ['.txt', '.md'];

const getFileIcon = (fileName: string) => {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return <File className="h-8 w-8 text-red-500" />;
    case 'docx':
    case 'doc':
      return <FileText className="h-8 w-8 text-blue-500" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    default:
      return <FileText className="h-8 w-8 text-primary" />;
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const BulkKpiContextStep = ({ state, updateState }: Props) => {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isParsingDocument, setIsParsingDocument] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from("employees")
        .select("department")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .not("department", "is", null);
      const unique = [...new Set(data?.map(e => e.department).filter(Boolean))];
      return unique.sort();
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch offices
  const { data: offices = [] } = useQuery({
    queryKey: ["offices", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-kpi", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from("employees")
        .select("id, department, office_id, position, profiles(full_name)")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .order("profiles(full_name)");
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const handleFileUpload = useCallback(async (file: File) => {
    const ext = '.' + file.name.toLowerCase().split('.').pop();
    const isSupported = SUPPORTED_EXTENSIONS.includes(ext);
    
    if (!isSupported) {
      toast({
        title: "Unsupported file type",
        description: `Please upload a supported file: ${SUPPORTED_EXTENSIONS.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    try {
      const isTextFile = TEXT_EXTENSIONS.includes(ext);
      
      if (isTextFile) {
        // Direct text reading for simple files
        const text = await file.text();
        updateState({ 
          documentContent: text,
          documentName: file.name 
        });
      } else {
        // Use edge function for binary documents
        setIsParsingDocument(true);
        const base64 = await fileToBase64(file);
        
        const { data, error } = await supabase.functions.invoke('parse-document-content', {
          body: { 
            fileContent: base64, 
            fileName: file.name,
            mimeType: file.type 
          }
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        updateState({ 
          documentContent: data.text,
          documentName: file.name 
        });
        
        toast({
          title: "Document parsed successfully",
          description: `Extracted ${data.characterCount?.toLocaleString() || data.text?.length?.toLocaleString()} characters from ${file.name}`
        });
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Failed to parse document",
        description: error instanceof Error ? error.message : "Please try a different file format",
        variant: "destructive"
      });
    } finally {
      setIsParsingDocument(false);
    }
  }, [updateState, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = '.' + file.name.toLowerCase().split('.').pop();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        handleFileUpload(file);
      } else {
        toast({
          title: "Unsupported file type",
          description: `Please upload a supported file: ${SUPPORTED_EXTENSIONS.join(', ')}`,
          variant: "destructive"
        });
      }
    }
  }, [handleFileUpload, toast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const toggleCascade = (key: keyof typeof state.cascadeConfig) => {
    updateState({
      cascadeConfig: {
        ...state.cascadeConfig,
        [key]: !state.cascadeConfig[key],
      },
    });
  };

  const toggleDepartment = (dept: string) => {
    const current = state.targetDepartments;
    updateState({
      targetDepartments: current.includes(dept)
        ? current.filter(d => d !== dept)
        : [...current, dept],
    });
  };

  const toggleOffice = (officeId: string) => {
    const current = state.targetOffices;
    updateState({
      targetOffices: current.includes(officeId)
        ? current.filter(o => o !== officeId)
        : [...current, officeId],
    });
  };

  const toggleProject = (projectId: string) => {
    const current = state.targetProjects;
    updateState({
      targetProjects: current.includes(projectId)
        ? current.filter(p => p !== projectId)
        : [...current, projectId],
    });
  };

  const cascadeLevels = [
    { key: "includeOrganization" as const, icon: Globe, label: "Organization", description: "Company-wide strategic KPIs" },
    { key: "includeDepartments" as const, icon: Building, label: "Departments", description: "Team-level KPIs" },
    { key: "includeProjects" as const, icon: Rocket, label: "Projects", description: "Product/Project KPIs" },
    { key: "includeOffices" as const, icon: MapPin, label: "Offices", description: "Location-based KPIs" },
    { key: "includeIndividuals" as const, icon: Users, label: "Individuals", description: "Personal KPIs for team members" },
  ];

  const selectedFiltersCount = state.targetDepartments.length + state.targetProjects.length + state.targetOffices.length + state.targetEmployees.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Period & Cascade */}
      <div className="space-y-6">
        {/* Period Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time Period</CardTitle>
            <CardDescription>Select the period type and timeframe for KPIs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period Type Toggle */}
            <div>
              <Label className="mb-2 block">Period Type</Label>
              <ToggleGroup 
                type="single" 
                value={state.periodType}
                onValueChange={(value) => {
                  if (value) updateState({ periodType: value as "annual" | "quarterly" });
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="annual" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Annual
                </ToggleGroupItem>
                <ToggleGroupItem value="quarterly" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Quarterly
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex gap-4">
              {/* Quarter Selector - Only show for quarterly */}
              {state.periodType === "quarterly" && (
                <div className="flex-1">
                  <Label>Quarter</Label>
                  <Select
                    value={state.quarter.toString()}
                    onValueChange={(v) => updateState({ quarter: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map(q => (
                        <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex-1">
                <Label>Year</Label>
                <Select
                  value={state.year.toString()}
                  onValueChange={(v) => updateState({ year: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quarterly Breakdown Toggle - Only show for Annual */}
            {state.periodType === "annual" && (
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors mt-4
                  ${state.quarterlyBreakdown ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${state.quarterlyBreakdown ? 'bg-primary/10' : 'bg-muted'}`}>
                    <CalendarDays className={`h-4 w-4 ${state.quarterlyBreakdown ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Quarterly Breakdown</p>
                    <p className="text-xs text-muted-foreground">AI will distribute annual targets across Q1-Q4</p>
                  </div>
                </div>
                <Switch
                  checked={state.quarterlyBreakdown}
                  onCheckedChange={(checked) => updateState({ quarterlyBreakdown: checked })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cascade Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KPI Cascade Levels</CardTitle>
            <CardDescription>Choose which levels to generate KPIs for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cascadeLevels.map(({ key, icon: Icon, label, description }) => (
              <div 
                key={key}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors
                  ${state.cascadeConfig[key] ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${state.cascadeConfig[key] ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-4 w-4 ${state.cascadeConfig[key] ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={state.cascadeConfig[key]}
                  onCheckedChange={() => toggleCascade(key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Target Filters
                      {selectedFiltersCount > 0 && (
                        <Badge variant="secondary">{selectedFiltersCount} selected</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Optional: Limit KPI generation to specific teams</CardDescription>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                {/* Departments */}
                {state.cascadeConfig.includeDepartments && departments.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Departments</Label>
                    <div className="flex flex-wrap gap-2">
                      {departments.map(dept => (
                        <Badge
                          key={dept}
                          variant={state.targetDepartments.includes(dept) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleDepartment(dept)}
                        >
                          {dept}
                        </Badge>
                      ))}
                    </div>
                    {state.targetDepartments.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">All departments included</p>
                    )}
                  </div>
                )}

                {/* Projects */}
                {state.cascadeConfig.includeProjects && projects.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Projects</Label>
                    <div className="flex flex-wrap gap-2">
                      {projects.map(project => (
                        <Badge
                          key={project.id}
                          variant={state.targetProjects.includes(project.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleProject(project.id)}
                        >
                          {project.name}
                        </Badge>
                      ))}
                    </div>
                    {state.targetProjects.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">All projects included</p>
                    )}
                  </div>
                )}

                {/* Offices */}
                {state.cascadeConfig.includeOffices && offices.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Offices</Label>
                    <div className="flex flex-wrap gap-2">
                      {offices.map(office => (
                        <Badge
                          key={office.id}
                          variant={state.targetOffices.includes(office.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleOffice(office.id)}
                        >
                          {office.name}
                        </Badge>
                      ))}
                    </div>
                    {state.targetOffices.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">All offices included</p>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Right Column - AI Instructions & Document Upload */}
      <div className="space-y-6">
        {/* AI Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 ai-gradient-icon" />
              AI Instructions
            </CardTitle>
            <CardDescription>
              Provide context or specific instructions for the AI when generating KPIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="E.g., Focus on customer acquisition metrics, prioritize growth goals, generate KPIs aligned with our sustainability initiatives, emphasize team collaboration..."
              value={state.aiInstructions}
              onChange={(e) => updateState({ aiInstructions: e.target.value })}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Reference Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Reference Documents
            </CardTitle>
            <CardDescription>
              Upload strategy documents, OKRs, or business plans to generate context-aware KPIs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                ${state.documentContent ? 'bg-muted/50' : ''}
                ${isParsingDocument ? 'pointer-events-none opacity-70' : ''}`}
            >
              {isParsingDocument ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                  <p className="text-sm font-medium">Parsing document...</p>
                  <p className="text-xs text-muted-foreground">
                    Extracting text content
                  </p>
                </div>
              ) : state.documentContent ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    {getFileIcon(state.documentName || '')}
                    <div className="text-left">
                      <p className="font-medium">{state.documentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {state.documentContent.length.toLocaleString()} characters extracted
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateState({ documentContent: "", documentName: "" })}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-1">Drop your document here</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports: TXT, MD, PDF, DOCX, XLSX, CSV
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".txt,.md,.pdf,.docx,.doc,.xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <Button variant="outline" asChild disabled={isParsingDocument}>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Browse Files
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>

            {/* Preview */}
            {state.documentContent && (
              <div className="space-y-2">
                <Label>Document Preview</Label>
                <div className="bg-muted rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {state.documentContent.slice(0, 2000)}
                    {state.documentContent.length > 2000 && "..."}
                  </pre>
                </div>
              </div>
            )}

            {!state.documentContent && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Tip:</strong> While optional, uploading a strategy document helps AI generate 
                  more relevant and aligned KPIs based on your organization's actual goals.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
