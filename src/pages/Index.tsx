import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Brain, Bell, AlertTriangle, Activity,
  MapPin, Users, Mic, Eye, TrendingUp, Clock,
  CheckCircle2, Zap, Heart, Power, Radio,
  Smartphone, Volume2, Lock, Waves, Video, Package, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmergencyButton } from "@/components/EmergencyButton";
import { DangerConfidenceScore } from "@/components/DangerConfidenceScore";
import { KeywordSetupDialog } from "@/components/KeywordSetupDialog";
import { IncidentCamera } from "@/components/IncidentCamera";
import { IncidentPackViewer } from "@/components/IncidentPackViewer";
import { AIWitnessPanel } from "@/components/AIWitnessPanel";
import { DecoyCalculator } from "@/components/DecoyCalculator";
import { TruthLockPanel } from "@/components/TruthLockPanel";
import { useAutonomousSafety } from "@/hooks/useAutonomousSafety";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useEnhancedKeywordDetection } from "@/hooks/useEnhancedKeywordDetection";
import { useAIWitnessMode } from "@/hooks/useAIWitnessMode";
import { useDecoyMode } from "@/hooks/useDecoyMode";
import { useIntentVerification } from "@/hooks/useIntentVerification";
import { useScreamDetection } from "@/hooks/useScreamDetection";
import { useTruthLock } from "@/hooks/useTruthLock";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestPermission, permission } = usePushNotifications();
  
  // AI Witness Mode
  const witnessMode = useAIWitnessMode(user?.id);

  // Decoy Mode (default landing for signed-in users)
  const decoyMode = useDecoyMode();

  // Truth Lock for evidence protection
  const truthLock = useTruthLock(user?.id);

  // Autonomous Safety (signals feed into intent verification)
  const {
    dangerState,
    startMonitoring,
    stopMonitoring,
    toggleAutonomousMode,
    addSignal,
  } = useAutonomousSafety(user?.id, () => {
    if (!witnessMode.isActive) witnessMode.activate();
  });

  // Intent Verification callback - activates emergency flow
  const handleIntentConfirmed = useCallback(async () => {
    console.log("🚨 INTENT CONFIRMED - Activating emergency response");

    // Immediately switch UI back to decoy
    decoyMode.activateDecoy({ silent: true });

    // Activate AI Witness Mode
    if (!witnessMode.isActive) {
      witnessMode.activate();
    }

    // Create incident and lock evidence
    const { data: incident } = await supabase
      .from("safety_incidents")
      .insert({
        user_id: user!.id,
        type: "intent_verified",
        description: "Multi-signal intent verification confirmed distress",
        status: "active",
      })
      .select()
      .single();

    if (incident) {
      truthLock.lockIncident(incident.id, 24);

      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("name,email")
        .eq("user_id", user!.id);

      const emailContacts = contacts?.filter((c) => c.email) || [];
      if (emailContacts.length > 0) {
        await supabase.functions.invoke("send-emergency-email", {
          body: {
            contacts: emailContacts,
            userId: user!.id,
            incidentId: incident.id,
            message: "Emergency intent verified. Location and evidence being gathered.",
          },
        });
      }
    }

    toast({
      title: "🚨 Emergency Response Activated",
      description: "Recording evidence and notifying contacts.",
      variant: "destructive",
    });
  }, [decoyMode, witnessMode, truthLock, user, toast]);

  const intentVerification = useIntentVerification(handleIntentConfirmed);

  // Scream Detection - triggers intent verification (and can trigger emergency alone via hook logic)
  const handleScreamDetected = useCallback(
    (confidence: number) => {
      intentVerification.registerScream(confidence);
      addSignal({
        type: "voice",
        value: confidence * 100,
        description: "Scream detected",
      });
    },
    [intentVerification, addSignal]
  );
  const screamDetection = useScreamDetection(handleScreamDetected);

  // Enhanced keyword detection (voiceprint + speech)
  const onKeywordDetected = useCallback(
    (confidence: number) => {
      intentVerification.registerKeyword(confidence);
      addSignal({
        type: "voice",
        value: confidence * 100,
        description: `Emergency keyword detected (${Math.round(confidence * 100)}%)`,
      });
    },
    [intentVerification, addSignal]
  );

  const onVoiceVerified = useCallback(
    (confidence: number) => {
      // Extra weight when biometrically verified
      addSignal({
        type: "voice",
        value: 90 + confidence * 10,
        description: "Voiceprint verified",
      });
    },
    [addSignal]
  );

  const {
    isListening: keywordListening,
    keyword: emergencyKeyword,
    detectionCount,
    voiceMatchConfidence,
    isVoiceMatched,
    updateKeyword: saveKeyword,
    startListening: startKeywordListening,
    stopListening: stopKeywordListening,
  } = useEnhancedKeywordDetection(user?.id, onKeywordDetected, onVoiceVerified);

  const toggleKeywordListening = useCallback(
    (enabled: boolean) => {
      if (enabled) startKeywordListening();
      else stopKeywordListening();
    },
    [startKeywordListening, stopKeywordListening]
  );

  const keywordActivated = detectionCount > 0;

  const [userName, setUserName] = useState("");
  const [currentLocation, setCurrentLocation] = useState<string>("Detecting...");
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [showKeywordSetup, setShowKeywordSetup] = useState(false);
  const [showIncidentCamera, setShowIncidentCamera] = useState(false);
  const [showIncidentPack, setShowIncidentPack] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadRecentActivity();
      loadStats();
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

  const loadStats = async () => {
    const { count: contacts } = await supabase
      .from("emergency_contacts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id);
    
    const { count: incidents } = await supabase
      .from("safety_incidents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id);

    setContactCount(contacts || 0);
    setIncidentCount(incidents || 0);
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

    addSignal({
      type: "voice",
      value: 100,
      description: "Manual SOS activation",
    });
    
    await supabase.from("safety_incidents").insert({
      user_id: user!.id,
      type: "sos_trigger",
      description: "Manual SOS activation",
      status: "active",
    });

    loadRecentActivity();
    loadStats();
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

  // Show Decoy Calculator when in decoy mode
  if (decoyMode.isDecoyActive) {
    return (
      <DecoyCalculator 
        onSecretTap={decoyMode.handleSecretTap}
        gestureProgress={decoyMode.secretGestureProgress}
      />
    );
  }

  return (
    <DashboardLayout title="AI Safety Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner with ASM Status */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {userName?.split(" ")[0] || "Guardian"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {dangerState.isMonitoring 
                  ? "Autonomous Safety AI is actively protecting you"
                  : "Enable ASM for AI-powered protection"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {permission !== "granted" && (
                <Button variant="outline" size="sm" onClick={requestPermission}>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </Button>
              )}
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all",
                dangerState.isMonitoring 
                  ? "bg-safe/10 border-safe/30" 
                  : "bg-secondary border-border"
              )}>
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  dangerState.isMonitoring ? "bg-safe animate-pulse" : "bg-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  dangerState.isMonitoring ? "text-safe" : "text-muted-foreground"
                )}>
                  {dangerState.isMonitoring ? "ASM Active" : "ASM Inactive"}
                </span>
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
            <p className="text-xs text-center text-muted-foreground mt-4">
              Press and hold for 2 seconds to activate
            </p>
          </div>

          {/* Danger Confidence Score - THE KEY FEATURE */}
          <div className="lg:col-span-2">
            <DangerConfidenceScore dangerState={dangerState} />
          </div>
        </div>

        {/* ASM Control Panel */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-background p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center transition-all",
                dangerState.isMonitoring 
                  ? "bg-primary/20 animate-pulse-safe" 
                  : "bg-secondary"
              )}>
                <Brain className={cn(
                  "h-7 w-7",
                  dangerState.isMonitoring ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Autonomous Safety Mode (ASM)
                </h2>
                <p className="text-sm text-muted-foreground">
                  AI that decides when you're in danger and acts on your behalf
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={dangerState.isMonitoring ? stopMonitoring : startMonitoring}
              variant={dangerState.isMonitoring ? "outline" : "default"}
              className={cn(
                "min-w-[140px]",
                dangerState.isMonitoring && "border-primary/50"
              )}
            >
              <Power className="h-4 w-4 mr-2" />
              {dangerState.isMonitoring ? "Pause ASM" : "Start ASM"}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MonitoringCard
              icon={Mic}
              title="Voice Analysis"
              description="Distress detection"
              active={dangerState.isMonitoring}
            />
            <MonitoringCard
              icon={Activity}
              title="Motion Sensor"
              description="Fall detection"
              active={dangerState.isMonitoring}
            />
            <MonitoringCard
              icon={MapPin}
              title="Location Watch"
              description="Safe zone alerts"
              active={dangerState.isMonitoring}
            />
            <MonitoringCard
              icon={Clock}
              title="Activity Monitor"
              description="Inactivity alerts"
              active={dangerState.isMonitoring}
            />
          </div>

          {/* Autonomous Mode Toggle */}
          <div className="mt-6 p-4 rounded-xl bg-warning/5 border border-warning/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Autonomous Response</p>
                  <p className="text-xs text-muted-foreground">
                    AI will automatically trigger emergency protocols
                  </p>
                </div>
              </div>
              <Switch
                checked={dangerState.autonomousMode}
                onCheckedChange={toggleAutonomousMode}
              />
            </div>
          </div>
        </div>

        {/* Voice Keyword Detection - THE KILLER FEATURE */}
        <div className={cn(
          "rounded-2xl border p-6 transition-all",
          keywordListening 
            ? "border-destructive/50 bg-destructive/5" 
            : "border-border bg-card"
        )}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center",
                keywordListening ? "bg-destructive/20 animate-pulse" : "bg-secondary"
              )}>
                <Mic className={cn(
                  "h-7 w-7",
                  keywordListening ? "text-destructive" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Voice Keyword Detection
                  {keywordListening && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive animate-pulse">
                      LISTENING
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {emergencyKeyword 
                    ? `Say "${emergencyKeyword}" to trigger emergency` 
                    : "Set up your secret emergency keyword"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowKeywordSetup(true)}
              >
                {emergencyKeyword ? "Change Keyword" : "Setup Keyword"}
              </Button>
              {emergencyKeyword && (
                <Switch
                  checked={keywordListening}
                  onCheckedChange={toggleKeywordListening}
                />
              )}
            </div>
          </div>

          {keywordActivated && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 animate-pulse">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">EMERGENCY KEYWORD DETECTED!</p>
                  <p className="text-sm text-destructive/80">
                    Emergency protocols activated. Help is on the way.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!emergencyKeyword && (
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground">
                <strong>How it works:</strong> Set a secret keyword that will trigger emergency response 
                even when your phone is locked. Simply say your keyword out loud and SafePulse will 
                automatically alert your contacts, share your location, and start recording.
              </p>
            </div>
          )}
        </div>

        {/* Incident Camera with Truth Lock Integration */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                truthLock.isLocked ? "bg-safe/20" : "bg-destructive/10"
              )}>
                <Video className={cn(
                  "h-5 w-5",
                  truthLock.isLocked ? "text-safe" : "text-destructive"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Incident Camera
                  {truthLock.isLocked && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-safe/20 text-safe">
                      LOCKED
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {truthLock.isLocked 
                    ? "Evidence sealed - cannot be deleted" 
                    : "Record evidence during emergencies"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showIncidentCamera && !truthLock.isLocked && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    const { data } = await supabase
                      .from("safety_incidents")
                      .insert({
                        user_id: user!.id,
                        type: "camera_evidence",
                        description: "Camera evidence locked via incident camera",
                        status: "active",
                      })
                      .select()
                      .single();
                    if (data) {
                      truthLock.addEvidence("video", "Camera recording captured");
                      truthLock.lockIncident(data.id, 24);
                    }
                  }}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Lock Evidence
                </Button>
              )}
              <Button 
                variant={showIncidentCamera ? "destructive" : "outline"}
                onClick={() => setShowIncidentCamera(!showIncidentCamera)}
              >
                <Video className="h-4 w-4 mr-2" />
                {showIncidentCamera ? "Hide Camera" : "Open Camera"}
              </Button>
            </div>
          </div>
          
          {showIncidentCamera && (
            <IncidentCamera userId={user?.id} className="mt-4" />
          )}
        </div>

        {/* AI Witness Mode Panel */}
        <AIWitnessPanel
          isActive={witnessMode.isActive}
          isRecording={witnessMode.isRecording}
          isTranscribing={witnessMode.isTranscribing}
          evidence={witnessMode.evidence}
          currentTranscript={witnessMode.currentTranscript}
          threatAnalysis={witnessMode.threatAnalysis}
          recordingDuration={witnessMode.recordingDuration}
          onActivate={witnessMode.activate}
          onDeactivate={witnessMode.deactivate}
          onGenerateReport={witnessMode.generateIncidentReport}
        />

        {/* Truth Lock Panel */}
        <TruthLockPanel
          isLocked={truthLock.isLocked}
          timeRemaining={truthLock.timeRemaining}
          canCancel={truthLock.canCancel}
          evidenceCount={truthLock.evidence.length}
          autoReleaseHours={truthLock.autoReleaseHours}
          onActivate={async () => {
            const { data } = await supabase
              .from("safety_incidents")
              .insert({
                user_id: user!.id,
                type: "manual_lock",
                description: "Manual Truth Lock activation",
                status: "active",
              })
              .select()
              .single();
            if (data) truthLock.lockIncident(data.id, 24);
          }}
          onCancel={truthLock.cancelLock}
          onManualRelease={truthLock.releaseEvidence}
        />

        {/* Scream Detection Control */}
        <div className={cn(
          "rounded-2xl border p-6 transition-all",
          screamDetection.isListening 
            ? "border-warning/50 bg-warning/5" 
            : "border-border bg-card"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                screamDetection.isListening ? "bg-warning/20 animate-pulse" : "bg-secondary"
              )}>
                <Waves className={cn(
                  "h-5 w-5",
                  screamDetection.isListening ? "text-warning" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Scream Detection
                  {screamDetection.isListening && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                      LISTENING
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  AI detects screams and distress sounds
                </p>
              </div>
            </div>
            <Switch
              checked={screamDetection.isListening}
              onCheckedChange={(checked) => {
                if (checked) screamDetection.startListening();
                else screamDetection.stopListening();
              }}
            />
          </div>
          {screamDetection.isListening && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Detection Confidence</span>
                <span className="font-bold text-warning">
                  {(screamDetection.screamConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Intent Verification Status */}
        {intentVerification.confirmationScore > 0 && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-destructive/20 flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Intent Verification Active</h3>
                <p className="text-xs text-muted-foreground">
                  Multi-signal analysis in progress
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmation Score</span>
                <span className="font-bold text-destructive">
                  {intentVerification.confirmationScore.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div 
                  className="h-full bg-destructive transition-all duration-300"
                  style={{ width: `${intentVerification.confirmationScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Keywords detected: {intentVerification.keywordCount} | 
                {intentVerification.isIntentConfirmed ? " ✓ Intent Confirmed" : " Analyzing..."}
              </p>
            </div>
          </div>
        )}

        {/* Decoy Mode Control */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                <Calculator className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Decoy App Mode</h3>
                <p className="text-xs text-muted-foreground">Transform into innocent calculator app</p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => decoyMode.activateDecoy()}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Activate Decoy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 p-3 rounded-lg bg-secondary/50">
            <strong>Secret Gesture:</strong> Tap-Tap-DoubleTap-Tap to toggle decoy mode from anywhere. 
            Safety monitoring continues invisibly in the background.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={MapPin}
            label="Location"
            value={currentLocation}
            onClick={() => navigate("/privacy")}
          />
          <StatCard
            icon={Users}
            label="Contacts"
            value={`${contactCount} saved`}
            onClick={() => navigate("/response")}
          />
          <StatCard
            icon={Shield}
            label="Incidents"
            value={`${incidentCount} total`}
            onClick={() => navigate("/privacy")}
          />
          <StatCard
            icon={Brain}
            label="AI Analysis"
            value="Ready"
            onClick={() => navigate("/ai-engine")}
          />
        </div>

        {/* Install & Share Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Install SafePulse App</h3>
                <p className="text-xs text-muted-foreground">One-tap SOS from home screen</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Add SafePulse to your home screen for instant access during emergencies.
            </p>
            <Button className="w-full" onClick={() => navigate("/install")}>
              Install Now
            </Button>
          </div>
          
          <div className="rounded-2xl border border-safe/30 bg-gradient-to-br from-safe/10 to-background p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-safe/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-safe" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Invite Emergency Contacts</h3>
                <p className="text-xs text-muted-foreground">Help them receive your alerts</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Share the registration link with contacts so they can receive instant push alerts.
            </p>
            <Button 
              variant="outline" 
              className="w-full border-safe/30 hover:bg-safe/10"
              onClick={() => {
                const link = `${window.location.origin}/contact-register?from=${userName || "A friend"}`;
                navigator.clipboard.writeText(link);
                toast({
                  title: "Link Copied!",
                  description: "Share this link with your emergency contacts",
                });
              }}
            >
              Copy Registration Link
            </Button>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Safety Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary/30">
              <p className="font-medium text-sm text-foreground mb-1">Set Up Your Keyword</p>
              <p className="text-xs text-muted-foreground">
                Create a secret emergency phrase that triggers alerts even when your phone is locked.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30">
              <p className="font-medium text-sm text-foreground mb-1">Add Safe Zones</p>
              <p className="text-xs text-muted-foreground">
                Mark locations as safe so the AI can detect when you're in an unusual place.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30">
              <p className="font-medium text-sm text-foreground mb-1">Train Voice Recognition</p>
              <p className="text-xs text-muted-foreground">
                Record your voice so SafePulse can verify it's really you calling for help.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <QuickAction
            icon={Mic}
            title="Voice Detection"
            description="Keyword trigger"
            onClick={() => navigate("/detection")}
            color="primary"
          />
          <QuickAction
            icon={Eye}
            title="AI Witness"
            description="Evidence recording"
            onClick={witnessMode.isActive ? witnessMode.deactivate : witnessMode.activate}
            color={witnessMode.isActive ? "destructive" : "accent"}
          />
          <QuickAction
            icon={Heart}
            title="Vitals Monitor"
            description="PPG heart scan"
            onClick={() => navigate("/vitals")}
            color="destructive"
          />
          <QuickAction
            icon={Package}
            title="Incident Pack"
            description="View evidence"
            onClick={() => setShowIncidentPack(true)}
            color="accent"
          />
          <QuickAction
            icon={Users}
            title="Response Network"
            description="Manage contacts"
            onClick={() => navigate("/response")}
            color="safe"
          />
          <QuickAction
            icon={Calculator}
            title="Decoy Mode"
            description="Calculator cover"
            onClick={() => decoyMode.activateDecoy()}
            color="warning"
          />
          <QuickAction
            icon={Lock}
            title="Truth Lock"
            description="Seal evidence"
            onClick={() => navigate("/truth-lock")}
            color="destructive"
          />
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

      {/* Keyword Setup Dialog */}
      <KeywordSetupDialog
        open={showKeywordSetup}
        onOpenChange={setShowKeywordSetup}
        currentKeyword={emergencyKeyword}
        onSaveKeyword={saveKeyword}
      />

      {/* Incident Pack Viewer */}
      {showIncidentPack && (
        <IncidentPackViewer
          onClose={() => setShowIncidentPack(false)}
          incidents={recentActivity.map((a) => ({
            id: a.id,
            type: a.type,
            description: a.description,
            timestamp: new Date(a.created_at),
            location: a.location_address,
            status: a.status,
          }))}
          userId={user?.id || ""}
        />
      )}
    </DashboardLayout>
  );
}

function MonitoringCard({ icon: Icon, title, description, active }: {
  icon: any;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      active 
        ? "bg-primary/5 border-primary/30" 
        : "bg-secondary/30 border-border"
    )}>
      <Icon className={cn(
        "h-5 w-5 mb-2",
        active ? "text-primary" : "text-muted-foreground"
      )} />
      <p className="font-medium text-sm text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {active && (
        <div className="flex items-center gap-1 mt-2">
          <div className="h-1.5 w-1.5 rounded-full bg-safe animate-pulse" />
          <span className="text-[10px] text-safe">Active</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, onClick }: {
  icon: any;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-all text-left"
    >
      <Icon className="h-5 w-5 text-muted-foreground mb-2" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground truncate">{value}</p>
    </button>
  );
}

function QuickAction({ icon: Icon, title, description, onClick, color }: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  color: "primary" | "accent" | "safe" | "warning" | "destructive";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
    accent: "bg-accent/10 text-accent border-accent/30 hover:bg-accent/20",
    safe: "bg-safe/10 text-safe border-safe/30 hover:bg-safe/20",
    warning: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-all text-left",
        colorClasses[color]
      )}
    >
      <Icon className="h-6 w-6 mb-2" />
      <p className="font-medium text-sm text-foreground">{title}</p>
      <p className="text-xs opacity-70">{description}</p>
    </button>
  );
}
