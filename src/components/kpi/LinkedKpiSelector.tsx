import { useState } from "react";
import { Check, ChevronsUpDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAvailableParentKpis } from "@/services/useKpi";
import type { Kpi, KpiScopeType } from "@/types";

interface LinkedKpiSelectorProps {
  scopeType: KpiScopeType | undefined;
  quarter: number;
  year: number;
  selectedParentId: string | null;
  onSelect: (kpiId: string | null) => void;
  excludeKpiId?: string;
  disabled?: boolean;
}

const scopeLabels: Record<string, string> = {
  organization: "Organisation",
  department: "Department",
  office: "Office",
  project: "Project",
  individual: "Individual",
};

export function LinkedKpiSelector({
  scopeType,
  quarter,
  year,
  selectedParentId,
  onSelect,
  excludeKpiId,
  disabled = false,
}: LinkedKpiSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const { data: availableParents = [], isLoading } = useAvailableParentKpis(
    scopeType,
    quarter,
    year,
    excludeKpiId
  );

  const selectedParent = availableParents.find(k => k.id === selectedParentId);

  if (scopeType === 'organization') {
    return null; // Organization KPIs cannot have parents
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        Connect to Parent KPI
        <span className="text-xs text-muted-foreground font-normal">(optional)</span>
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled || isLoading || availableParents.length === 0}
          >
            {selectedParent ? (
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">{selectedParent.title}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {scopeLabels[selectedParent.scope_type] || selectedParent.scope_type}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">
                {availableParents.length === 0 
                  ? "No parent KPIs available" 
                  : "Select parent KPI..."}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search KPIs..." />
            <CommandList>
              <CommandEmpty>No KPIs found.</CommandEmpty>
              <CommandGroup>
                {selectedParentId && (
                  <CommandItem
                    value="__none__"
                    onSelect={() => {
                      onSelect(null);
                      setOpen(false);
                    }}
                  >
                    <span className="text-muted-foreground italic">No parent (standalone)</span>
                  </CommandItem>
                )}
                {availableParents.map((kpi) => (
                  <CommandItem
                    key={kpi.id}
                    value={kpi.title}
                    onSelect={() => {
                      onSelect(kpi.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate">{kpi.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {scopeLabels[kpi.scope_type] || kpi.scope_type}
                      </Badge>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        selectedParentId === kpi.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedParent && (
        <p className="text-xs text-muted-foreground">
          This KPI will contribute to the progress of "{selectedParent.title}"
        </p>
      )}
    </div>
  );
}
