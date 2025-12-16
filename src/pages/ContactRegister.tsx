import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Bell, Shield, Check, AlertTriangle, 
  ArrowRight, Smartphone, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ContactRegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const invitedBy = searchParams.get("from");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    setIsLoading(true);
    
    try {
      // Check browser support
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast({
          title: "Browser Not Supported",
          description: "Please use Chrome, Firefox, or Safari for push notifications.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: "Notifications Required",
          description: "Please enable notifications to receive emergency alerts.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get push subscription
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidKey) {
        // Store without push for now
        await supabase.from("contact_push_subscriptions").insert({
          contact_email: email.toLowerCase(),
          endpoint: `no-push-${Date.now()}`,
          p256dh_key: "pending",
          auth_key: "pending",
          device_name: name,
        });
        
        setIsRegistered(true);
        toast({
          title: "Registered!",
          description: "You'll receive emergency alerts via email.",
        });
        setIsLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const keys = subscription.toJSON().keys;
      
      // Store subscription
      const { error } = await supabase.from("contact_push_subscriptions").insert({
        contact_email: email.toLowerCase(),
        endpoint: subscription.endpoint,
        p256dh_key: keys?.p256dh || "",
        auth_key: keys?.auth || "",
        device_name: name,
      });

      if (error) throw error;

      setIsRegistered(true);
      setPushSubscribed(true);
      
      toast({
        title: "Registration Complete!",
        description: "You'll receive instant push alerts for emergencies.",
      });
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallApp = () => {
    navigate("/install");
  };

  if (isRegistered) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Success State */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="h-24 w-24 rounded-full bg-safe/20 flex items-center justify-center mb-6">
            <Check className="h-12 w-12 text-safe" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">You're All Set!</h1>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {pushSubscribed 
              ? "You'll receive instant push notifications when your contact needs help."
              : "You'll receive email alerts when your contact needs help."}
          </p>

          <div className="space-y-3 w-full max-w-xs">
            <Button className="w-full" onClick={handleInstallApp}>
              <Smartphone className="h-4 w-4 mr-2" />
              Install SafePulse App
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
              Create Your Own Account
            </Button>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20 max-w-sm">
            <AlertTriangle className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Important:</strong> When you receive an emergency alert, 
              try to contact the person or call emergency services if they don't respond.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-destructive/10 via-background to-background px-6 pt-12 pb-8">
        <div className="max-w-md mx-auto text-center">
          <div className="h-20 w-20 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Emergency Contact Registration</h1>
          <p className="text-muted-foreground">
            {invitedBy 
              ? `${invitedBy} has added you as an emergency contact`
              : "Sign up to receive emergency alerts from your loved ones"}
          </p>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Must match the email your contact used when adding you
              </p>
            </div>
          </div>

          {/* What You'll Receive */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">What You'll Receive:</h3>
            <Feature 
              icon={Bell} 
              title="Instant Push Alerts" 
              description="Real-time notifications when an emergency is triggered"
            />
            <Feature 
              icon={Shield} 
              title="Location Updates" 
              description="GPS coordinates to help locate your contact"
            />
            <Feature 
              icon={AlertTriangle} 
              title="Emergency Details" 
              description="Type of emergency and any recorded evidence"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isLoading || !email || !name}
          >
            {isLoading ? (
              <span className="animate-pulse">Registering...</span>
            ) : (
              <>
                Enable Emergency Alerts
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 rounded-xl bg-secondary/50 text-center">
          <p className="text-sm text-muted-foreground">
            Already have a SafePulse account?{" "}
            <button 
              onClick={() => navigate("/auth")}
              className="text-primary font-medium hover:underline"
            >
              Sign in here
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30">
      <Icon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
