import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, LogIn, LogOut, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRScannerDialog = ({ open, onOpenChange }: QRScannerDialogProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [action, setAction] = useState<"check_in" | "check_out" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setAction(null);
      setResult(null);
      setIsScanning(false);
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

  const startScanner = async (selectedAction: "check_in" | "check_out") => {
    setAction(selectedAction);
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
          await handleScan(decodedText, selectedAction);
        },
        () => {} // Ignore scan failures
      );
    } catch (error: any) {
      console.error("Error starting scanner:", error);
      setIsScanning(false);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const handleScan = async (qrCode: string, scanAction: "check_in" | "check_out") => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("validate_qr_and_record_attendance", {
        _qr_code: qrCode,
        _action: scanAction,
      });

      if (error) throw error;

      const response = data as { success: boolean; message?: string; error?: string; status?: string };
      
      if (response.success) {
        setResult({ 
          success: true, 
          message: response.message || (scanAction === "check_in" ? "Checked in successfully!" : "Checked out successfully!")
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
    setAction(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Quick Attendance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isScanning && !result && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => startScanner("check_in")}
                className="h-24 flex flex-col gap-2"
                variant="outline"
              >
                <LogIn className="h-8 w-8 text-green-600" />
                <span>Check In</span>
              </Button>
              <Button
                onClick={() => startScanner("check_out")}
                className="h-24 flex flex-col gap-2"
                variant="outline"
              >
                <LogOut className="h-8 w-8 text-blue-600" />
                <span>Check Out</span>
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <div 
                id="qr-reader" 
                ref={scannerContainerRef}
                className="w-full aspect-square rounded-lg overflow-hidden bg-muted"
              />
              <p className="text-sm text-center text-muted-foreground">
                Point your camera at the QR code to {action === "check_in" ? "check in" : "check out"}
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
