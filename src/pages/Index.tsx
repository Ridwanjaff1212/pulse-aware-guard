import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Brain, Bell, AlertTriangle, Activity,
  MapPin, Users, Mic, Eye, TrendingUp, Clock,
  CheckCircle2, XCircle, Zap, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmergencyButton } from "@/components/EmergencyButton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userName, setUserName] = useState("");
  const [safetyScore, setSafetyScore] = useState(92);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMotionActive, setIsMotionActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("Detecting...");
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadRecentActivity();
      getCurrentLocation();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user!.id)
      .maybeSingle();
    
    if (data?.full_name) setUserName(data.full_name);
  };

  const loadRecentActivity = async () => {
    const { data } = await supabase
      .from("safety_incidents")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) setRecentActivity(data);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
            );
            const data = await response.json();
            setCurrentLocation(data.address?.suburb || data.address?.city || "Location found");
          } catch {
            setCurrentLocation("Location available");
          }
        },
        () => setCurrentLocation("Location disabled")
      );
    }
  };

  const handleEmergencyTrigger = async () => {
    toast({
      title: "🚨 Emergency Activated",
      description: "Alerting your emergency contacts and sharing location...",
      variant: "destructive",
    });
    
    // Create incident
    await supabase.from("safety_incidents").insert({
      user_id: user!.id,
      type: "sos_trigger",
      description: "Manual SOS activation",
      status: "active",
    });

    loadRecentActivity();
  };

  const toggleVoiceDetection = () => {
    setIsVoiceActive(!isVoiceActive);
    toast({
      title: isVoiceActive ? "Voice Detection Paused" : "Voice Detection Active",
      description: isVoiceActive ? "Keyword detection is now paused" : "Listening for your safety keyword",
    });
  };

  const toggleMotionDetection = () => {
    setIsMotionActive(!isMotionActive);
    toast({
      title: isMotionActive ? "Motion Detection Paused" : "Motion Detection Active",
      description: isMotionActive ? "Motion monitoring paused" : "Monitoring for unusual movements",
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
          <Shield className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="AI Safety Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {userName?.split(" ")[0] || "Guardian"}
              </h1>
              <p className="text-muted-foreground mt-1">
                Your AI-powered safety guardian is active and monitoring
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-safe/10 border border-safe/30">
                <div className="h-2 w-2 rounded-full bg-safe animate-pulse" />
                <span className="text-sm font-medium text-safe">Protected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emergency SOS - Main Focus */}
          <div className="lg:col-span-1 rounded-2xl border border-destructive/30 bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Emergency SOS
            </h3>
            <div className="flex flex-col items-center py-4">
              <EmergencyButton onTrigger={handleEmergencyTrigger} />
            </div>
          </div>

          {/* AI Safety Score */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Safety Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Safety Score */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Safety Score</span>
                  <TrendingUp className="h-4 w-4 text-safe" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-safe">{safetyScore}</span>
                  <span className="text-muted-foreground mb-1">/100</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full bg-safe transition-all" 
                    style={{ width: `${safetyScore}%` }} 
                  />
                </div>
              </div>

              {/* Location Status */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <p className="font-semibold text-foreground truncate">{currentLocation}</p>
                <p className="text-xs text-muted-foreground mt-1">GPS tracking active</p>
              </div>

              {/* Risk Level */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Risk Level</span>
                  <Shield className="h-4 w-4 text-safe" />
                </div>
                <p className="font-semibold text-safe">Low Risk</p>
                <p className="text-xs text-muted-foreground mt-1">No threats detected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={toggleVoiceDetection}
            className={cn(
              "p-4 rounded-xl border transition-all",
              isVoiceActive 
                ? "border-primary bg-primary/10" 
                : "border-border bg-card hover:bg-secondary/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                isVoiceActive ? "bg-primary/20" : "bg-secondary"
              )}>
                <Mic className={cn("h-5 w-5", isVoiceActive ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm text-foreground">Voice Detection</p>
                <p className="text-xs text-muted-foreground">{isVoiceActive ? "Active" : "Paused"}</p>
              </div>
            </div>
          </button>

          <button
            onClick={toggleMotionDetection}
            className={cn(
              "p-4 rounded-xl border transition-all",
              isMotionActive 
                ? "border-accent bg-accent/10" 
                : "border-border bg-card hover:bg-secondary/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                isMotionActive ? "bg-accent/20" : "bg-secondary"
              )}>
                <Activity className={cn("h-5 w-5", isMotionActive ? "text-accent" : "text-muted-foreground")} />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm text-foreground">Motion Sensor</p>
                <p className="text-xs text-muted-foreground">{isMotionActive ? "Active" : "Paused"}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/response")}
            className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm text-foreground">Contacts</p>
                <p className="text-xs text-muted-foreground">Manage</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/assistant")}
            className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                <Brain className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm text-foreground">AI Assistant</p>
                <p className="text-xs text-muted-foreground">Chat</p>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={activity.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    activity.status === "resolved" ? "bg-safe/20" : "bg-warning/20"
                  )}>
                    {activity.status === "resolved" ? (
                      <CheckCircle2 className="h-4 w-4 text-safe" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    activity.status === "resolved" 
                      ? "bg-safe/10 text-safe" 
                      : "bg-warning/10 text-warning"
                  )}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No recent incidents</p>
              <p className="text-xs text-muted-foreground mt-1">You're all clear!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
