import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, CheckCircle2, XCircle, MapPin, AlertTriangle, Clock, WifiOff, TimerOff } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getLocation, getLocationErrorTitle, getLocationErrorInstructions, type LocationErrorType } from "@/utils/geolocation";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LocationStatus = "pending" | "granted" | "denied" | "unavailable" | "timeout";

export const QRScannerDialog = ({ open, onOpenChange }: QRScannerDialogProps) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentAction, setCurrentAction] = useState<"check_in" | "check_out">("check_in");
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);
  const [maxSessions, setMaxSessions] = useState(3);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("pending");
  const [locationErrorType, setLocationErrorType] = useState<LocationErrorType | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [employeeSchedule, setEmployeeSchedule] = useState<{ work_end_time: string } | null>(null);
  const [showEarlyCheckoutWarning, setShowEarlyCheckoutWarning] = useState(false);
  const [pendingQrCode, setPendingQrCode] = useState<string | null>(null);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("");
  const [earlyCheckoutReasonRequired, setEarlyCheckoutReasonRequired] = useState(true);
  const [retryingLocation, setRetryingLocation] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Request location permission using the improved utility
  useEffect(() => {
    if (!open) return;

    const requestLocation = async () => {
      const locationResult = await getLocation();

      if (locationResult.success && locationResult.coords) {
        setUserLocation(locationResult.coords);
        setLocationStatus("granted");
      } else {
        console.error("Location error:", locationResult.errorMessage);
        setLocationErrorType(locationResult.error || null);
        if (locationResult.error === 'permission_denied') {
          setLocationStatus("denied");
        } else if (locationResult.error === 'timeout') {
          setLocationStatus("timeout");
        } else {
          setLocationStatus("unavailable");
        }
      }
    };

    requestLocation();
  }, [open]);

  // Determine current action based on today's attendance and fetch schedule + org settings
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      if (!open || !user?.id) return;
      
      setLoading(true);
      try {
        const { data: employee } = await supabase
          .from("employees")
          .select("id, organization_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!employee) {
          setLoading(false);
          return;
        }

        // Fetch organization settings
        const { data: orgSettings } = await supabase
          .from("organizations")
          .select("max_sessions_per_day, early_checkout_reason_required")
          .eq("id", employee.organization_id)
          .single();

        if (orgSettings) {
          setMaxSessions(orgSettings.max_sessions_per_day ?? 3);
          setEarlyCheckoutReasonRequired(orgSettings.early_checkout_reason_required ?? true);
        }

        // Fetch employee schedule
        const { data: schedule } = await supabase
          .from("employee_schedules")
          .select("work_end_time")
          .eq("employee_id", employee.id)
          .maybeSingle();

        if (schedule) {
          setEmployeeSchedule(schedule);
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

  // Auto-start scanner when dialog opens and location is ready
  useEffect(() => {
    if (open && !loading && !result && (locationStatus === "granted" || locationStatus === "unavailable" || locationStatus === "timeout")) {
      startScanner();
    }
  }, [open, loading, currentAction, locationStatus]);

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
      setLocationStatus("pending");
      setLocationErrorType(null);
      setUserLocation(null);
      setEmployeeSchedule(null);
      setShowEarlyCheckoutWarning(false);
      setPendingQrCode(null);
      setEarlyCheckoutReason("");
      setRetryingLocation(false);
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

  const checkIsEarlyCheckout = () => {
    if (!employeeSchedule?.work_end_time) return false;
    const now = new Date();
    const [endHours, endMinutes] = employeeSchedule.work_end_time.split(':').map(Number);
    const workEndTime = new Date();
    workEndTime.setHours(endHours, endMinutes, 0, 0);
    return now < workEndTime;
  };

  const handleScan = async (qrCode: string) => {
    // Check for early checkout
    if (currentAction === "check_out" && checkIsEarlyCheckout()) {
      setPendingQrCode(qrCode);
      setShowEarlyCheckoutWarning(true);
      return;
    }

    await processCheckout(qrCode);
  };

  const processCheckout = async (qrCode: string, reason?: string) => {
    setProcessing(true);
    try {
      // Include location and early checkout reason in the RPC call
      const { data, error } = await supabase.rpc("validate_qr_and_record_attendance", {
        _qr_code: qrCode,
        _action: currentAction,
        _user_latitude: userLocation?.latitude ?? null,
        _user_longitude: userLocation?.longitude ?? null,
        _early_checkout_reason: reason || null,
      });

      if (error) throw error;

      const response = data as { 
        success: boolean; 
        message?: string; 
        error?: string; 
        status?: string;
        distance?: number;
        required_radius?: number;
      };
      
      if (response.success) {
        setResult({ 
          success: true, 
          message: response.message || (currentAction === "check_in" ? "Checked in successfully!" : "Checked out successfully!")
        });
        toast.success(response.message || "Success!");
      } else {
        let errorMessage = response.error || "Failed to record attendance";
        
        // Add distance info if available
        if (response.distance && response.required_radius) {
          errorMessage = `${errorMessage}\n(Distance: ${response.distance}m, Required: within ${response.required_radius}m)`;
        }
        
        setResult({ success: false, message: errorMessage });
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

  const handleProceedWithEarlyCheckout = async () => {
    if (earlyCheckoutReasonRequired && !earlyCheckoutReason.trim()) {
      toast.error("Please provide a reason for early checkout");
      return;
    }
    setShowEarlyCheckoutWarning(false);
    if (pendingQrCode) {
      await processCheckout(pendingQrCode, earlyCheckoutReason.trim() || undefined);
      setPendingQrCode(null);
      setEarlyCheckoutReason("");
    }
  };

  const handleCancelEarlyCheckout = () => {
    setShowEarlyCheckoutWarning(false);
    setPendingQrCode(null);
    setEarlyCheckoutReason("");
    // Restart scanner
    startScanner();
  };

  const handleCancel = async () => {
    await stopScanner();
    setIsScanning(false);
    onOpenChange(false);
  };

  const handleRetryLocation = async () => {
    setRetryingLocation(true);
    setLocationStatus("pending");
    setLocationErrorType(null);

    const locationResult = await getLocation();

    if (locationResult.success && locationResult.coords) {
      setUserLocation(locationResult.coords);
      setLocationStatus("granted");
    } else {
      setLocationErrorType(locationResult.error || null);
      if (locationResult.error === 'permission_denied') {
        setLocationStatus("denied");
      } else if (locationResult.error === 'timeout') {
        setLocationStatus("timeout");
      } else {
        setLocationStatus("unavailable");
      }
    }

    setRetryingLocation(false);
  };

  const getLocationErrorIcon = () => {
    switch (locationStatus) {
      case "denied":
        return <AlertTriangle className="h-12 w-12 text-amber-500" />;
      case "unavailable":
        return <WifiOff className="h-12 w-12 text-amber-500" />;
      case "timeout":
        return <TimerOff className="h-12 w-12 text-amber-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-amber-500" />;
    }
  };

  const showLocationError = locationStatus === "denied";
  const canProceedWithScanner = locationStatus === "granted" || locationStatus === "unavailable" || locationStatus === "timeout";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {currentAction === "check_in" ? "Check In" : "Check Out"}
              </span>
              {currentAction === "check_in" && sessionCount < maxSessions && (
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                  Session {sessionCount + 1}/{maxSessions}
                </span>
              )}
              {currentAction === "check_out" && (
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                  Session {sessionCount}/{maxSessions}
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

            {!loading && locationStatus === "pending" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <MapPin className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-muted-foreground text-center">
                  {retryingLocation ? "Retrying location..." : "Getting your location..."}
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  This may take a few seconds
                </p>
              </div>
            )}

            {!loading && showLocationError && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                {getLocationErrorIcon()}
                <p className="text-center font-medium">
                  {locationErrorType ? getLocationErrorTitle(locationErrorType) : "Location Access Required"}
                </p>
                <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                  {locationErrorType ? getLocationErrorInstructions(locationErrorType) : "Location access is required to verify you're at the office."}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRetryLocation}
                    disabled={retryingLocation}
                  >
                    {retryingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      "Try Again"
                    )}
                  </Button>
                  <Button variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!loading && canProceedWithScanner && isScanning && !result && (
              <div className="space-y-4">
                {locationStatus === "granted" && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 p-2 rounded-lg">
                    <MapPin className="h-4 w-4" />
                    Location detected
                  </div>
                )}
                {(locationStatus === "unavailable" || locationStatus === "timeout") && (
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    Location unavailable - proceeding without location
                  </div>
                )}
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
                <p className={`text-center font-medium whitespace-pre-line ${result.success ? "text-green-600" : "text-destructive"}`}>
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

      {/* Early Checkout Warning Dialog */}
      <AlertDialog open={showEarlyCheckoutWarning} onOpenChange={setShowEarlyCheckoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Early Check-out
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are checking out before your scheduled end time ({employeeSchedule?.work_end_time}). 
                  This will be recorded as an early departure.
                </p>
                {earlyCheckoutReasonRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="early-reason" className="text-foreground">
                      Reason for early checkout <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="early-reason"
                      value={earlyCheckoutReason}
                      onChange={(e) => setEarlyCheckoutReason(e.target.value)}
                      placeholder="Please provide a reason..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelEarlyCheckout}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleProceedWithEarlyCheckout}
              disabled={earlyCheckoutReasonRequired && !earlyCheckoutReason.trim()}
            >
              Check Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
