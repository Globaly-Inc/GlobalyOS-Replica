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
  Building2,
  Shield,
  Users,
  Zap,
  MessageCircle,
  CalendarDays,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_found';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [status, setStatus] = useState<ApprovalStatus>('pending');
  const [checking, setChecking] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!email) {
      setStatus('not_found');
      return;
    }
    
    setChecking(true);
    try {
      // Use edge function to check status (bypasses RLS, returns minimal data)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-approval-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        console.error('Failed to check approval status:', response.status);
        setStatus('not_found');
        return;
      }

      const data = await response.json();

      if (data.status === 'not_found') {
        setStatus('not_found');
        return;
      }

      setStatus(data.status as ApprovalStatus);
      setRejectionReason(data.rejectionReason || null);
      setOrganizationName(data.name || null);

      // If approved, redirect to auth
      if (data.status === 'approved') {
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('not_found');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!email) return;

    // Initial status check
    checkStatus();

    // Subscribe to realtime changes for instant updates
    const channel = supabase
      .channel(`org-status-${email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
          filter: `owner_email=eq.${email}`
        },
        (payload) => {
          console.log('Organization status changed:', payload);
          checkStatus();
        }
      )
      .subscribe();

    // Keep polling as fallback (every 5 seconds for faster updates)
    const interval = setInterval(checkStatus, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [email]);

  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle2,
          title: "Welcome to GlobalyOS! 🎉",
          description: "Your organization has been approved. Check your email for login details!",
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
          title: "Application Submitted Successfully!",
          description: "Thank you for signing up. Our team is reviewing your application.",
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  // Show not found state
  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">No Application Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find a pending application for this email address. The application may have been deleted or the link is invalid.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/signup')}>
              Start New Application
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const features = [
    { icon: Users, label: "Team Management", desc: "Org chart, profiles, departments" },
    { icon: CalendarDays, label: "Attendance & Leave", desc: "Track time and absences" },
    { icon: MessageCircle, label: "Team Communication", desc: "Posts, announcements, chat" },
    { icon: Zap, label: "Performance Tracking", desc: "KPIs, OKRs, reviews" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Main Status Card */}
          <Card className="p-8 md:p-10 mb-8">
            {/* Status Icon */}
            <div className="flex justify-center mb-6">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center",
                config.bgColor
              )}>
                <StatusIcon className={cn("h-12 w-12", config.color)} />
              </div>
            </div>

            {/* Status Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-3">{config.title}</h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">{config.description}</p>
            </div>

            {/* Organization Info */}
            {organizationName && (
              <div className={cn(
                "rounded-xl p-5 mb-8 border max-w-md mx-auto",
                config.bgColor,
                config.borderColor
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-lg", config.bgColor)}>
                    <Building2 className={cn("h-6 w-6", config.color)} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{organizationName}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending State */}
            {status === 'pending' && (
              <div className="space-y-6">
                {/* Timeline */}
                <div className="bg-muted/50 rounded-xl p-6 max-w-lg mx-auto">
                  <h3 className="font-semibold text-lg mb-4 text-center">What happens next?</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium">Application Submitted</p>
                        <p className="text-sm text-muted-foreground">Your details have been received</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">Done</Badge>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0 animate-pulse">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium">Under Review</p>
                        <p className="text-sm text-muted-foreground">Our team is verifying your details</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-warning text-warning">In Progress</Badge>
                    </div>
                    
                    <div className="flex items-start gap-4 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium text-muted-foreground">Welcome Email</p>
                        <p className="text-sm text-muted-foreground">You'll receive login credentials</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">Pending</Badge>
                    </div>
                  </div>
                </div>

                {/* Expected Timeframe */}
                <div className="text-center py-4 px-6 bg-primary/5 rounded-xl max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-primary">Expected Approval Time</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">Within 24 hours</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Most applications are reviewed within a few hours during business days
                  </p>
                </div>

                {/* Check Status Button */}
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="outline"
                    size="lg"
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
                  <p className="text-xs text-muted-foreground">
                    Auto-refreshes every 5 seconds
                  </p>
                </div>
              </div>
            )}

            {/* Approved State */}
            {status === 'approved' && (
              <div className="space-y-6">
                <div className="text-center py-4 px-6 bg-success/10 rounded-xl max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-success" />
                    <span className="font-semibold text-success">7-Day Free Trial Started!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Check your inbox for the welcome email with login instructions
                  </p>
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Redirecting to sign in...</span>
                </div>
                
                <div className="text-center">
                  <Button size="lg" onClick={() => navigate('/auth')}>
                    Sign In Now
                  </Button>
                </div>
              </div>
            )}

            {/* Rejected State */}
            {status === 'rejected' && (
              <div className="space-y-6">
                {rejectionReason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 max-w-md mx-auto">
                    <p className="text-sm font-medium text-destructive mb-1">Reason:</p>
                    <p className="text-muted-foreground">{rejectionReason}</p>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="outline" size="lg" onClick={() => navigate('/signup')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Submit New Application
                  </Button>
                  <Button variant="ghost" size="lg" asChild>
                    <a href="mailto:support@globalyos.com">
                      Contact Support
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Features Preview (only show when pending) */}
          {status === 'pending' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-center mb-6">
                Here's what you'll get access to
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {features.map((feature, index) => (
                  <Card key={index} className="p-5 text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-1">{feature.label}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
