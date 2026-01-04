import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface MessageDeliveryStatusProps {
  status: DeliveryStatus;
  className?: string;
}

const MessageDeliveryStatus = ({ status, className }: MessageDeliveryStatusProps) => {
  if (status === 'sending') {
    return (
      <div className={cn("h-3 w-3 rounded-full border border-muted-foreground/50 animate-pulse", className)} />
    );
  }
  
  if (status === 'sent') {
    return <Check className={cn("h-3.5 w-3.5 text-muted-foreground", className)} />;
  }
  
  if (status === 'delivered') {
    return <CheckCheck className={cn("h-3.5 w-3.5 text-muted-foreground", className)} />;
  }
  
  // Read status - primary color
  return <CheckCheck className={cn("h-3.5 w-3.5 text-primary", className)} />;
};

export default MessageDeliveryStatus;
