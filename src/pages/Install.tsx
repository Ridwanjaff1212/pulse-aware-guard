import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Download, Smartphone, Bell, Share2, 
  Check, ArrowRight, Shield, Zap, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pushNotifications = useWebPushNotifications(user?.id);
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast({
        title: "App Installed!",
        description: "SafePulse has been added to your home screen.",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [toast]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SafePulse - Emergency Safety App",
          text: "Install SafePulse to get instant emergency alerts from me.",
          url: window.location.origin + "/install",
        });
      } catch (e) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.origin + "/install");
      toast({
        title: "Link Copied",
        description: "Share this link with your emergency contacts.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/20 via-background to-background px-6 pt-12 pb-8">
        <div className="max-w-md mx-auto text-center">
          <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Install SafePulse</h1>
          <p className="text-muted-foreground">
            Get instant access to emergency features right from your home screen
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 py-8 max-w-md mx-auto space-y-6">
        {/* Install Status */}
        {isStandalone ? (
          <div className="rounded-2xl border border-safe/30 bg-safe/10 p-6 text-center">
            <Check className="h-12 w-12 text-safe mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Already Installed</h2>
            <p className="text-sm text-muted-foreground">
              SafePulse is installed on your device. You can access it from your home screen.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            {isIOS ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Install on iPhone/iPad</h2>
                <div className="space-y-3">
                  <Step number={1} text='Tap the Share button in Safari' icon={Share2} />
                  <Step number={2} text='"Add to Home Screen"' icon={Download} />
                  <Step number={3} text='Tap "Add" to confirm' icon={Check} />
                </div>
              </div>
            ) : deferredPrompt ? (
              <div className="text-center">
                <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Ready to Install</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Add SafePulse to your home screen for quick access
                </p>
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Install SafePulse
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Install from Browser Menu</h2>
                <p className="text-sm text-muted-foreground">
                  Open your browser menu and select "Add to Home Screen" or "Install App"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Push Notifications */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Push Notifications</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Get instant alerts when your contacts need help
              </p>
              {pushNotifications.isSubscribed ? (
                <div className="flex items-center gap-2 text-safe text-sm">
                  <Check className="h-4 w-4" />
                  <span>Notifications enabled</span>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={pushNotifications.subscribe}
                  disabled={pushNotifications.isLoading}
                >
                  Enable Notifications
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Why Install?</h3>
          <Feature 
            icon={Zap} 
            title="One-Tap SOS" 
            description="Launch emergency mode instantly from your home screen"
          />
          <Feature 
            icon={Bell} 
            title="Push Alerts" 
            description="Receive real-time notifications when contacts need help"
          />
          <Feature 
            icon={Shield} 
            title="Offline Access" 
            description="Core safety features work even without internet"
          />
        </div>

        {/* Share with Contacts */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h3 className="font-semibold text-foreground mb-2">Share with Emergency Contacts</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your contacts should install SafePulse too so they can receive your emergency alerts
          </p>
          <Button variant="outline" onClick={handleShare} className="w-full">
            <Share2 className="h-4 w-4 mr-2" />
            Share Install Link
          </Button>
        </div>

        {/* Continue Button */}
        {user && (
          <Button 
            className="w-full" 
            size="lg" 
            onClick={() => navigate("/")}
          >
            Continue to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {!user && (
          <Button 
            className="w-full" 
            size="lg" 
            onClick={() => navigate("/auth")}
          >
            Sign In / Create Account
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </main>
    </div>
  );
}

function Step({ number, text, icon: Icon }: { number: number; text: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary">{number}</span>
      </div>
      <span className="text-sm text-foreground flex-1">{text}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function Feature({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30">
      <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
