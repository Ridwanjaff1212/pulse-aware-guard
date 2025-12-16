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
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: "Fetching address...",
          });
          // In a real app, we'd use a geocoding API here
          setTimeout(() => {
            setCurrentLocation(prev => prev ? { ...prev, address: "Current Location" } : null);
          }, 1000);
        },
        (error) => {
          console.error("Geolocation error:", error);
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
        type: "SOS Activated",
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

    toast({
      title: "🚨 Emergency Mode Activated",
      description: "Alerting your emergency contacts and sharing your location.",
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
        title: "Contact Added",
        description: `${contact.name} has been added to your emergency contacts.`,
      });
    }
  };

  const handleSaveKeyword = async (keyword: string) => {
    setEmergencyKeyword(keyword);
    
    await supabase
      .from("profiles")
      .update({ emergency_keyword: keyword })
      .eq("user_id", user!.id);
    
    toast({
      title: "Keyword Updated",
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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
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
          </div>

          {/* AI Analysis Button */}
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setShowAIPanel(true)}
              className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              🤖 AI Safety Analysis
            </button>
            <button
              onClick={() => setShowMotionDetector(true)}
              className="px-4 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm font-medium hover:bg-warning/20 transition-colors"
            >
              📱 Motion Detection
            </button>
            <button
              onClick={() => setShowVoiceAnalyzer(true)}
              className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              🎤 Voice Analysis
            </button>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <QuickActions
              onKeywordSetup={() => setKeywordDialogOpen(true)}
              onLocationShare={handleToggleLocationSharing}
              onCommunityAlert={() => {
                toast({
                  title: "Community Alert",
                  description: "This feature alerts nearby SafePulse users.",
                });
              }}
              onCaptureEvidence={() => setShowIncidentPack(true)}
            />

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
                <span className="text-2xl">📍</span>
                <div>
                  <h3 className="font-medium text-foreground">Safe Zones</h3>
                  <p className="text-sm text-muted-foreground">Manage your trusted locations</p>
                </div>
              </div>
            </button>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <EmergencyContacts
              contacts={contacts}
              onAddContact={() => setAddContactDialogOpen(true)}
            />

            <SafetyIncidents incidents={incidents} />
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 rounded-xl border border-border/50 bg-card/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            🔒 Your privacy matters. SafePulse only activates sensors during risk events.
            No continuous tracking. No always-on listening.
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
              title: "Motion Alert",
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
                title: "Voice Stress Detected",
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
