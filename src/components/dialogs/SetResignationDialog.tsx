import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProrationPreview } from "@/services/useWorkflows";
import { AlertTriangle, Calendar, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface SetResignationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export function SetResignationDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: SetResignationDialogProps) {
  const { toast } = useToast();
  const [lastWorkingDay, setLastWorkingDay] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Get proration preview
  const { data: prorationPreview, isLoading: previewLoading } = useProrationPreview(
    employeeId,
    lastWorkingDay || undefined
  );

  const hasExceededLeave = prorationPreview?.some((p) => p.exceeded);

  const handleSubmit = async () => {
    if (!lastWorkingDay) {
      toast({
        title: "Date required",
        description: "Please select a last working day",
        variant: "destructive",
      });
      return;
    }

    if (hasExceededLeave) {
      toast({
        title: "Cannot set resignation",
        description: "Employee has exceeded prorated leave entitlement. Please resolve before proceeding.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ last_working_day: lastWorkingDay })
        .eq("id", employeeId);

      if (error) throw error;

      toast({
        title: "Resignation date set",
        description: `Last working day set to ${format(new Date(lastWorkingDay), "PPP")}. Offboarding workflow has been created.`,
      });
      onSuccess?.();
      onOpenChange(false);
      setLastWorkingDay("");
    } catch (err: any) {
      // Parse the error message from the database trigger
      const errorMessage = err.message || "Failed to set resignation date";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Set Resignation Date
          </DialogTitle>
          <DialogDescription>
            Set the last working day for {employeeName}. This will:
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Prorate leave balances based on months worked</li>
              <li>• Create an offboarding workflow with tasks</li>
              <li>• Schedule exit interview and asset handover</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lastWorkingDay">Last Working Day</Label>
            <Input
              id="lastWorkingDay"
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
              min={minDate}
            />
          </div>

          {lastWorkingDay && (
            <div className="space-y-3">
              <Label>Leave Balance Proration Preview</Label>
              
              {previewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : prorationPreview && prorationPreview.length > 0 ? (
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-3 space-y-3">
                    {prorationPreview.map((item) => (
                      <div
                        key={item.leaveTypeId}
                        className={`p-3 rounded-lg border ${
                          item.exceeded
                            ? "border-destructive/50 bg-destructive/5"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{item.leaveTypeName}</span>
                          {item.exceeded ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Exceeded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div>
                            <div className="text-xs opacity-70">Entitled</div>
                            <div>{item.defaultDays} → {item.proratedDays} days</div>
                          </div>
                          <div>
                            <div className="text-xs opacity-70">Used</div>
                            <div>{item.usedDays} days</div>
                          </div>
                          <div>
                            <div className="text-xs opacity-70">Balance</div>
                            <div className={item.exceeded ? "text-destructive font-medium" : ""}>
                              {item.exceeded ? `-${item.exceededBy}` : item.newBalance} days
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">No leave balances found for current year.</p>
              )}

              {hasExceededLeave && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Employee has used more leave than prorated entitlement allows. 
                    Either adjust the last working day or manually adjust leave balances before proceeding.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !lastWorkingDay || hasExceededLeave}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Set Resignation Date
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
