import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRemoteAttendance } from "@/services/useWfh";
import { supabase } from "@/integrations/supabase/client";

interface RemoteCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoteCheckInDialog = ({ open, onOpenChange }: RemoteCheckInDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentAction, setCurrentAction] = useState<"check_in" | "check_out">("check_in");
  const [sessionCount, setSessionCount] = useState(0);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const remoteAttendanceMutation = useRemoteAttendance();

  // Request location
  useEffect(() => {
    if (!open) return;

    setLocationStatus("pending");
    setUserLocation(null);
    setLocationName("");
    setResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(coords);
        setLocationStatus("granted");

        // Get location name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
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
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [open]);

  // Get current attendance status
  useEffect(() => {
    const fetchStatus = async () => {
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

  // Reset on close
  useEffect(() => {
    if (!open) {
      setLoading(true);
      setResult(null);
    }
  }, [open]);

  const handleCheckInOut = async () => {
    if (!userLocation) return;

    try {
      await remoteAttendanceMutation.mutateAsync({
        action: currentAction,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
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

  const handleRetryLocation = () => {
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Remote {currentAction === "check_in" ? "Check In" : "Check Out"}
            </span>
            <Badge variant="outline" className="text-xs">
              Session {currentAction === "check_in" ? sessionCount + 1 : sessionCount}/3
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
              <p className="text-muted-foreground text-center">Requesting location access...</p>
              <p className="text-xs text-muted-foreground text-center">
                Please allow location access when prompted
              </p>
            </div>
          )}

          {!loading && locationStatus === "denied" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
              <p className="text-center font-medium">Location Access Required</p>
              <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                Location access is required for remote check-in. Please enable location permissions.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetryLocation}>
                  Try Again
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
  );
};
