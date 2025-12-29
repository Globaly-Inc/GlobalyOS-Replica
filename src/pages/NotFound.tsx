import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  Home, 
  ArrowLeft, 
  Search, 
  Compass, 
  MapPin, 
  Rocket, 
  Cloud,
  Star,
  Sparkles,
  RefreshCw
} from "lucide-react";

const FUN_MESSAGES = [
  { title: "Lost in Space! 🚀", subtitle: "Houston, we have a 404 problem." },
  { title: "Oops! Page Went on Vacation 🏖️", subtitle: "It didn't leave a forwarding address." },
  { title: "This Page is Playing Hide & Seek 🙈", subtitle: "And it's winning." },
  { title: "404: Page Not Found 🔍", subtitle: "The page you're looking for has wandered off." },
  { title: "Looks Like a Dead End 🛑", subtitle: "But every dead end is a new beginning!" },
  { title: "The Map Says It Should Be Here... 🗺️", subtitle: "But clearly, the map is wrong." },
  { title: "This Link Took a Wrong Turn 🧭", subtitle: "Even GPS can't find this page." },
  { title: "Page Has Left the Building 🎸", subtitle: "Elvis style. Thank you, thank you very much." },
];

const FloatingIcon = ({ 
  Icon, 
  className, 
  delay = 0 
}: { 
  Icon: React.ComponentType<{ className?: string }>;
  className?: string;
  delay?: number;
}) => (
  <div 
    className={`absolute opacity-10 animate-pulse ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    <Icon className="h-8 w-8 text-primary" />
  </div>
);

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [message] = useState(() => FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)]);
  const [isReporting, setIsReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const hasReportedRef = useRef(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // Report broken link (debounced, once per session per path)
    const reportBrokenLink = async () => {
      const reportedKey = `reported_404_${location.pathname}`;
      if (sessionStorage.getItem(reportedKey) || hasReportedRef.current) {
        return;
      }
      
      hasReportedRef.current = true;
      sessionStorage.setItem(reportedKey, 'true');
      
      try {
        await supabase.functions.invoke('report-broken-link', {
          body: {
            path: location.pathname,
            referrer: document.referrer || null,
            userAgent: navigator.userAgent,
            userId: user?.id || null,
            organizationId: currentOrg?.id || null,
          }
        });
      } catch (error) {
        console.error("Failed to report broken link:", error);
      }
    };
    
    // Small delay to allow auth context to load
    const timeout = setTimeout(reportBrokenLink, 500);
    return () => clearTimeout(timeout);
  }, [location.pathname, user?.id, currentOrg?.id]);

  const handleGoHome = () => {
    if (currentOrg?.slug) {
      navigate(`/org/${currentOrg.slug}`);
    } else {
      navigate('/');
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      handleGoHome();
    }
  };

  const handleReportManually = async () => {
    setIsReporting(true);
    try {
      await supabase.functions.invoke('report-broken-link', {
        body: {
          path: location.pathname,
          referrer: document.referrer || null,
          userAgent: navigator.userAgent,
          userId: user?.id || null,
          organizationId: currentOrg?.id || null,
          manualReport: true,
        }
      });
      setReported(true);
    } catch (error) {
      console.error("Failed to report:", error);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 p-4 overflow-hidden relative">
      {/* Floating background icons */}
      <FloatingIcon Icon={Star} className="top-[10%] left-[10%]" delay={0} />
      <FloatingIcon Icon={Cloud} className="top-[20%] right-[15%]" delay={0.5} />
      <FloatingIcon Icon={Sparkles} className="bottom-[30%] left-[20%]" delay={1} />
      <FloatingIcon Icon={Compass} className="top-[40%] right-[10%]" delay={1.5} />
      <FloatingIcon Icon={MapPin} className="bottom-[20%] right-[25%]" delay={2} />
      <FloatingIcon Icon={Rocket} className="bottom-[15%] left-[15%]" delay={2.5} />
      
      <Card className="max-w-lg w-full shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 md:p-12 text-center">
          {/* Animated 404 */}
          <div className="mb-6 relative">
            <div className="text-8xl md:text-9xl font-black text-primary/20 select-none animate-pulse">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent text-6xl md:text-7xl font-black">
                404
              </div>
            </div>
          </div>
          
          {/* Fun message */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {message.title}
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            {message.subtitle}
          </p>
          
          {/* Searched path (subtle) */}
          <div className="mb-8 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">You were looking for:</p>
            <code className="text-sm text-foreground/80 break-all">
              {location.pathname}
            </code>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button 
              onClick={handleGoHome}
              size="lg"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
            <Button 
              onClick={handleGoBack}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>
          
          {/* Search suggestion */}
          {currentOrg && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/org/${currentOrg.slug}`)}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <Search className="h-4 w-4" />
              Search your workspace
            </Button>
          )}
          
          {/* Report broken link */}
          <div className="mt-8 pt-6 border-t border-border/50">
            {reported ? (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                Thanks! We've been notified about this broken link.
              </p>
            ) : (
              <Button
                variant="link"
                size="sm"
                onClick={handleReportManually}
                disabled={isReporting}
                className="text-muted-foreground text-xs"
              >
                {isReporting ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Reporting...
                  </>
                ) : (
                  "Think this link should work? Report it to our team."
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
