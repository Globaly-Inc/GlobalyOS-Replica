import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, Plus, MoreVertical, Bell, Zap, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/.test(ua));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: "Quick Check-In", description: "Scan QR to clock in/out instantly" },
    { icon: Bell, title: "Push Notifications", description: "Get notified about kudos & leave approvals" },
    { icon: Wifi, title: "Works Offline", description: "View recent data even without internet" },
  ];

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Already Installed!</CardTitle>
            <CardDescription>TeamHub is ready to use on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Open TeamHub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Smartphone className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Install TeamHub</h1>
          <p className="text-muted-foreground">
            Add TeamHub to your home screen for the best experience
          </p>
        </div>

        {/* Features */}
        <div className="grid gap-3 mb-8">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Install Instructions */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">How to Install</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Install Now
              </Button>
            ) : isIOS ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap the</span>
                    <Share className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Share</span>
                    <span className="text-sm">button</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Scroll and tap</span>
                    <Plus className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Add to Home Screen</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <span className="text-sm">Tap <span className="font-medium">Add</span> to confirm</span>
                </div>
              </div>
            ) : isAndroid ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap the</span>
                    <MoreVertical className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">menu</span>
                    <span className="text-sm">button</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap</span>
                    <Plus className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Add to Home screen</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <span className="text-sm">Tap <span className="font-medium">Install</span> to confirm</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Open this page on your mobile device to install TeamHub
              </p>
            )}
          </CardContent>
        </Card>

        {/* Skip button */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            Continue without installing
          </Button>
        </div>
      </div>
    </div>
  );
}
