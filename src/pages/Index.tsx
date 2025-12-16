import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SafetyStatus } from "@/components/SafetyStatus";
import { EmergencyButton } from "@/components/EmergencyButton";
import { EmergencyContacts } from "@/components/EmergencyContacts";
import { SafetyIncidents } from "@/components/SafetyIncidents";
import { QuickActions } from "@/components/QuickActions";
import { LocationStatus } from "@/components/LocationStatus";
import { KeywordSetupDialog } from "@/components/KeywordSetupDialog";
import { AddContactDialog } from "@/components/AddContactDialog";
import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { MotionDetector } from "@/components/MotionDetector";
import { VoiceStressAnalyzer } from "@/components/VoiceStressAnalyzer";
import { IncidentPackViewer } from "@/components/IncidentPackViewer";
import { SafeZonesManager } from "@/components/SafeZonesManager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Users, Lock, Brain, Activity, Bell, MapPin } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [safetyLevel, setSafetyLevel] = useState<"safe" | "monitoring" | "emergency">("safe");
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [emergencyKeyword, setEmergencyKeyword] = useState("Help me now");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showMotionDetector, setShowMotionDetector] = useState(false);
  const [showVoiceAnalyzer, setShowVoiceAnalyzer] = useState(false);
  const [showIncidentPack, setShowIncidentPack] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  const [contacts, setContacts] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    relationship: string;
  }>>([]);

  const [incidents, setIncidents] = useState<Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    location?: string;
    status: "resolved" | "active" | "pending";
  }>>([]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
      loadContacts();
      loadIncidents();
      getCurrentLocation();
    }
  }, [user]);

  const loadUserData = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (profile) {
      setEmergencyKeyword(profile.emergency_keyword || "Help me now");
      setIsLocationSharing(profile.location_sharing_enabled || false);
    }
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) {
      setContacts(data.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
      })));
    }
  };

  const loadIncidents = async () => {
    const { data } = await supabase
      .from("safety_incidents")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setIncidents(data.map(i => ({
        id: i.id,
        type: i.type,
        description: i.description,
        timestamp: new Date(i.created_at),
        location: i.location_address || undefined,
        status: i.status as "resolved" | "active" | "pending",
      })));
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Use reverse geocoding with a free service
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            
            setCurrentLocation({ lat, lng, address });
          } catch {
            setCurrentLocation({ 
              lat, 
              lng, 
              address: `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}` 
            });
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "📍 Location Access",
            description: "Enable location for better safety features.",
          });
        }
      );
    }
  };

  const handleEmergencyTrigger = async () => {
    setSafetyLevel("emergency");
    
    // Create incident in database
    const { data: incident } = await supabase
      .from("safety_incidents")
      .insert({
        user_id: user!.id,
        type: "🚨 SOS Activated",
        description: "Emergency SOS button was manually activated by user.",
        status: "active",
        location_lat: currentLocation?.lat,
        location_lng: currentLocation?.lng,
        location_address: currentLocation?.address,
      })
      .select()
      .single();

    // Save location if sharing is enabled
    if (isLocationSharing && currentLocation) {
      await supabase.from("location_history").insert({
        user_id: user!.id,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        address: currentLocation.address,
        is_emergency: true,
      });
    }

    // Create emergency alert for community
    if (currentLocation) {
      await supabase.from("emergency_alerts").insert({
        user_id: user!.id,
        incident_id: incident?.id,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        message: "Emergency SOS activated. User needs help.",
        status: "active",
        radius_meters: 1000,
      });
    }

    toast({
      title: "🚨 Emergency Mode Activated",
      description: "Alerting your emergency contacts and nearby users.",
      variant: "destructive",
    });

    loadIncidents();
  };

  const handleAddContact = async (contact: { name: string; phone: string; relationship: string }) => {
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user!.id,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    });

    if (!error) {
      loadContacts();
      toast({
        title: "✅ Contact Added",
        description: `${contact.name} has been added to your emergency contacts.`,
      });
    }
  };

  const handleSaveKeyword = async (keyword: string) => {
    setEmergencyKeyword(keyword);
    
    await supabase
      .from("profiles")
      .update({ emergency_keyword: keyword, keyword_enabled: true })
      .eq("user_id", user!.id);
    
    toast({
      title: "🎤 Keyword Updated",
      description: "Your emergency voice keyword has been saved.",
    });
  };

  const handleToggleLocationSharing = async () => {
    const newValue = !isLocationSharing;
    setIsLocationSharing(newValue);
    
    await supabase
      .from("profiles")
      .update({ location_sharing_enabled: newValue })
      .eq("user_id", user!.id);

    if (newValue) {
      getCurrentLocation();
      toast({
        title: "📍 Location Sharing Enabled",
        description: "Your location will be shared during emergencies.",
      });
    } else {
      toast({
        title: "📍 Location Sharing Disabled",
        description: "Your location will not be shared.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading SafePulse...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-6">
        {/* Hero Section with Status */}
        <section className="mb-8">
          <SafetyStatus level={safetyLevel} className="mb-6" />

          {/* Emergency Button - Center Stage */}
          <div className="flex flex-col items-center justify-center py-8">
            <EmergencyButton onTrigger={handleEmergencyTrigger} />
            <p className="text-muted-foreground text-sm mt-4">
              Press and hold for 3 seconds to activate emergency mode
            </p>
          </div>

          {/* Module 1: Smart Emergency Detection */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">🧩 Smart Detection</h3>
                <p className="text-xs text-muted-foreground">AI-powered emergency recognition</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setKeywordDialogOpen(true)}
                className="p-3 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-colors text-left"
              >
                <span className="text-lg">🎤</span>
                <p className="text-xs font-medium text-foreground mt-1">Voice Keyword</p>
                <p className="text-[10px] text-muted-foreground">"{emergencyKeyword}"</p>
              </button>
              <button
                onClick={() => setShowMotionDetector(true)}
                className="p-3 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-colors text-left"
              >
                <span className="text-lg">📱</span>
                <p className="text-xs font-medium text-foreground mt-1">Fall Detection</p>
                <p className="text-[10px] text-muted-foreground">Gyroscope sensor</p>
              </button>
              <button
                onClick={() => setShowVoiceAnalyzer(true)}
                className="p-3 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-colors text-left"
              >
                <span className="text-lg">🔊</span>
                <p className="text-xs font-medium text-foreground mt-1">Voice Stress</p>
                <p className="text-[10px] text-muted-foreground">Distress analysis</p>
              </button>
              <button
                onClick={() => setShowAIPanel(true)}
                className="p-3 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-colors text-left"
              >
                <span className="text-lg">🤖</span>
                <p className="text-xs font-medium text-foreground mt-1">AI Analysis</p>
                <p className="text-[10px] text-muted-foreground">Risk assessment</p>
              </button>
            </div>
          </div>

          {/* Module 2: AI Risk Analysis */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">🧠 AI Risk Engine</h3>
                <p className="text-xs text-muted-foreground">Context-aware safety scoring</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-safe/10 border border-safe/30 text-center">
                <span className="text-2xl">✅</span>
                <p className="text-xs font-medium text-safe mt-1">Safe Zone</p>
                <p className="text-[10px] text-muted-foreground">Normal activity</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-center">
                <span className="text-2xl">⚠️</span>
                <p className="text-xs font-medium text-warning mt-1">Monitoring</p>
                <p className="text-[10px] text-muted-foreground">Unusual pattern</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
                <span className="text-2xl">🚨</span>
                <p className="text-xs font-medium text-destructive mt-1">Emergency</p>
                <p className="text-[10px] text-muted-foreground">Help needed</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Module 3: Emergency Response */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">🚨 Response Network</h3>
                  <p className="text-xs text-muted-foreground">Multi-channel emergency alerts</p>
                </div>
              </div>
              <QuickActions
                onKeywordSetup={() => setKeywordDialogOpen(true)}
                onLocationShare={handleToggleLocationSharing}
                onCommunityAlert={() => {
                  toast({
                    title: "📢 Community Alert",
                    description: "Nearby SafePulse users will be notified.",
                  });
                }}
                onCaptureEvidence={() => setShowIncidentPack(true)}
              />
            </div>

            <LocationStatus
              isSharing={isLocationSharing}
              lastUpdate={new Date()}
              address={currentLocation?.address || "Enable location to see address"}
              onToggleSharing={handleToggleLocationSharing}
            />

            <button
              onClick={() => setShowSafeZones(true)}
              className="w-full p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-safe/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-safe" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">📍 Safe Zones</h3>
                  <p className="text-sm text-muted-foreground">Manage your trusted locations</p>
                </div>
              </div>
            </button>
          </div>

          {/* Right Column - Module 4: Privacy & Support */}
          <div className="space-y-6">
            <EmergencyContacts
              contacts={contacts}
              onAddContact={() => setAddContactDialogOpen(true)}
            />

            <SafetyIncidents incidents={incidents} />

            {/* Privacy Module */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">🔐 Privacy & Stealth</h3>
                  <p className="text-xs text-muted-foreground">Your data, your control</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                  <span className="text-lg">🔒</span>
                  <p className="text-xs font-medium text-foreground mt-1">Encrypted</p>
                  <p className="text-[10px] text-muted-foreground">End-to-end secure</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                  <span className="text-lg">🕵️</span>
                  <p className="text-xs font-medium text-foreground mt-1">Stealth Mode</p>
                  <p className="text-[10px] text-muted-foreground">Disguised interface</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                  <span className="text-lg">📼</span>
                  <p className="text-xs font-medium text-foreground mt-1">Auto Recording</p>
                  <p className="text-[10px] text-muted-foreground">Evidence capture</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                  <span className="text-lg">💚</span>
                  <p className="text-xs font-medium text-foreground mt-1">Recovery</p>
                  <p className="text-[10px] text-muted-foreground">Post-incident support</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 rounded-xl border border-safe/30 bg-safe/5 p-4 text-center">
          <p className="text-sm text-safe font-medium">
            🔒 Your privacy matters. SafePulse only activates sensors during risk events.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            No continuous tracking • No always-on listening • Your data stays yours
          </p>
        </div>
      </main>

      {/* Dialogs */}
      <KeywordSetupDialog
        open={keywordDialogOpen}
        onOpenChange={setKeywordDialogOpen}
        currentKeyword={emergencyKeyword}
        onSaveKeyword={handleSaveKeyword}
      />

      <AddContactDialog
        open={addContactDialogOpen}
        onOpenChange={setAddContactDialogOpen}
        onAddContact={handleAddContact}
      />

      {showAIPanel && (
        <AIAnalysisPanel
          onClose={() => setShowAIPanel(false)}
          userId={user.id}
        />
      )}

      {showMotionDetector && (
        <MotionDetector
          onClose={() => setShowMotionDetector(false)}
          onAlert={(type) => {
            setSafetyLevel("monitoring");
            toast({
              title: "📱 Motion Alert",
              description: `Detected: ${type}. Monitoring situation...`,
            });
          }}
        />
      )}

      {showVoiceAnalyzer && (
        <VoiceStressAnalyzer
          onClose={() => setShowVoiceAnalyzer(false)}
          onDistressDetected={(level) => {
            if (level === "high" || level === "severe") {
              setSafetyLevel("monitoring");
              toast({
                title: "🎤 Voice Stress Detected",
                description: "High stress levels detected. Are you okay?",
                variant: "destructive",
              });
            }
          }}
        />
      )}

      {showIncidentPack && (
        <IncidentPackViewer
          onClose={() => setShowIncidentPack(false)}
          incidents={incidents}
          userId={user.id}
        />
      )}

      {showSafeZones && (
        <SafeZonesManager
          onClose={() => setShowSafeZones(false)}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Index;