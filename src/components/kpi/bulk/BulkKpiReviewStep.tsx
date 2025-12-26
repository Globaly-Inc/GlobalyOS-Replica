import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Globe, 
  Building, 
  MapPin, 
  Users,
  ChevronDown,
  Pencil,
  Check,
  X,
  Trash2,
  Plus,
  Rocket
} from "lucide-react";
import type { BulkKpiWizardState, GeneratedKpi } from "@/pages/BulkKpiCreate";
import { cn } from "@/lib/utils";

interface Props {
  state: BulkKpiWizardState;
  updateState: (updates: Partial<BulkKpiWizardState>) => void;
}

const UNITS = ["%", "count", "$", "hours", "days", "rating", "score", "items", "users", "leads"];

export const BulkKpiReviewStep = ({ state, updateState }: Props) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    organization: true,
    department: true,
    project: true,
    office: true,
    individual: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateKpi = (tempId: string, updates: Partial<GeneratedKpi>) => {
    const updatedKpis = state.generatedKpis.map(kpi =>
      kpi.tempId === tempId ? { ...kpi, ...updates } : kpi
    );
    updateState({ generatedKpis: updatedKpis });
  };

  const toggleKpiSelection = (tempId: string) => {
    updateKpi(tempId, { selected: !state.generatedKpis.find(k => k.tempId === tempId)?.selected });
  };

  const toggleAllInScope = (scopeType: string, selected: boolean) => {
    const updatedKpis = state.generatedKpis.map(kpi =>
      kpi.scopeType === scopeType ? { ...kpi, selected } : kpi
    );
    updateState({ generatedKpis: updatedKpis });
  };

  const deleteKpi = (tempId: string) => {
    updateState({
      generatedKpis: state.generatedKpis.filter(k => k.tempId !== tempId),
    });
  };

  const getScopeIcon = (scopeType: string) => {
    switch (scopeType) {
      case "organization": return Globe;
      case "department": return Building;
      case "project": return Rocket;
      case "office": return MapPin;
      case "individual": return Users;
      default: return Globe;
    }
  };

  const getScopeColor = (scopeType: string) => {
    switch (scopeType) {
      case "organization": return "border-l-purple-500";
      case "department": return "border-l-blue-500";
      case "project": return "border-l-pink-500";
      case "office": return "border-l-green-500";
      case "individual": return "border-l-amber-500";
      default: return "";
    }
  };

  // Group KPIs by scope type
  const groupedKpis = state.generatedKpis.reduce((acc, kpi) => {
    if (!acc[kpi.scopeType]) acc[kpi.scopeType] = [];
    acc[kpi.scopeType].push(kpi);
    return acc;
  }, {} as Record<string, GeneratedKpi[]>);

  const scopeOrder = ["organization", "department", "project", "office", "individual"];

  // Get potential parent KPIs - must include currently selected parent even if it wouldn't otherwise be in the list
  const getParentOptions = (currentKpi: GeneratedKpi) => {
    // Non-quarterly org KPIs have no parent
    if (currentKpi.scopeType === "organization" && !currentKpi.isQuarterlyChild) {
      return [];
    }
    
    let options: GeneratedKpi[] = [];
    
    // For quarterly children, include same scope type but only non-quarterly (annual) KPIs
    if (currentKpi.isQuarterlyChild) {
      options = state.generatedKpis.filter(k => 
        k.scopeType === currentKpi.scopeType && 
        !k.isQuarterlyChild && 
        k.tempId !== currentKpi.tempId
      );
    } else {
      // Regular hierarchy logic
      let parentScopes: string[] = [];
      switch (currentKpi.scopeType) {
        case "organization":
          return []; // Should not reach here due to check above
        case "department":
        case "project":
        case "office":
          parentScopes = ["organization"];
          break;
        case "individual":
          // Individuals can link to org, dept, project, office (both annual AND quarterly)
          parentScopes = ["organization", "department", "project", "office"];
          break;
      }
      
      options = state.generatedKpis.filter(k => 
        parentScopes.includes(k.scopeType) && 
        k.tempId !== currentKpi.tempId
      );
    }
    
    // Always ensure the currently selected parent is in the list (even if it wouldn't match the filter)
    if (currentKpi.parentTempId) {
      const currentParent = state.generatedKpis.find(k => k.tempId === currentKpi.parentTempId);
      if (currentParent && !options.some(o => o.tempId === currentParent.tempId)) {
        options = [currentParent, ...options];
      }
    }
    
    return options;
  };

  const selectedCount = state.generatedKpis.filter(k => k.selected).length;
  const totalCount = state.generatedKpis.length;

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                {selectedCount} / {totalCount} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allSelected = state.generatedKpis.every(k => k.selected);
                  updateState({
                    generatedKpis: state.generatedKpis.map(k => ({ ...k, selected: !allSelected })),
                  });
                }}
              >
                {state.generatedKpis.every(k => k.selected) ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Click to edit any field inline
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Groups */}
      {scopeOrder.map(scopeType => {
        const kpis = groupedKpis[scopeType];
        if (!kpis?.length) return null;

        const Icon = getScopeIcon(scopeType);
        const selectedInScope = kpis.filter(k => k.selected).length;
        const allSelected = kpis.every(k => k.selected);

        return (
          <Card key={scopeType} className={cn("border-l-4", getScopeColor(scopeType))}>
            <Collapsible 
              open={expandedSections[scopeType]} 
              onOpenChange={() => toggleSection(scopeType)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg capitalize">{scopeType} KPIs</CardTitle>
                        <CardDescription>
                          {selectedInScope} of {kpis.length} selected
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInScope(scopeType, !allSelected);
                        }}
                      >
                        {allSelected ? "Deselect" : "Select"} All
                      </Button>
                      <ChevronDown className={cn(
                        "h-5 w-5 transition-transform",
                        expandedSections[scopeType] && "rotate-180"
                      )} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="min-w-[200px]">Title</TableHead>
                          <TableHead className="min-w-[200px]">Description</TableHead>
                          {scopeType !== "organization" && (
                            <TableHead className="w-[140px]">
                              {scopeType === "individual" ? "Employee" : "Scope"}
                            </TableHead>
                          )}
                          <TableHead className="w-[100px]">Target</TableHead>
                          <TableHead className="w-[100px]">Unit</TableHead>
                          <TableHead className="w-[160px]">Parent KPI</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kpis.map(kpi => {
                          const isEditing = editingId === kpi.tempId;
                          const parentOptions = getParentOptions(kpi);
                          
                          return (
                            <TableRow 
                              key={kpi.tempId}
                              className={cn(!kpi.selected && "opacity-50")}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={kpi.selected}
                                  onCheckedChange={() => toggleKpiSelection(kpi.tempId)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={kpi.title}
                                    onChange={(e) => updateKpi(kpi.tempId, { title: e.target.value })}
                                    className="h-8 text-sm flex-1"
                                  />
                                  {kpi.quarter && (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      Q{kpi.quarter}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Textarea
                                  value={kpi.description}
                                  onChange={(e) => updateKpi(kpi.tempId, { description: e.target.value })}
                                  className="min-h-[32px] h-8 text-sm resize-none"
                                  rows={1}
                                />
                              </TableCell>
                              {scopeType !== "organization" && (
                                <TableCell>
                                  <Badge variant="outline" className="text-xs truncate max-w-[130px]">
                                    {kpi.employeeName || kpi.projectName || kpi.scopeValue || "-"}
                                  </Badge>
                                </TableCell>
                              )}
                              <TableCell>
                                <Input
                                  type="number"
                                  value={kpi.targetValue}
                                  onChange={(e) => updateKpi(kpi.tempId, { targetValue: parseFloat(e.target.value) || 0 })}
                                  className="h-8 text-sm w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={kpi.unit}
                                  onValueChange={(v) => updateKpi(kpi.tempId, { unit: v })}
                                >
                                  <SelectTrigger className="h-8 text-sm w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UNITS.map(u => (
                                      <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {parentOptions.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <Select
                                      value={kpi.parentTempId || "none"}
                                      onValueChange={(v) => updateKpi(kpi.tempId, { 
                                        parentTempId: v === "none" ? undefined : v 
                                      })}
                                    >
                                      <SelectTrigger className="h-8 text-sm flex-1">
                                        <SelectValue placeholder="None" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {parentOptions.map(p => (
                                          <SelectItem key={p.tempId} value={p.tempId}>
                                            {p.title.slice(0, 25)}...
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {!kpi.parentTempId && (kpi.scopeType !== 'organization' || kpi.isQuarterlyChild) && (
                                      <Badge variant="destructive" className="text-xs shrink-0">
                                        Missing
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteKpi(kpi.tempId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Empty State */}
      {state.generatedKpis.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No KPIs to review. Go back to generate KPIs first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
