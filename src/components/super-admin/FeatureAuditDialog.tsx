import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { MASTER_FEATURE_REGISTRY, CORE_FEATURES, FLAGGED_FEATURES, REGISTERED_FLAG_NAMES } from "@/constants/features";

function runAudit() {
  const coreFeatures = CORE_FEATURES;
  const registeredFeatures = FLAGGED_FEATURES.filter((f) => REGISTERED_FLAG_NAMES.includes(f.name));
  const missingFeatures = FLAGGED_FEATURES.filter((f) => !REGISTERED_FLAG_NAMES.includes(f.name));

  // Check if there are entries in REGISTERED_FLAG_NAMES not in the registry
  const unknownFlags = REGISTERED_FLAG_NAMES.filter(
    (name) => !MASTER_FEATURE_REGISTRY.some((f) => f.name === name)
  );

  return { coreFeatures, registeredFeatures, missingFeatures, unknownFlags };
}

interface FeatureAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeatureAuditDialog = ({ open, onOpenChange }: FeatureAuditDialogProps) => {
  const [activeTab, setActiveTab] = useState("summary");
  const audit = runAudit();

  const totalFeatures = MASTER_FEATURE_REGISTRY.length;
  const hasMissing = audit.missingFeatures.length > 0 || audit.unknownFlags.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Feature Audit Report
          </DialogTitle>
          <DialogDescription>
            Comparing master feature registry ({totalFeatures} features) against registered feature flags ({REGISTERED_FLAG_NAMES.length} flags)
          </DialogDescription>
        </DialogHeader>

        {/* Summary Banner */}
        <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${hasMissing ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
          {hasMissing ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {audit.missingFeatures.length} missing feature(s) and {audit.unknownFlags.length} unregistered flag(s) detected
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All features are properly registered. No gaps found.
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              Core ({audit.coreFeatures.length})
            </TabsTrigger>
            <TabsTrigger value="registered" className="flex-1">
              Registered ({audit.registeredFeatures.length})
            </TabsTrigger>
            <TabsTrigger value="missing" className="flex-1">
              Missing ({audit.missingFeatures.length + audit.unknownFlags.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="max-h-[400px] overflow-y-auto space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Always-on features that don't require feature flags. Available to all organizations by default.
            </p>
            {audit.coreFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">Always On</Badge>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="registered" className="max-h-[400px] overflow-y-auto space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Features controlled by Super Admin feature flags. These can be enabled/disabled per organization.
            </p>
            {audit.registeredFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Registered</span>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="missing" className="max-h-[400px] overflow-y-auto space-y-2">
            {audit.missingFeatures.length === 0 && audit.unknownFlags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
                <p className="text-sm font-medium">No missing features</p>
                <p className="text-xs">All implemented features are properly registered.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Features that exist in the system but are not in the feature flags list.
                </p>
                {audit.missingFeatures.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.name} className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10">
                        <Icon className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{f.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-[10px] text-destructive font-medium">Missing</span>
                      </div>
                    </div>
                  );
                })}
                {audit.unknownFlags.map((name) => (
                  <div key={name} className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">Flag registered but not in master feature registry</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 shrink-0">Unknown</Badge>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
