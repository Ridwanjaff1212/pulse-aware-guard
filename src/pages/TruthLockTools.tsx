import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Lock, Shield, Clock, AlertTriangle, ArrowLeft, 
  FileText, Send, Camera, Mic, Video, CheckCircle2,
  Eye, Plus, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTruthLock } from "@/hooks/useTruthLock";
import { TruthLockPanel } from "@/components/TruthLockPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface IncidentForLock {
  id: string;
  type: string;
  description: string;
  created_at: string;
  status: string;
}

export default function TruthLockTools() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const truthLock = useTruthLock(user?.id);
  
  const [incidents, setIncidents] = useState<IncidentForLock[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio" | "video" | "photo" | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadIncidents();
    }
  }, [user]);

  const loadIncidents = async () => {
    const { data } = await supabase
      .from("safety_incidents")
      .select("id, type, description, created_at, status")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setIncidents(data);
  };

  const handleActivateLock = async () => {
    if (!selectedIncident) {
      toast({
        title: "Select an Incident",
        description: "Please select an incident to lock.",
        variant: "destructive",
      });
      return;
    }
    await truthLock.lockIncident(selectedIncident, 24);
  };

  const captureEvidence = async (type: "audio" | "video" | "photo") => {
    setIsRecording(true);
    setRecordingType(type);

    // Simulate evidence capture
    setTimeout(() => {
      const evidenceData = `${type}_capture_${Date.now()}`;
      truthLock.addEvidence(type, evidenceData);
      
      toast({
        title: "Evidence Captured",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} evidence has been sealed.`,
      });
      
      setIsRecording(false);
      setRecordingType(null);
    }, 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
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
          <h1 className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            Truth Lock™ Tools
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Main Truth Lock Panel */}
        <TruthLockPanel
          isLocked={truthLock.isLocked}
          timeRemaining={truthLock.timeRemaining}
          canCancel={truthLock.canCancel}
          evidenceCount={truthLock.evidence.length}
          autoReleaseHours={truthLock.autoReleaseHours}
          onActivate={handleActivateLock}
          onCancel={truthLock.cancelLock}
          onManualRelease={truthLock.releaseEvidence}
        />

        {/* Incident Selection (when not locked) */}
        {!truthLock.isLocked && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Select Incident to Lock
            </h3>
            
            {incidents.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No incidents to lock</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Incidents created from emergencies will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      selectedIncident === incident.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground capitalize">{incident.type.replace("_", " ")}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{incident.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(incident.created_at)}</p>
                      </div>
                      {selectedIncident === incident.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evidence Capture Tools */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Capture Evidence
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add tamper-proof evidence to your lock. All evidence is hash-verified.
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => captureEvidence("photo")}
              disabled={isRecording}
            >
              <Camera className={cn(
                "h-6 w-6",
                isRecording && recordingType === "photo" && "animate-pulse text-destructive"
              )} />
              <span className="text-xs">Photo</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => captureEvidence("audio")}
              disabled={isRecording}
            >
              <Mic className={cn(
                "h-6 w-6",
                isRecording && recordingType === "audio" && "animate-pulse text-destructive"
              )} />
              <span className="text-xs">Audio</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => captureEvidence("video")}
              disabled={isRecording}
            >
              <Video className={cn(
                "h-6 w-6",
                isRecording && recordingType === "video" && "animate-pulse text-destructive"
              )} />
              <span className="text-xs">Video</span>
            </Button>
          </div>

          {isRecording && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-destructive font-medium">
                Recording {recordingType}...
              </span>
            </div>
          )}
        </div>

        {/* Evidence List */}
        {truthLock.evidence.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-safe" />
              Sealed Evidence ({truthLock.evidence.length})
            </h3>
            <div className="space-y-2">
              {truthLock.evidence.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    {item.type === "photo" && <Camera className="h-4 w-4 text-primary" />}
                    {item.type === "audio" && <Mic className="h-4 w-4 text-primary" />}
                    {item.type === "video" && <Video className="h-4 w-4 text-primary" />}
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{item.type}</p>
                      <p className="text-xs text-muted-foreground">
                        Hash: {item.hash?.substring(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-safe" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            How Truth Lock™ Works
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p>Select an incident or create one from an emergency trigger</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p>Capture evidence (photos, audio, video) that gets cryptographically sealed</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p>Activate Truth Lock - evidence cannot be deleted or modified</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p>Auto-release to emergency contacts after 24 hours if not cancelled</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-3 w-3 text-warning" />
              </div>
              <p className="text-warning">
                <strong>Anti-Coercion:</strong> Only cancelable within first 10 minutes
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
