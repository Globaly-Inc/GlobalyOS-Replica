import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "@/hooks/useAuth";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRScannerDialog = ({ open, onOpenChange }: QRScannerDialogProps) => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentAction, setCurrentAction] = useState<"check_in" | "check_out">("check_in");
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Determine current action based on today's attendance
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      if (!open || !user?.id) return;
      
      setLoading(true);
      try {
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!employee) {
          setLoading(false);
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Get all sessions for today to count them
        const { data: todaySessions } = await supabase
          .from("attendance_records")
          .select("id, check_in_time, check_out_time")
          .eq("employee_id", employee.id)
          .eq("date", today)
          .order("check_in_time", { ascending: false });

        const sessions = todaySessions || [];
        setSessionCount(sessions.length);

        // Find any active session (checked in but not out)
        const activeSession = sessions.find(s => s.check_out_time === null);

        // If there's an active session, next action is check_out
        if (activeSession) {
          setCurrentAction("check_out");
        } else {
          setCurrentAction("check_in");
        }
      } catch (error) {
        console.error("Error fetching attendance status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceStatus();
  }, [open, user?.id]);

  // Auto-start scanner when dialog opens
  useEffect(() => {
    if (open && !loading && !result) {
      startScanner();
    }
  }, [open, loading, currentAction]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setResult(null);
      setIsScanning(false);
      setLoading(true);
    }
  }, [open]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    if (isScanning || result) return;
    
    setIsScanning(true);
    setResult(null);

    // Wait for container to be in DOM
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await stopScanner();
          setIsScanning(false);
          await handleScan(decodedText);
        },
        () => {} // Ignore scan failures
      );
    } catch (error: any) {
      console.error("Error starting scanner:", error);
      setIsScanning(false);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const handleScan = async (qrCode: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("validate_qr_and_record_attendance", {
        _qr_code: qrCode,
        _action: currentAction,
      });

      if (error) throw error;

      const response = data as { success: boolean; message?: string; error?: string; status?: string };
      
      if (response.success) {
        setResult({ 
          success: true, 
          message: response.message || (currentAction === "check_in" ? "Checked in successfully!" : "Checked out successfully!")
        });
        toast.success(response.message || "Success!");
      } else {
        setResult({ success: false, message: response.error || "Failed to record attendance" });
        toast.error(response.error || "Failed to record attendance");
      }
    } catch (error: any) {
      console.error("Error recording attendance:", error);
      setResult({ success: false, message: error.message || "An error occurred" });
      toast.error(error.message || "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    await stopScanner();
    setIsScanning(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {currentAction === "check_in" ? "Check In" : "Check Out"}
            </span>
            {currentAction === "check_in" && sessionCount < 3 && (
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                Session {sessionCount + 1}/3
              </span>
            )}
            {currentAction === "check_out" && (
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                Session {sessionCount}/3
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Checking status...</p>
            </div>
          )}

          {!loading && isScanning && !result && (
            <div className="space-y-4">
              <div 
                id="qr-reader" 
                ref={scannerContainerRef}
                className="w-full aspect-square rounded-lg overflow-hidden bg-muted"
              />
              <p className="text-sm text-center text-muted-foreground">
                Point your camera at the QR code to {currentAction === "check_in" ? "check in" : "check out"}
              </p>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            </div>
          )}

          {processing && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Recording attendance...</p>
            </div>
          )}

          {result && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              {result.success ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
              <p className={`text-center font-medium ${result.success ? "text-green-600" : "text-destructive"}`}>
                {result.message}
              </p>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
