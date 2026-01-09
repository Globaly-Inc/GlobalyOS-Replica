import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Home, MapPin, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, WifiOff, TimerOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRemoteAttendance } from "@/services/useWfh";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getLocation, getLocationErrorTitle, getLocationErrorInstructions, type LocationErrorType } from "@/utils/geolocation";

interface RemoteCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LocationStatus = "pending" | "granted" | "denied" | "unavailable" | "timeout";

export const RemoteCheckInDialog = ({ open, onOpenChange }: RemoteCheckInDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [currentAction, setCurrentAction] = useState<"check_in" | "check_out">("check_in");
  const [sessionCount, setSessionCount] = useState(0);
  const [maxSessions, setMaxSessions] = useState(3);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("pending");
  const [locationErrorType, setLocationErrorType] = useState<LocationErrorType | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [employeeSchedule, setEmployeeSchedule] = useState<{ work_end_time: string } | null>(null);
  const [showEarlyCheckoutWarning, setShowEarlyCheckoutWarning] = useState(false);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("");
  const [earlyCheckoutReasonRequired, setEarlyCheckoutReasonRequired] = useState(true);
  const [retryingLocation, setRetryingLocation] = useState(false);

  const remoteAttendanceMutation = useRemoteAttendance();

  // Request location using the improved utility
  useEffect(() => {
    if (!open) return;

    setLocationStatus("pending");
    setUserLocation(null);
    setLocationName("");
    setResult(null);
    setLocationErrorType(null);

    const requestLocation = async () => {
      const locationResult = await getLocation();

      if (locationResult.success && locationResult.coords) {
        setUserLocation(locationResult.coords);
        setLocationStatus("granted");

        // Get location name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationResult.coords.latitude}&lon=${locationResult.coords.longitude}`
          );
          if (response.ok) {
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const state = data.address?.state || "";
            setLocationName([city, state].filter(Boolean).join(", ") || "Location detected");
          }
        } catch {
          setLocationName("Location detected");
        }
      } else {
        // Map error type to status
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

  // Get current attendance status and fetch schedule + org settings
  useEffect(() => {
    const fetchStatus = async () => {
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

        const today = new Date().toISOString().split("T")[0];
        const { data: sessions } = await supabase
          .from("attendance_records")
          .select("id, check_in_time, check_out_time")
          .eq("employee_id", employee.id)
          .eq("date", today)
          .order("check_in_time", { ascending: false });

        const sessionList = sessions || [];
        setSessionCount(sessionList.length);

        const activeSession = sessionList.find((s) => s.check_out_time === null);
        setCurrentAction(activeSession ? "check_out" : "check_in");
      } catch (error) {
        console.error("Error fetching status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [open, user?.id]);

  // Reset on close and invalidate queries if successful
  useEffect(() => {
    if (!open) {
      // If we had a successful result, invalidate check-in status queries
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: ['check-in-status'] });
        queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      }
      setLoading(true);
      setResult(null);
      setEmployeeSchedule(null);
      setShowEarlyCheckoutWarning(false);
      setEarlyCheckoutReason("");
      setRetryingLocation(false);
    }
  }, [open, result?.success, queryClient]);

  const checkIsEarlyCheckout = () => {
    if (!employeeSchedule?.work_end_time) return false;
    const now = new Date();
    const [endHours, endMinutes] = employeeSchedule.work_end_time.split(':').map(Number);
    const workEndTime = new Date();
    workEndTime.setHours(endHours, endMinutes, 0, 0);
    return now < workEndTime;
  };

  const handleCheckInOut = async () => {
    if (!userLocation) return;

    // Check for early checkout
    if (currentAction === "check_out" && checkIsEarlyCheckout()) {
      setShowEarlyCheckoutWarning(true);
      return;
    }

    await processCheckout();
  };

  const processCheckout = async (reason?: string) => {
    if (!userLocation) return;

    try {
      await remoteAttendanceMutation.mutateAsync({
        action: currentAction,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        locationName: locationName || undefined,
        earlyCheckoutReason: reason,
      });
      setResult({
        success: true,
        message: currentAction === "check_in" ? "Checked in successfully!" : "Checked out successfully!",
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Failed to record attendance",
      });
    }
  };

  const handleProceedWithEarlyCheckout = async () => {
    if (earlyCheckoutReasonRequired && !earlyCheckoutReason.trim()) {
      return;
    }
    setShowEarlyCheckoutWarning(false);
    await processCheckout(earlyCheckoutReason.trim() || undefined);
    setEarlyCheckoutReason("");
  };

  const handleRetryLocation = async () => {
    setRetryingLocation(true);
    setLocationStatus("pending");
    setLocationErrorType(null);

    const locationResult = await getLocation();

    if (locationResult.success && locationResult.coords) {
      setUserLocation(locationResult.coords);
      setLocationStatus("granted");

      // Get location name
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationResult.coords.latitude}&lon=${locationResult.coords.longitude}`
        );
        if (response.ok) {
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const state = data.address?.state || "";
          setLocationName([city, state].filter(Boolean).join(", ") || "Location detected");
        }
      } catch {
        setLocationName("Location detected");
      }
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

  const showLocationError = locationStatus === "denied" || locationStatus === "unavailable" || locationStatus === "timeout";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Remote {currentAction === "check_in" ? "Check In" : "Check Out"}
              </span>
              <Badge variant="outline" className="text-xs">
                Session {currentAction === "check_in" ? sessionCount + 1 : sessionCount}/{maxSessions}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                  {locationErrorType ? getLocationErrorInstructions(locationErrorType) : "Location access is required for remote check-in."}
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
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!loading && locationStatus === "granted" && !result && (
              <div className="space-y-4">
                {/* Location Info */}
                <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Location Detected
                    </p>
                    {locationName && (
                      <p className="text-xs text-green-600 dark:text-green-400">{locationName}</p>
                    )}
                  </div>
                </div>

                {/* Check In/Out Button */}
                <Button
                  onClick={handleCheckInOut}
                  disabled={remoteAttendanceMutation.isPending}
                  className="w-full h-14 text-lg"
                  variant={currentAction === "check_in" ? "default" : "secondary"}
                >
                  {remoteAttendanceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : currentAction === "check_in" ? (
                    "Check In"
                  ) : (
                    "Check Out"
                  )}
                </Button>

                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                  Cancel
                </Button>
              </div>
            )}

            {result && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                {result.success ? (
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-destructive" />
                )}
                <p
                  className={`text-center font-medium ${
                    result.success ? "text-green-600" : "text-destructive"
                  }`}
                >
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
                    <Label htmlFor="remote-early-reason" className="text-foreground">
                      Reason for early checkout <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="remote-early-reason"
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
            <AlertDialogCancel onClick={() => setEarlyCheckoutReason("")}>Cancel</AlertDialogCancel>
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
