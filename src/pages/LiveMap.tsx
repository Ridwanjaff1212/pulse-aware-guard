import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Share2, Users, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LiveLocationMap } from "@/components/LiveLocationMap";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LiveMap() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isEmergency, setIsEmergency] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadLocationHistory();
    }
  }, [user]);

  const loadLocationHistory = async () => {
    const { data } = await supabase
      .from("location_history")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setLocationHistory(data);
  };

  const handleLocationUpdate = async (lat: number, lng: number) => {
    setCurrentLocation({ lat, lng });
    
    if (isSharing) {
      await supabase.from("location_history").insert({
        user_id: user!.id,
        latitude: lat,
        longitude: lng,
        is_emergency: isEmergency,
      });
    }
  };

  const toggleSharing = async (enabled: boolean) => {
    setIsSharing(enabled);
    toast({
      title: enabled ? "Location Sharing Enabled" : "Location Sharing Disabled",
      description: enabled 
        ? "Your location is now being shared with emergency contacts"
        : "Location sharing has been stopped",
    });
  };

  const triggerEmergencyMode = async () => {
    setIsEmergency(true);
    setIsSharing(true);
    
    if (currentLocation) {
      await supabase.from("emergency_alerts").insert({
        user_id: user!.id,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        status: "active",
        message: "Emergency location sharing activated",
      });

      await supabase.from("safety_incidents").insert({
        user_id: user!.id,
        type: "emergency_location",
        description: "Emergency location sharing activated",
        status: "active",
        location_lat: currentLocation.lat,
        location_lng: currentLocation.lng,
      });
    }

    toast({
      title: "🚨 Emergency Mode Activated",
      description: "Your live location is being shared with all contacts",
      variant: "destructive",
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout title="Live Location Map">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Emergency Banner */}
        {isEmergency && (
          <div className="rounded-2xl border border-destructive bg-destructive/10 p-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">EMERGENCY MODE ACTIVE</p>
                <p className="text-sm text-destructive/80">
                  Your location is being shared in real-time
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => {
                setIsEmergency(false);
                toast({ title: "Emergency Mode Deactivated" });
              }}
            >
              Deactivate
            </Button>
          </div>
        )}

        {/* Map */}
        <LiveLocationMap 
          onLocationUpdate={handleLocationUpdate}
          isEmergency={isEmergency}
        />

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sharing Control */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  isSharing ? "bg-safe/20" : "bg-secondary"
                )}>
                  <Share2 className={cn(
                    "h-5 w-5",
                    isSharing ? "text-safe" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Location Sharing</h3>
                  <p className="text-xs text-muted-foreground">
                    Share with emergency contacts
                  </p>
                </div>
              </div>
              <Switch checked={isSharing} onCheckedChange={toggleSharing} />
            </div>
            
            {isSharing && (
              <div className="p-3 rounded-xl bg-safe/10 border border-safe/30">
                <p className="text-sm text-safe flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-safe animate-pulse" />
                  Broadcasting location to contacts
                </p>
              </div>
            )}
          </div>

          {/* Emergency Trigger */}
          <div className="rounded-2xl border border-destructive/30 bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Emergency Mode</h3>
                <p className="text-xs text-muted-foreground">
                  Instant location broadcast
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={triggerEmergencyMode}
              disabled={isEmergency}
            >
              {isEmergency ? "Emergency Active" : "Activate Emergency Mode"}
            </Button>
          </div>
        </div>

        {/* Location History */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Recent Locations
          </h3>
          
          {locationHistory.length > 0 ? (
            <div className="space-y-2">
              {locationHistory.map((loc, i) => (
                <div 
                  key={loc.id || i} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl",
                    loc.is_emergency ? "bg-destructive/10" : "bg-secondary/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={cn(
                      "h-4 w-4",
                      loc.is_emergency ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <div>
                      <p className="text-sm font-mono text-foreground">
                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {loc.address || "Location recorded"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(loc.created_at).toLocaleTimeString()}
                    </p>
                    {loc.is_emergency && (
                      <span className="text-[10px] text-destructive">EMERGENCY</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No location history yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Enable sharing to start recording
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
