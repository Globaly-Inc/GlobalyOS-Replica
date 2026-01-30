import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

type ConnectionState = "connected" | "connecting" | "disconnected";

export const ConnectionStatus = ({ 
  className, 
  showLabel = false,
  size = "sm"
}: ConnectionStatusProps) => {
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = useCallback(() => {
    // Check if the realtime connection is active by getting channel states
    const channels = supabase.getChannels();
    
    if (channels.length === 0) {
      // No channels subscribed yet - might be initial load
      setStatus("connecting");
      return;
    }

    // Check if any channel is in a connected state
    const hasConnectedChannel = channels.some(
      (channel) => channel.state === "joined" || channel.state === "joining"
    );

    if (hasConnectedChannel) {
      setStatus("connected");
      setRetryCount(0);
    } else {
      setStatus("disconnected");
    }
  }, []);

  const handleRetry = useCallback(() => {
    setStatus("connecting");
    setRetryCount((prev) => prev + 1);
    
    // Force reconnect by removing and re-adding channels
    // The chat components will handle re-subscribing
    window.dispatchEvent(new CustomEvent("supabase-reconnect"));
    
    // Check status after a short delay
    setTimeout(checkConnection, 2000);
  }, [checkConnection]);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up interval to check connection status
    const interval = setInterval(checkConnection, 5000);

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus("connecting");
      setTimeout(checkConnection, 1000);
    };

    const handleOffline = () => {
      setStatus("disconnected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  if (status === "connected") {
    if (!showLabel) return null; // Hide when connected unless label is shown
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
            <div className={cn(dotSize, "rounded-full bg-green-500")} />
            {showLabel && <span className="text-xs">Connected</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>Real-time connection active</TooltipContent>
      </Tooltip>
    );
  }

  if (status === "connecting") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
            <RefreshCw className={cn(iconSize, "animate-spin")} />
            {showLabel && <span className="text-xs">Connecting...</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>Establishing real-time connection...</TooltipContent>
      </Tooltip>
    );
  }

  // Disconnected
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          className={cn(
            "flex items-center gap-1.5 h-auto py-1 px-2 text-destructive hover:text-destructive",
            className
          )}
        >
          <WifiOff className={iconSize} />
          {showLabel && <span className="text-xs">Disconnected</span>}
          <RefreshCw className={cn(iconSize, "ml-1")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p>Connection lost</p>
          <p className="text-xs text-muted-foreground">Click to retry</p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">Retries: {retryCount}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
