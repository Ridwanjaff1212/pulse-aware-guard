import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic, MicOff, Activity, Smartphone, Volume2, AlertTriangle, 
  ArrowLeft, Settings, Check, X, Radio, Waves, Zap, Shield,
  Clock, TrendingUp, Eye, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  const [voiceStressLevel, setVoiceStressLevel] = useState(0);
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [heartRateSimulated, setHeartRateSimulated] = useState(72);
  const [detectionHistory, setDetectionHistory] = useState<Array<{
    type: string;
    message: string;
    time: Date;
    severity: "low" | "medium" | "high";
  }>>([]);
  
  const recognitionRef = useRef<any>(null);
  const motionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

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

  const addToHistory = (type: string, message: string, severity: "low" | "medium" | "high") => {
    setDetectionHistory((prev) => [
      { type, message, time: new Date(), severity },
      ...prev.slice(0, 9),
    ]);
  };

  const startVoiceDetection = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    // Start audio analysis for stress detection
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Analyze audio for stress patterns
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const analyzeStress = () => {
        if (!analyserRef.current || !isListening) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(100, (average / 128) * 100);
        setVoiceStressLevel(Math.round(normalized));
        
        if (normalized > 70) {
          addToHistory("voice", "High stress level detected in voice", "high");
        }
        
        if (isListening) {
          requestAnimationFrame(analyzeStress);
        }
      };
      requestAnimationFrame(analyzeStress);
    } catch (e) {
      console.log("Audio analysis not available");
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
        checkForDistress(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        addToHistory("error", `Voice detection error: ${event.error}`, "medium");
      }
    };

    recognitionRef.current.onend = () => {
      if (isListening) {
        recognitionRef.current?.start();
      }
    };

    recognitionRef.current.start();
    setIsListening(true);
    addToHistory("voice", "Voice detection activated", "low");
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
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
    setVoiceStressLevel(0);
    addToHistory("voice", "Voice detection stopped", "low");
  };

  const checkForKeyword = async (text: string) => {
    const normalizedText = text.toLowerCase().trim();
    const normalizedKeyword = emergencyKeyword.toLowerCase().trim();
    
    if (normalizedText.includes(normalizedKeyword)) {
      stopVoiceDetection();
      
      toast({
        title: "🚨 EMERGENCY KEYWORD DETECTED",
        description: "Activating emergency protocols...",
        variant: "destructive",
      });

      addToHistory("emergency", `Keyword "${emergencyKeyword}" detected!`, "high");

      await supabase.from("safety_incidents").insert({
        user_id: user!.id,
        type: "voice_keyword",
        description: `Emergency keyword "${emergencyKeyword}" was detected.`,
        status: "active",
        voice_stress_score: voiceStressLevel,
      });

      setTimeout(() => navigate("/response"), 1500);
    }
  };

  const checkForDistress = (text: string) => {
    const distressWords = ["help", "stop", "no", "please", "emergency", "scared", "danger", "hurt", "pain", "call"];
    const found = distressWords.filter(word => text.toLowerCase().includes(word));
    
    if (found.length >= 2) {
      addToHistory("distress", `Multiple distress words detected: ${found.join(", ")}`, "high");
      toast({
        title: "Distress Detected",
        description: `Detected: ${found.join(", ")}`,
        variant: "destructive",
      });
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
    addToHistory("motion", "Motion detection activated", "low");
    
    const handleMotion = (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      const totalAcceleration = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
      
      setMotionIntensity(Math.min(100, Math.round((totalAcceleration / 30) * 100)));

      if (totalAcceleration > 25) {
        setDetectedMotion("⚠️ Sudden Impact Detected");
        addToHistory("motion", "Sudden impact detected - potential fall", "high");
        toast({
          title: "🚨 Motion Alert",
          description: "Sudden movement detected. Are you okay?",
          variant: "destructive",
        });
      } else if (totalAcceleration > 18) {
        setDetectedMotion("Running/Fast Movement");
        addToHistory("motion", "Fast movement detected", "medium");
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    toast({ title: "Motion Detection Active", description: "Monitoring for falls and sudden movements." });

    // Simulate heart rate changes
    motionIntervalRef.current = setInterval(() => {
      setHeartRateSimulated((prev) => {
        const change = Math.random() * 10 - 5;
        const newRate = Math.max(60, Math.min(120, prev + change));
        
        if (newRate > 100) {
          addToHistory("biometric", "Elevated heart rate detected", "medium");
        }
        
        return Math.round(newRate);
      });
    }, 3000);
  };

  const stopMotionDetection = () => {
    setMotionActive(false);
    setDetectedMotion(null);
    setMotionIntensity(0);
    
    if (motionIntervalRef.current) {
      clearInterval(motionIntervalRef.current);
    }
    
    addToHistory("motion", "Motion detection stopped", "low");
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
            Dashboard
          </button>
          <h1 className="font-semibold text-foreground">Smart Detection</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            icon={Waves}
            label="Voice Stress"
            value={voiceStressLevel}
            unit="%"
            color={voiceStressLevel > 70 ? "destructive" : voiceStressLevel > 40 ? "warning" : "safe"}
          />
          <MetricCard
            icon={Activity}
            label="Motion"
            value={motionIntensity}
            unit="%"
            color={motionIntensity > 70 ? "destructive" : motionIntensity > 40 ? "warning" : "safe"}
          />
          <MetricCard
            icon={Heart}
            label="Heart Rate"
            value={heartRateSimulated}
            unit="bpm"
            color={heartRateSimulated > 100 ? "warning" : "safe"}
          />
        </div>

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
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Voice Keyword Detection</h2>
              <p className="text-sm text-muted-foreground">
                Listening for: "{emergencyKeyword}"
              </p>
            </div>
            {isListening && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-destructive font-medium">LIVE</span>
              </div>
            )}
          </div>

          {/* Voice Stress Meter */}
          {isListening && (
            <div className="mb-4 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Voice Stress Level</span>
                <span className={cn(
                  "text-sm font-bold",
                  voiceStressLevel > 70 ? "text-destructive" : 
                  voiceStressLevel > 40 ? "text-warning" : "text-safe"
                )}>
                  {voiceStressLevel}%
                </span>
              </div>
              <Progress 
                value={voiceStressLevel} 
                className={cn(
                  "h-2",
                  voiceStressLevel > 70 ? "[&>div]:bg-destructive" : 
                  voiceStressLevel > 40 ? "[&>div]:bg-warning" : "[&>div]:bg-safe"
                )}
              />
            </div>
          )}

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
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Change Keyword
            </Button>
          </div>
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
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Fall & Motion Detection</h2>
              <p className="text-sm text-muted-foreground">
                Uses accelerometer to detect falls and impacts
              </p>
            </div>
          </div>

          {/* Motion Intensity Meter */}
          {motionActive && (
            <div className="mb-4 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Motion Intensity</span>
                <span className={cn(
                  "text-sm font-bold",
                  motionIntensity > 70 ? "text-destructive" : 
                  motionIntensity > 40 ? "text-warning" : "text-safe"
                )}>
                  {motionIntensity}%
                </span>
              </div>
              <Progress 
                value={motionIntensity} 
                className={cn(
                  "h-2",
                  motionIntensity > 70 ? "[&>div]:bg-destructive" : 
                  motionIntensity > 40 ? "[&>div]:bg-warning" : "[&>div]:bg-safe"
                )}
              />
            </div>
          )}

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

        {/* Detection History */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Detection History
          </h3>
          {detectionHistory.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {detectionHistory.map((item, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 p-2 rounded-lg text-sm",
                  item.severity === "high" ? "bg-destructive/10" :
                  item.severity === "medium" ? "bg-warning/10" : "bg-secondary/50"
                )}>
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    item.severity === "high" ? "bg-destructive" :
                    item.severity === "medium" ? "bg-warning" : "bg-safe"
                  )} />
                  <span className="flex-1 text-foreground">{item.message}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.time.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No detections yet. Start monitoring to see activity.
            </p>
          )}
        </div>

        {/* Status Summary */}
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
          <h3 className="font-medium text-foreground mb-3">Detection Status</h3>
          <div className="space-y-2">
            <StatusRow 
              label="Voice Detection" 
              active={isListening} 
            />
            <StatusRow 
              label="Motion Detection" 
              active={motionActive} 
            />
            <StatusRow 
              label="Stress Analysis" 
              active={isListening && voiceStressLevel > 0} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, color }: {
  icon: any;
  label: string;
  value: number;
  unit: string;
  color: "safe" | "warning" | "destructive";
}) {
  const colorClasses = {
    safe: "text-safe",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  return (
    <div className="p-3 rounded-xl border border-border bg-card">
      <Icon className={cn("h-4 w-4 mb-1", colorClasses[color])} />
      <p className={cn("text-2xl font-bold", colorClasses[color])}>
        {value}<span className="text-xs">{unit}</span>
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "flex items-center gap-1 text-sm font-medium",
        active ? "text-safe" : "text-muted-foreground"
      )}>
        {active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}
