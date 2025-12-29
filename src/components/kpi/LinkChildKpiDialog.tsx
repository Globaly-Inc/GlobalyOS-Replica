import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, Target, User, Building, MapPin, FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useLinkKpi } from "@/services/useKpi";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types";

interface LinkChildKpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentKpi: Kpi;
}

const scopeIcons: Record<string, React.ElementType> = {
  organization: Target,
  department: Building,
  office: MapPin,
  project: FolderKanban,
  individual: User,
};

export function LinkChildKpiDialog({ open, onOpenChange, parentKpi }: LinkChildKpiDialogProps) {
  const { currentOrg } = useOrganization();
  const linkKpi = useLinkKpi();
  
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [weight, setWeight] = useState("1.0");

  // Fetch available KPIs that can be linked as children
  const { data: availableKpis = [], isLoading } = useQuery({
    queryKey: ['available-child-kpis', currentOrg?.id, parentKpi.id, parentKpi.quarter, parentKpi.year],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kpis')
        .select(`
          id, title, scope_type, current_value, target_value, status,
          employee:employees!kpis_employee_id_fkey(
            id,
            profiles!inner(full_name)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('quarter', parentKpi.quarter)
        .eq('year', parentKpi.year)
        .is('parent_kpi_id', null) // Only orphan KPIs
        .neq('id', parentKpi.id) // Exclude self
        .order('title');

      if (error) throw error;

      // Filter based on hierarchy rules
      return (data || []).filter((kpi: any) => {
        // Organization KPIs can have group and individual children
        if (parentKpi.scope_type === 'organization') {
          return kpi.scope_type !== 'organization';
        }
        // Group KPIs can only have individual children
        if (['department', 'office', 'project'].includes(parentKpi.scope_type || '')) {
          return kpi.scope_type === 'individual';
        }
        return false;
      });
    },
    enabled: open && !!currentOrg?.id,
  });

  const selectedKpi = availableKpis.find((k: any) => k.id === selectedKpiId);

  const handleLink = async () => {
    if (!selectedKpiId) return;

    await linkKpi.mutateAsync({
      kpiId: selectedKpiId,
      parentKpiId: parentKpi.id,
      parentTitle: parentKpi.title,
      weight: parseFloat(weight) || 1.0,
    });

    setSelectedKpiId(null);
    setWeight("1.0");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Child KPI</DialogTitle>
          <DialogDescription>
            Select a KPI to link as a child of "{parentKpi.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select KPI</Label>
            <Command className="border rounded-md">
              <CommandInput placeholder="Search KPIs..." />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>
                  {isLoading ? "Loading..." : "No available KPIs found"}
                </CommandEmpty>
                <CommandGroup>
                  {availableKpis.map((kpi: any) => {
                    const Icon = scopeIcons[kpi.scope_type] || Target;
                    return (
                      <CommandItem
                        key={kpi.id}
                        value={kpi.title}
                        onSelect={() => setSelectedKpiId(kpi.id)}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{kpi.title}</div>
                          {kpi.employee?.profiles?.full_name && (
                            <div className="text-xs text-muted-foreground">
                              {kpi.employee.profiles.full_name}
                            </div>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedKpiId === kpi.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {selectedKpi && (
            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="text-sm font-medium">{selectedKpi.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Progress: {selectedKpi.current_value ?? 0} / {selectedKpi.target_value ?? 0}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="weight">Contribution Weight</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="1.0"
            />
            <p className="text-xs text-muted-foreground">
              Higher weight = greater contribution to parent's aggregated progress
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedKpiId || linkKpi.isPending}
          >
            {linkKpi.isPending ? "Linking..." : "Link KPI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
