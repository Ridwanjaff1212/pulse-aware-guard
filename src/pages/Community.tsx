import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Radio, AlertTriangle, MapPin, Clock, Users, Send,
  Shield, CheckCircle2, Bell, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CommunityAlert {
  id: string;
  message: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  user_id: string;
}

export default function Community() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [newAlert, setNewAlert] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadAlerts();
      getCurrentLocation();
      
      // Subscribe to real-time alerts
      const channel = supabase
        .channel("community-alerts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "emergency_alerts" },
          (payload) => {
            if (payload.new.user_id !== user.id) {
              toast({
                title: "Community Alert",
                description: "A nearby SafePulse user needs help",
                variant: "destructive",
              });
              loadAlerts();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadAlerts = async () => {
    const { data } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (data) setAlerts(data);
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      }
    );
  };

  const sendCommunityAlert = async () => {
    if (!newAlert.trim() || !currentLocation) return;

    setIsSending(true);
    
    const { error } = await supabase.from("emergency_alerts").insert({
      user_id: user!.id,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      message: newAlert.trim(),
      status: "active",
      radius_meters: 5000,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send community alert",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Alert Sent",
        description: "Your alert has been broadcast to nearby SafePulse users",
      });
      setNewAlert("");
      loadAlerts();
    }
    
    setIsSending(false);
  };

  const getDistanceFromUser = (lat: number, lng: number) => {
    if (!currentLocation) return "Unknown";
    
    const R = 6371;
    const dLat = ((lat - currentLocation.lat) * Math.PI) / 180;
    const dLon = ((lng - currentLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentLocation.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)}km away`;
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout title="Community Alerts">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Info Banner */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Radio className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">SafePulse Community Network</h2>
              <p className="text-sm text-muted-foreground">
                Connect with nearby SafePulse users. Send and receive safety alerts in your area.
              </p>
            </div>
          </div>
        </div>

        {/* Send Alert */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Send Community Alert
          </h3>
          
          <Textarea
            placeholder="Describe the situation or danger you're witnessing..."
            value={newAlert}
            onChange={(e) => setNewAlert(e.target.value)}
            className="mb-4 min-h-[100px]"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {currentLocation 
                ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                : "Getting location..."}
            </div>
            <Button 
              onClick={sendCommunityAlert}
              disabled={!newAlert.trim() || !currentLocation || isSending}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : "Broadcast Alert"}
            </Button>
          </div>
        </div>

        {/* Nearby Alerts */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              Nearby Alerts
              {alerts.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                  {alerts.filter(a => a.status === "active").length} active
                </span>
              )}
            </h3>
          </div>
          
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="h-12 w-12 text-safe/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No alerts in your area</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your community is safe!
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isOwn = alert.user_id === user.id;
                const isActive = alert.status === "active";
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4",
                      isOwn && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-warning/20" : "bg-safe/20"
                      )}>
                        {isActive ? (
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-safe" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            isActive ? "bg-warning/20 text-warning" : "bg-safe/20 text-safe"
                          )}>
                            {isActive ? "Active" : "Resolved"}
                          </span>
                          {isOwn && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                              Your Alert
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">
                          {alert.message || "Emergency alert"}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getDistanceFromUser(alert.latitude, alert.longitude)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(alert.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="rounded-2xl border border-safe/30 bg-safe/5 p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-safe" />
            Community Safety Tips
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-safe" />
              Only send alerts for genuine safety concerns
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-safe" />
              If you see an active alert nearby, consider checking on the person
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-safe" />
              In case of serious emergency, always call local emergency services first
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-safe" />
              Keep your location sharing enabled for better community coordination
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
