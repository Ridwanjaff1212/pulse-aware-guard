import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Lock, Eye, EyeOff, Shield, FileText, Video, 
  ArrowLeft, Settings, ToggleLeft, ToggleRight, 
  Download, Clock, MapPin, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  type: string;
  description: string;
  created_at: string;
  location_address: string | null;
  status: string;
}

export default function PrivacyStealth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stealthMode, setStealthMode] = useState(false);
  const [autoRecording, setAutoRecording] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [locationSharing, setLocationSharing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadUserSettings();
      loadIncidents();
    }
  }, [user]);

  const loadUserSettings = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("location_sharing_enabled")
      .eq("user_id", user!.id)
      .maybeSingle();
    
    if (data) {
      setLocationSharing(data.location_sharing_enabled || false);
    }
  };

  const loadIncidents = async () => {
    const { data } = await supabase
      .from("safety_incidents")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setIncidents(data);
  };

  const toggleLocationSharing = async () => {
    const newValue = !locationSharing;
    setLocationSharing(newValue);
    
    await supabase
      .from("profiles")
      .update({ location_sharing_enabled: newValue })
      .eq("user_id", user!.id);
    
    toast({
      title: newValue ? "Location Sharing Enabled" : "Location Sharing Disabled",
      description: newValue 
        ? "Your location will be shared during emergencies."
        : "Your location will not be shared.",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <h1 className="font-semibold text-foreground">Privacy & Stealth</h1>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Privacy Status */}
        <div className="rounded-2xl border border-safe/30 bg-safe/5 p-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-safe/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-safe" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Your Data is Protected</h2>
          <p className="text-muted-foreground text-sm">
            End-to-end encryption • No continuous tracking • Privacy-first design
          </p>
        </div>

        {/* Privacy Controls */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Privacy Controls
          </h3>

          {/* Stealth Mode */}
          <button
            onClick={() => {
              setStealthMode(!stealthMode);
              toast({
                title: !stealthMode ? "Stealth Mode Enabled" : "Stealth Mode Disabled",
                description: !stealthMode 
                  ? "App will appear as a calculator when opened."
                  : "Normal app appearance restored.",
              });
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-3">
              {stealthMode ? (
                <EyeOff className="h-5 w-5 text-primary" />
              ) : (
                <Eye className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <p className="font-medium text-foreground">Stealth Mode</p>
                <p className="text-xs text-muted-foreground">Disguise app as calculator</p>
              </div>
            </div>
            {stealthMode ? (
              <ToggleRight className="h-6 w-6 text-primary" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
          </button>

          {/* Location Sharing */}
          <button
            onClick={toggleLocationSharing}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-3">
              <MapPin className={cn("h-5 w-5", locationSharing ? "text-safe" : "text-muted-foreground")} />
              <div className="text-left">
                <p className="font-medium text-foreground">Location Sharing</p>
                <p className="text-xs text-muted-foreground">Share during emergencies only</p>
              </div>
            </div>
            {locationSharing ? (
              <ToggleRight className="h-6 w-6 text-safe" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
          </button>

          {/* Auto Recording */}
          <button
            onClick={() => {
              setAutoRecording(!autoRecording);
              toast({
                title: !autoRecording ? "Auto Recording Enabled" : "Auto Recording Disabled",
              });
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-3">
              <Video className={cn("h-5 w-5", autoRecording ? "text-destructive" : "text-muted-foreground")} />
              <div className="text-left">
                <p className="font-medium text-foreground">Auto Recording</p>
                <p className="text-xs text-muted-foreground">Record during emergencies</p>
              </div>
            </div>
            {autoRecording ? (
              <ToggleRight className="h-6 w-6 text-destructive" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Incident Packs */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Incident Packs</h3>
              <p className="text-xs text-muted-foreground">{incidents.length} recorded incidents</p>
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No incidents recorded</p>
              <p className="text-xs text-muted-foreground">Incidents will appear here when they occur</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    incident.status === "resolved" ? "bg-safe/10" : 
                    incident.status === "active" ? "bg-destructive/10" : "bg-warning/10"
                  )}>
                    {incident.status === "resolved" ? (
                      <Check className="h-4 w-4 text-safe" />
                    ) : (
                      <FileText className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{incident.type}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(incident.created_at)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post-Incident Support */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Recovery Support</h3>
              <p className="text-xs text-muted-foreground">Post-incident resources</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate("/assistant")}>
            Talk to AI Support
          </Button>
        </div>
      </main>
    </div>
  );
}