import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useUpdateAssetHandover, useAddAssetHandover } from "@/services/useWorkflows";
import type { AssetHandover, AssetCategory, AssetStatus } from "@/types/workflow";
import { format } from "date-fns";
import {
  Package,
  Laptop,
  Key,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";

interface AssetHandoverListProps {
  assets: AssetHandover[];
  employeeId: string;
  workflowId?: string;
  canEdit?: boolean;
}

const categoryIcons: Record<AssetCategory, React.ElementType> = {
  hardware: Laptop,
  software: Package,
  access: Key,
  documents: FileText,
  other: MoreHorizontal,
};

const categoryLabels: Record<AssetCategory, string> = {
  hardware: "Hardware",
  software: "Software/Licenses",
  access: "Access Cards/Keys",
  documents: "Documents",
  other: "Other",
};

const statusConfig: Record<AssetStatus, { label: string; color: string; icon: React.ElementType }> = {
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Package },
  returned: { label: "Returned", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  damaged: { label: "Damaged", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: AlertTriangle },
  missing: { label: "Missing", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

export function AssetHandoverList({ assets, employeeId, workflowId, canEdit = false }: AssetHandoverListProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    assetName: "",
    assetId: "",
    category: "hardware" as AssetCategory,
  });

  const updateAsset = useUpdateAssetHandover();
  const addAsset = useAddAssetHandover();

  const handleStatusChange = (assetId: string, newStatus: AssetStatus) => {
    updateAsset.mutate({ id: assetId, status: newStatus });
  };

  const handleAddAsset = () => {
    if (!newAsset.assetName) return;
    
    addAsset.mutate({
      employeeId,
      workflowId,
      assetName: newAsset.assetName,
      assetId: newAsset.assetId || undefined,
      category: newAsset.category,
    }, {
      onSuccess: () => {
        setAddDialogOpen(false);
        setNewAsset({ assetName: "", assetId: "", category: "hardware" });
      },
    });
  };

  // Group by category
  const assetsByCategory = assets.reduce((acc, asset) => {
    const category = asset.category as AssetCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(asset);
    return acc;
  }, {} as Record<AssetCategory, AssetHandover[]>);

  const returnedCount = assets.filter((a) => a.status === "returned").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Asset Handover
            </CardTitle>
            <CardDescription>
              Track equipment and assets to be returned
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {returnedCount}/{assets.length} returned
            </Badge>
            {canEdit && (
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Asset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No assets to track</p>
            {canEdit && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                Add First Asset
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
              const CategoryIcon = categoryIcons[category as AssetCategory] || Package;
              
              return (
                <div key={category}>
                  <h4 className="flex items-center gap-2 font-medium mb-3">
                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    {categoryLabels[category as AssetCategory]}
                  </h4>
                  <div className="space-y-2">
                    {categoryAssets.map((asset) => {
                      const StatusIcon = statusConfig[asset.status].icon;
                      
                      return (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{asset.asset_name}</span>
                              {asset.asset_id && (
                                <span className="text-xs text-muted-foreground">
                                  ({asset.asset_id})
                                </span>
                              )}
                            </div>
                            {asset.returned_date && (
                              <p className="text-xs text-muted-foreground">
                                Returned on {format(new Date(asset.returned_date), "MMM d, yyyy")}
                              </p>
                            )}
                            {asset.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{asset.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {canEdit && asset.status !== "returned" ? (
                              <Select
                                value={asset.status}
                                onValueChange={(v) => handleStatusChange(asset.id, v as AssetStatus)}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="assigned">Assigned</SelectItem>
                                  <SelectItem value="returned">Returned</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="missing">Missing</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={statusConfig[asset.status].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[asset.status].label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Asset Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assetName">Asset Name</Label>
              <Input
                id="assetName"
                placeholder="e.g., MacBook Pro, Office Keys"
                value={newAsset.assetName}
                onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetId">Asset ID / Serial Number (Optional)</Label>
              <Input
                id="assetId"
                placeholder="e.g., SN-12345"
                value={newAsset.assetId}
                onChange={(e) => setNewAsset({ ...newAsset, assetId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newAsset.category}
                onValueChange={(v) => setNewAsset({ ...newAsset, category: v as AssetCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAsset} disabled={!newAsset.assetName || addAsset.isPending}>
              {addAsset.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
