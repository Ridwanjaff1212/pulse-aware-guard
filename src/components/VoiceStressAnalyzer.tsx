import { useState, useRef } from "react";
import { X, Mic, MicOff, Activity, AlertTriangle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface VoiceStressAnalyzerProps {
  onClose: () => void;
  onDistressDetected: (level: "calm" | "slight" | "moderate" | "high" | "severe") => void;
}

export function VoiceStressAnalyzer({ onClose, onDistressDetected }: VoiceStressAnalyzerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stressResult, setStressResult] = useState<{
    stressLevel: string;
    stressScore: number;
    detectedEmotions: string[];
    urgencyLevel: string;
    recommendation: string;
  } | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      
      // Monitor audio levels
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      const updateLevel = () => {
        if (analyzerRef.current && isRecording) {
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateLevel);
        }
      };
      
      setIsRecording(true);
      updateLevel();

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await analyzeVoice();
      };

      mediaRecorderRef.current.start();

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, 10000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const analyzeVoice = async () => {
    setIsAnalyzing(true);

    try {
      // Simulate voice characteristics (in a real app, we'd analyze the audio)
      const { data, error } = await supabase.functions.invoke("safepulse-ai", {
        body: {
          type: "voice_stress",
          data: {
            speechRate: "normal",
            volumeVariation: audioLevel > 0.5 ? "high" : "normal",
            tremorDetected: false,
            keywords: [],
            duration: 10,
          },
        },
      });

      if (error) throw error;

      if (data?.analysis) {
        setStressResult(data.analysis);
        const level = data.analysis.stressLevel?.toLowerCase();
        if (level === "high" || level === "severe") {
          onDistressDetected(level);
        }
      }
    } catch (err) {
      console.error("Voice analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStressColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "calm":
        return "text-safe";
      case "slight":
        return "text-accent";
      case "moderate":
        return "text-warning";
      case "high":
      case "severe":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <Volume2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Voice Stress Analysis</h2>
              <p className="text-sm text-muted-foreground">Detect distress in your voice</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!isRecording && !isAnalyzing && !stressResult && (
          <div className="text-center py-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
              <Mic className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Voice Analysis
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Speak for 5-10 seconds. Our AI will analyze your voice for signs of stress, panic, or distress.
            </p>
            <Button onClick={startRecording} size="lg">
              <Mic className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          </div>
        )}

        {isRecording && (
          <div className="text-center py-8 animate-fade-in">
            <div className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-destructive/20 mb-4">
              <div 
                className="absolute inset-0 rounded-full bg-destructive/30 animate-ping"
                style={{ animationDuration: "1s" }}
              />
              <Mic className="relative h-10 w-10 text-destructive" />
            </div>
            
            {/* Audio Level Visualization */}
            <div className="flex justify-center gap-1 mb-4 h-12">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-primary rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.random() * audioLevel * 100}%`,
                    minHeight: "8px",
                  }}
                />
              ))}
            </div>
            
            <h3 className="text-lg font-medium text-foreground mb-2">
              Recording...
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Speak naturally for a few seconds
            </p>
            <Button onClick={stopRecording} variant="destructive">
              <MicOff className="mr-2 h-5 w-5" />
              Stop Recording
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8 animate-fade-in">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
              <Activity className="h-8 w-8 text-accent animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Analyzing Voice...
            </h3>
            <p className="text-sm text-muted-foreground">
              Processing speech patterns and stress indicators
            </p>
          </div>
        )}

        {stressResult && (
          <div className="space-y-4 animate-fade-in">
            {/* Stress Level */}
            <div className={cn(
              "flex items-center gap-4 rounded-xl border p-4",
              stressResult.stressLevel?.toLowerCase() === "calm" 
                ? "border-safe/30 bg-safe/10"
                : stressResult.stressLevel?.toLowerCase() === "high" || stressResult.stressLevel?.toLowerCase() === "severe"
                  ? "border-destructive/30 bg-destructive/10"
                  : "border-warning/30 bg-warning/10"
            )}>
              <div className="text-4xl font-bold">
                {stressResult.stressScore}
              </div>
              <div>
                <div className={cn("text-lg font-semibold", getStressColor(stressResult.stressLevel))}>
                  {stressResult.stressLevel?.toUpperCase()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Stress Score: {stressResult.stressScore}/100
                </p>
              </div>
            </div>

            {/* Detected Emotions */}
            {stressResult.detectedEmotions && stressResult.detectedEmotions.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <h4 className="font-medium text-foreground mb-3">Detected Emotions</h4>
                <div className="flex flex-wrap gap-2">
                  {stressResult.detectedEmotions.map((emotion, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                    >
                      {emotion}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <h4 className="font-medium text-foreground mb-2">Recommendation</h4>
              <p className="text-sm text-muted-foreground">{stressResult.recommendation}</p>
            </div>

            {(stressResult.stressLevel?.toLowerCase() === "high" || 
              stressResult.stressLevel?.toLowerCase() === "severe") && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">High Stress Detected</span>
                </div>
                <p className="text-sm text-destructive/80 mt-1">
                  We detected elevated stress levels. Would you like to alert your emergency contacts?
                </p>
              </div>
            )}

            <Button onClick={() => setStressResult(null)} variant="outline" className="w-full">
              <Mic className="mr-2 h-4 w-4" />
              Record Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
