import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic, MicOff, Activity, Smartphone, Volume2, AlertTriangle, 
  ArrowLeft, Settings, Check, X, Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function SmartDetection() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isListening, setIsListening] = useState(false);
  const [emergencyKeyword, setEmergencyKeyword] = useState("Help me now");
  const [transcript, setTranscript] = useState("");
  const [motionActive, setMotionActive] = useState(false);
  const [detectedMotion, setDetectedMotion] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("emergency_keyword")
      .eq("user_id", user!.id)
      .maybeSingle();
    
    if (data?.emergency_keyword) {
      setEmergencyKeyword(data.emergency_keyword);
    }
  };

  const startVoiceDetection = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript);
        checkForKeyword(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        toast({
          title: "Voice Detection Error",
          description: `Error: ${event.error}`,
          variant: "destructive",
        });
      }
    };

    recognitionRef.current.onend = () => {
      if (isListening) {
        recognitionRef.current?.start();
      }
    };

    recognitionRef.current.start();
    setIsListening(true);
    toast({
      title: "Voice Detection Active",
      description: `Listening for: "${emergencyKeyword}"`,
    });
  };

  const stopVoiceDetection = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
  };

  const checkForKeyword = async (text: string) => {
    const normalizedText = text.toLowerCase().trim();
    const normalizedKeyword = emergencyKeyword.toLowerCase().trim();
    
    if (normalizedText.includes(normalizedKeyword)) {
      stopVoiceDetection();
      
      // Trigger emergency
      toast({
        title: "EMERGENCY KEYWORD DETECTED",
        description: "Activating emergency protocols...",
        variant: "destructive",
      });

      // Create incident
      await supabase.from("safety_incidents").insert({
        user_id: user!.id,
        type: "Voice Keyword Triggered",
        description: `Emergency keyword "${emergencyKeyword}" was detected.`,
        status: "active",
      });

      // Navigate to response
      setTimeout(() => navigate("/response"), 1500);
    }
  };

  const startMotionDetection = () => {
    if (!('DeviceMotionEvent' in window)) {
      toast({
        title: "Not Supported",
        description: "Motion detection is not supported on this device.",
        variant: "destructive",
      });
      return;
    }

    setMotionActive(true);
    
    const handleMotion = (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      const totalAcceleration = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);

      // Detect sudden movements (potential fall)
      if (totalAcceleration > 25) {
        setDetectedMotion("Sudden Movement Detected");
        toast({
          title: "Motion Alert",
          description: "Sudden movement detected. Are you okay?",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    toast({ title: "Motion Detection Active", description: "Monitoring for falls and sudden movements." });
  };

  const stopMotionDetection = () => {
    setMotionActive(false);
    setDetectedMotion(null);
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
          <h1 className="font-semibold text-foreground">Smart Detection</h1>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Voice Keyword Detection */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors",
              isListening ? "bg-destructive/20" : "bg-primary/10"
            )}>
              {isListening ? (
                <Radio className="h-7 w-7 text-destructive animate-pulse" />
              ) : (
                <Mic className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Voice Keyword Detection</h2>
              <p className="text-sm text-muted-foreground">
                Listening for: "{emergencyKeyword}"
              </p>
            </div>
          </div>

          {isListening && transcript && (
            <div className="mb-4 p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Detected speech:</p>
              <p className="text-foreground font-medium">{transcript}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={isListening ? stopVoiceDetection : startVoiceDetection}
              variant={isListening ? "destructive" : "default"}
              className="w-full"
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Listening
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate("/onboarding")}>
              <Settings className="mr-2 h-4 w-4" />
              Change Keyword
            </Button>
          </div>

          {isListening && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Actively listening for emergency keyword...
            </div>
          )}
        </div>

        {/* Motion Detection */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center",
              motionActive ? "bg-warning/20" : "bg-accent/10"
            )}>
              <Smartphone className={cn("h-7 w-7", motionActive ? "text-warning" : "text-accent")} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Fall & Motion Detection</h2>
              <p className="text-sm text-muted-foreground">
                Uses accelerometer to detect falls
              </p>
            </div>
          </div>

          {detectedMotion && (
            <div className="mb-4 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <p className="text-warning font-medium">{detectedMotion}</p>
              </div>
            </div>
          )}

          <Button
            onClick={motionActive ? stopMotionDetection : startMotionDetection}
            variant={motionActive ? "outline" : "secondary"}
            className="w-full"
          >
            {motionActive ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Stop Motion Detection
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Enable Motion Detection
              </>
            )}
          </Button>
        </div>

        {/* Voice Stress Analysis */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Volume2 className="h-7 w-7 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Voice Stress Analysis</h2>
              <p className="text-sm text-muted-foreground">
                AI analyzes voice for signs of distress
              </p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => navigate("/ai-engine")}>
            <Activity className="mr-2 h-4 w-4" />
            Open AI Analysis
          </Button>
        </div>

        {/* Status Summary */}
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
          <h3 className="font-medium text-foreground mb-3">Detection Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Voice Detection</span>
              <span className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isListening ? "text-safe" : "text-muted-foreground"
              )}>
                {isListening ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {isListening ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Motion Detection</span>
              <span className={cn(
                "flex items-center gap-1 text-sm font-medium",
                motionActive ? "text-safe" : "text-muted-foreground"
              )}>
                {motionActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {motionActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}