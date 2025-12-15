import { useState, useEffect } from "react";
import { X, Download, Share, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "globalyos_install_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone === true;
    
    if (isStandalone) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < DISMISS_DURATION) {
      return;
    }

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    const isMobile = isIOSDevice || isAndroidDevice;

    if (!isMobile) return;

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    if (isIOSDevice) {
      // iOS doesn't support beforeinstallprompt, show manual instructions
      setIsVisible(true);
    }

    // Listen for Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show banner for Android after a delay even without prompt (for testing)
    if (isAndroidDevice) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsVisible(false);
  };

  const handleNotNow = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <img 
                src="/pwa-192x192.png" 
                alt="GlobalyOS" 
                className="w-10 h-10 rounded-lg"
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Install GlobalyOS</h3>
              <p className="text-xs text-muted-foreground">Add to home screen</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          {isIOS && !showIOSInstructions ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Quick access • Push notifications • Works offline</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setShowIOSInstructions(true)}
                  className="flex-1"
                >
                  <Share className="h-4 w-4 mr-2" />
                  How to Install
                </Button>
                <Button variant="ghost" onClick={handleNotNow} className="text-muted-foreground">
                  Not now
                </Button>
              </div>
            </>
          ) : isIOS && showIOSInstructions ? (
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</div>
                  <div className="flex items-center gap-2">
                    <span>Tap the</span>
                    <Share className="h-4 w-4" />
                    <span className="font-medium">Share</span>
                    <span>button below</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</div>
                  <div className="flex items-center gap-2">
                    <span>Scroll down and tap</span>
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Add to Home Screen</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</div>
                  <span>Tap <span className="font-medium">Add</span> to confirm</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowIOSInstructions(false)}
                className="w-full"
              >
                Got it
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Quick access • Push notifications • Works offline</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleInstall}
                  className="flex-1"
                  disabled={!deferredPrompt}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
                <Button variant="ghost" onClick={handleNotNow} className="text-muted-foreground">
                  Not now
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
