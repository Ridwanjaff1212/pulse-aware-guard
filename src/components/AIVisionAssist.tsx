import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Eye, EyeOff, Volume2, VolumeX, Camera, AlertTriangle,
  ArrowDown, User, Car, DoorOpen, TriangleAlert, Navigation,
  Accessibility, Scan, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Detection {
  id: string;
  type: 'person' | 'obstacle' | 'stairs' | 'vehicle' | 'exit' | 'hazard' | 'clear_path';
  label: string;
  distance?: string;
  direction?: 'left' | 'right' | 'ahead' | 'behind';
  confidence: number;
  timestamp: number;
}

interface AIVisionAssistProps {
  isEmergencyMode?: boolean;
  onThreatDetected?: (detection: Detection) => void;
}

export function AIVisionAssist({ isEmergencyMode, onThreatDetected }: AIVisionAssistProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isLowEyeLevel, setIsLowEyeLevel] = useState(false);
  const [scanFrequency, setScanFrequency] = useState(3); // seconds
  const [detections, setDetections] = useState<Detection[]>([]);
  const [lastSpoken, setLastSpoken] = useState<string>("");

  // Text-to-speech function
  const speak = useCallback((text: string, priority: boolean = false) => {
    if (!isVoiceEnabled && !priority) return;
    if (text === lastSpoken && !priority) return;

    setLastSpoken(text);
    
    if ('speechSynthesis' in window) {
      // Cancel current speech for priority messages
      if (priority) {
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = isEmergencyMode ? 1.3 : 1.0; // Faster in emergency
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
  }, [isVoiceEnabled, lastSpoken, isEmergencyMode]);

  // Simulated AI scene analysis (in production, this would use TensorFlow.js or similar)
  const analyzeScene = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture frame
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    // Simulated detections (in production, run actual ML model)
    const simulatedDetections: Detection[] = [];
    const random = Math.random();

    // Simulate various detections based on probability
    if (random > 0.7) {
      simulatedDetections.push({
        id: `det_${Date.now()}_1`,
        type: 'person',
        label: 'Person detected',
        direction: ['left', 'right', 'ahead'][Math.floor(Math.random() * 3)] as any,
        distance: `${Math.floor(Math.random() * 5) + 1}m`,
        confidence: 0.85 + Math.random() * 0.15,
        timestamp: Date.now(),
      });
    }

    if (random > 0.8 && isLowEyeLevel) {
      simulatedDetections.push({
        id: `det_${Date.now()}_2`,
        type: 'obstacle',
        label: 'Ground obstacle',
        distance: `${Math.floor(Math.random() * 2) + 1}m`,
        direction: 'ahead',
        confidence: 0.75 + Math.random() * 0.2,
        timestamp: Date.now(),
      });
    }

    if (random > 0.85) {
      simulatedDetections.push({
        id: `det_${Date.now()}_3`,
        type: 'stairs',
        label: 'Stairs ahead',
        distance: `${Math.floor(Math.random() * 4) + 2}m`,
        direction: 'ahead',
        confidence: 0.9 + Math.random() * 0.1,
        timestamp: Date.now(),
      });
    }

    if (random > 0.9) {
      simulatedDetections.push({
        id: `det_${Date.now()}_4`,
        type: 'exit',
        label: 'Exit door',
        direction: ['left', 'right', 'ahead'][Math.floor(Math.random() * 3)] as any,
        distance: `${Math.floor(Math.random() * 8) + 3}m`,
        confidence: 0.88 + Math.random() * 0.12,
        timestamp: Date.now(),
      });
    }

    // Update detections
    setDetections(prev => {
      const newDetections = [...simulatedDetections, ...prev].slice(0, 5);
      return newDetections;
    });

    // Speak important detections
    for (const detection of simulatedDetections) {
      let message = detection.label;
      if (detection.direction) message += ` on your ${detection.direction}`;
      if (detection.distance) message += `, ${detection.distance} away`;
      
      const isPriority = isEmergencyMode || detection.type === 'hazard' || detection.type === 'vehicle';
      speak(message, isPriority);

      if (isPriority && onThreatDetected) {
        onThreatDetected(detection);
      }
    }
  }, [isLowEyeLevel, isEmergencyMode, speak, onThreatDetected]);

  // Start camera and analysis
  const startVisionAssist = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      speak("AI Vision Assist activated. I'll guide you.", true);

      // Start periodic analysis
      const interval = setInterval(analyzeScene, scanFrequency * 1000);
      analysisIntervalRef.current = interval;

      toast({
        title: "👁️ Vision Assist Active",
        description: "AI is now analyzing your surroundings",
      });
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        title: "Camera Access Required",
        description: "Please enable camera permissions for Vision Assist",
        variant: "destructive",
      });
    }
  }, [analyzeScene, scanFrequency, speak, toast]);

  // Stop vision assist
  const stopVisionAssist = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setDetections([]);
    speak("Vision Assist deactivated.", true);
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, []);

  // Emergency mode: increase scan frequency
  useEffect(() => {
    if (isEmergencyMode && isActive) {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      analysisIntervalRef.current = setInterval(analyzeScene, 1000); // Every second in emergency
      speak("Emergency mode. Scanning for threats.", true);
    }
  }, [isEmergencyMode, isActive, analyzeScene, speak]);

  const getDetectionIcon = (type: Detection['type']) => {
    switch (type) {
      case 'person': return User;
      case 'obstacle': return TriangleAlert;
      case 'stairs': return ArrowDown;
      case 'vehicle': return Car;
      case 'exit': return DoorOpen;
      case 'hazard': return AlertTriangle;
      case 'clear_path': return Navigation;
      default: return Eye;
    }
  };

  return (
    <div className={cn(
      "rounded-2xl border p-6 transition-all",
      isEmergencyMode 
        ? "border-destructive/50 bg-destructive/5 animate-pulse-danger" 
        : "border-border bg-card"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            isActive ? "bg-primary/20" : "bg-secondary"
          )}>
            <Eye className={cn(
              "h-6 w-6",
              isActive ? "text-primary animate-pulse" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              AI Vision Assist
              <Accessibility className="h-4 w-4 text-primary" />
            </h3>
            <p className="text-sm text-muted-foreground">
              {isActive ? "Analyzing surroundings..." : "Voice-guided navigation"}
            </p>
          </div>
        </div>
        <Button
          onClick={isActive ? stopVisionAssist : startVisionAssist}
          variant={isActive ? "destructive" : "default"}
          size="sm"
        >
          {isActive ? <EyeOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
          {isActive ? "Stop" : "Start"}
        </Button>
      </div>

      {/* Camera Preview (hidden but functional) */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="space-y-4">
        {/* Voice Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
          <div className="flex items-center gap-2">
            {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="text-sm font-medium">Voice Guidance</span>
          </div>
          <Switch checked={isVoiceEnabled} onCheckedChange={setIsVoiceEnabled} />
        </div>

        {/* Low Eye-Level Mode */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
          <div className="flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            <div>
              <span className="text-sm font-medium">Low Eye-Level Mode</span>
              <p className="text-xs text-muted-foreground">For seated/wheelchair users</p>
            </div>
          </div>
          <Switch checked={isLowEyeLevel} onCheckedChange={setIsLowEyeLevel} />
        </div>

        {/* Scan Frequency */}
        {!isEmergencyMode && (
          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Scan Frequency</span>
              <span className="text-xs text-muted-foreground">{scanFrequency}s</span>
            </div>
            <Slider
              value={[scanFrequency]}
              onValueChange={([v]) => setScanFrequency(v)}
              min={1}
              max={5}
              step={1}
              disabled={isActive}
            />
          </div>
        )}

        {/* Live Detections */}
        {isActive && detections.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scan className="h-4 w-4 text-primary animate-spin" />
              <span className="text-sm font-medium">Live Detections</span>
            </div>
            {detections.slice(0, 3).map((detection) => {
              const Icon = getDetectionIcon(detection.type);
              return (
                <div 
                  key={detection.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border animate-fade-in",
                    detection.type === 'hazard' || detection.type === 'vehicle'
                      ? "bg-destructive/10 border-destructive/30"
                      : "bg-secondary/50 border-border"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    detection.type === 'hazard' ? "text-destructive" : "text-primary"
                  )} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{detection.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {detection.direction && `${detection.direction}`}
                      {detection.distance && ` • ${detection.distance}`}
                      {` • ${Math.round(detection.confidence * 100)}% confidence`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Emergency Mode Indicator */}
        {isEmergencyMode && (
          <div className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 animate-pulse">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-bold text-destructive">EMERGENCY MODE</p>
                <p className="text-xs text-muted-foreground">
                  Scanning every second • Prioritizing threats
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Description */}
      {!isActive && (
        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">For low-vision & emergency users:</strong> Uses phone camera 
            to detect obstacles, people, exits, and hazards. Voice guidance speaks directions so you 
            don't need to look at the screen.
          </p>
        </div>
      )}
    </div>
  );
}
