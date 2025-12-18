import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  RefreshCw,
  ArrowLeft,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [status, setStatus] = useState<ApprovalStatus>('pending');
  const [checking, setChecking] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!email) return;
    
    setChecking(true);
    try {
      // Check organization status by owner email
      const { data, error } = await supabase
        .from('organizations')
        .select('approval_status, rejection_reason, name')
        .eq('owner_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setStatus(data.approval_status as ApprovalStatus);
        setRejectionReason(data.rejection_reason);
        setOrganizationName(data.name);

        // If approved, redirect to auth
        if (data.approval_status === 'approved') {
          setTimeout(() => {
            navigate('/auth');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll for status updates every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [email]);

  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle2,
          title: "Application Approved!",
          description: "Your organization has been approved. Redirecting to sign in...",
          color: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/20",
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: "Application Not Approved",
          description: rejectionReason || "Unfortunately, your application was not approved at this time.",
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
        };
      default:
        return {
          icon: Clock,
          title: "Pending Approval",
          description: "Your application is being reviewed by our team.",
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            config.bgColor
          )}>
            <StatusIcon className={cn("h-10 w-10", config.color)} />
          </div>
        </div>

        {/* Status Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>

        {/* Organization Info */}
        {organizationName && (
          <div className={cn(
            "rounded-lg p-4 mb-6 border",
            config.bgColor,
            config.borderColor
          )}>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{organizationName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending State */}
        {status === 'pending' && (
          <div className="space-y-4">
            {/* Timeline */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-3">What happens next?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Application Submitted</p>
                    <p className="text-xs text-muted-foreground">Your details have been received</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Under Review</p>
                    <p className="text-xs text-muted-foreground">Usually within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Email Notification</p>
                    <p className="text-xs text-muted-foreground">You'll receive login details</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Check Status Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={checkStatus}
              disabled={checking}
            >
              {checking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Status
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Status updates automatically every 30 seconds
            </p>
          </div>
        )}

        {/* Approved State */}
        {status === 'approved' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Redirecting to sign in...</span>
            </div>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Sign In Now
            </Button>
          </div>
        )}

        {/* Rejected State */}
        {status === 'rejected' && (
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => navigate('/signup')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Need help? Contact{" "}
              <a href="mailto:support@globalyos.com" className="text-primary hover:underline">
                support@globalyos.com
              </a>
            </p>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-6 pt-6 border-t text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PendingApproval;
