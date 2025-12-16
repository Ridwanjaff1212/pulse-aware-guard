import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, Phone, MapPin, Shield, 
  Volume2, Vibrate, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function PanicPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pushNotifications = useWebPushNotifications(user?.id);
  
  const [isTriggering, setIsTriggering] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Auto-trigger on page load after 3 seconds (shortcut behavior)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auto") === "true") {
      setCountdown(3);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      triggerEmergency();
    }
  }, [countdown]);

  const triggerEmergency = async () => {
    if (!user || isTriggering) return;
    
    setIsTriggering(true);
    setIsActivated(true);

    // Vibrate pattern for emergency
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    try {
      // Get current location
      let location = { lat: 0, lng: 0, address: "" };
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        location.lat = pos.coords.latitude;
        location.lng = pos.coords.longitude;
      } catch (e) {
        console.log("Could not get location");
      }

      // Create incident
      const { data: incident, error: incidentError } = await supabase
        .from("safety_incidents")
        .insert({
          user_id: user.id,
          type: "panic_button",
          description: "Emergency triggered via panic button",
          status: "active",
          location_lat: location.lat || null,
          location_lng: location.lng || null,
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // Send push notifications to contacts
      await pushNotifications.sendEmergencyAlert(
        incident?.id,
        "EMERGENCY! Panic button activated. Please check on me immediately."
      );

      // Also send emails to contacts
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("name, email, phone")
        .eq("user_id", user.id);

      const emailContacts = contacts?.filter(c => c.email) || [];
      if (emailContacts.length > 0) {
        await supabase.functions.invoke("send-emergency-email", {
          body: {
            contacts: emailContacts,
            userId: user.id,
            incidentId: incident?.id,
            message: "PANIC BUTTON ACTIVATED! This is an emergency. Please check on me immediately.",
            location: location.lat ? `${location.lat}, ${location.lng}` : "Unknown",
          },
        });
      }

      toast({
        title: "🚨 Emergency Activated",
        description: "Your contacts have been notified.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Panic trigger error:", error);
      toast({
        title: "Error",
        description: "Failed to send emergency alert. Please call 911.",
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const cancelCountdown = () => {
    setCountdown(null);
    toast({
      title: "Cancelled",
      description: "Emergency alert cancelled.",
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-destructive flex items-center justify-center">
        <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center animate-pulse">
          <AlertTriangle className="h-8 w-8 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-500",
      isActivated ? "bg-destructive" : "bg-background"
    )}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate("/")} 
          className={cn(
            "flex items-center gap-2",
            isActivated ? "text-white/70" : "text-muted-foreground"
          )}
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <h1 className={cn(
          "font-bold text-lg",
          isActivated ? "text-white" : "text-foreground"
        )}>
          Emergency SOS
        </h1>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {countdown !== null ? (
          <div className="text-center animate-pulse">
            <div className="h-40 w-40 rounded-full bg-destructive flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-destructive/50">
              <span className="text-6xl font-bold text-white">{countdown}</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Emergency in {countdown}...</h2>
            <p className="text-muted-foreground mb-6">Tap below to cancel</p>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={cancelCountdown}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              Cancel
            </Button>
          </div>
        ) : isActivated ? (
          <div className="text-center text-white">
            <div className="h-40 w-40 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <AlertTriangle className="h-20 w-20" />
            </div>
            <h2 className="text-3xl font-bold mb-2">EMERGENCY ACTIVE</h2>
            <p className="text-white/70 mb-6">Your contacts have been notified</p>
            
            <div className="space-y-3 max-w-xs mx-auto">
              <Button 
                size="lg" 
                variant="secondary"
                className="w-full"
                onClick={() => window.open("tel:911")}
              >
                <Phone className="h-5 w-5 mr-2" />
                Call 911
              </Button>
              <Button 
                size="lg" 
                variant="ghost"
                className="w-full text-white border-white/30"
                onClick={() => navigate("/live-map")}
              >
                <MapPin className="h-5 w-5 mr-2" />
                Share Location
              </Button>
              <Button 
                size="lg" 
                variant="ghost"
                className="w-full text-white/70"
                onClick={() => {
                  setIsActivated(false);
                  navigate("/");
                }}
              >
                I'm Safe Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={triggerEmergency}
              disabled={isTriggering}
              className={cn(
                "h-48 w-48 rounded-full flex items-center justify-center mx-auto mb-6 transition-all",
                "bg-gradient-to-br from-destructive to-destructive/80",
                "shadow-2xl shadow-destructive/30",
                "hover:scale-105 active:scale-95",
                "focus:outline-none focus:ring-4 focus:ring-destructive/50",
                isTriggering && "animate-pulse"
              )}
            >
              <div className="text-center text-white">
                <AlertTriangle className="h-16 w-16 mx-auto mb-2" />
                <span className="text-xl font-bold">PANIC</span>
              </div>
            </button>
            <h2 className="text-2xl font-bold text-foreground mb-2">Emergency Panic Button</h2>
            <p className="text-muted-foreground mb-6">
              Tap to immediately alert your emergency contacts
            </p>
            
            <div className="flex items-center justify-center gap-6 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span>Audio alert</span>
              </div>
              <div className="flex items-center gap-2">
                <Vibrate className="h-4 w-4" />
                <span>Vibration</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Location</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {!isActivated && (
        <footer className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-safe text-sm mb-2">
            <Shield className="h-4 w-4" />
            <span>SafePulse Protection Active</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this page to your home screen for quick access
          </p>
        </footer>
      )}
    </div>
  );
}
