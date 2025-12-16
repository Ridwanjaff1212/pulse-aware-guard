import { useState, useRef } from "react";
import { Mic, MicOff, Check, RefreshCw, Volume2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VoiceTrainingProps {
  keyword: string;
  onComplete: (voiceProfile: string) => void;
}

export function VoiceTraining({ keyword, onComplete }: VoiceTrainingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [currentRecording, setCurrentRecording] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "complete">("idle");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const requiredRecordings = 3;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio analysis for visual feedback
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Start analyzing audio levels
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          requestAnimationFrame(updateLevel);
        }
      };
      
      // Setup recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => [...prev, url]);
        setCurrentRecording((prev) => prev + 1);
        stream.getTracks().forEach((track) => track.stop());
        
        if (recordings.length + 1 >= requiredRecordings) {
          setStatus("processing");
          // Simulate voice profile processing
          setTimeout(() => {
            setStatus("complete");
            onComplete(`voice_profile_${Date.now()}`);
          }, 2000);
        } else {
          setStatus("idle");
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus("recording");
      requestAnimationFrame(updateLevel);

      // Auto-stop after 3 seconds
      setTimeout(() => {
        stopRecording();
      }, 3000);
    } catch (error) {
      console.error("Microphone error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const resetTraining = () => {
    setRecordings([]);
    setCurrentRecording(0);
    setStatus("idle");
  };

  const playRecording = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Voice Samples</span>
        <span className="text-sm font-medium text-foreground">
          {recordings.length} / {requiredRecordings}
        </span>
      </div>
      <Progress value={(recordings.length / requiredRecordings) * 100} className="h-2" />

      {/* Recording UI */}
      <div className="p-6 rounded-2xl border border-border bg-secondary/30 text-center">
        {status === "complete" ? (
          <div className="space-y-4 animate-fade-in">
            <div className="h-20 w-20 rounded-full bg-safe/20 flex items-center justify-center mx-auto">
              <Check className="h-10 w-10 text-safe" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Voice Profile Created</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your voice will be recognized when you say "{keyword}"
              </p>
            </div>
          </div>
        ) : status === "processing" ? (
          <div className="space-y-4 animate-fade-in">
            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Processing Voice Profile</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Creating your unique voice signature...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Keyword Display */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Say this phrase clearly:</p>
              <p className="text-2xl font-bold text-primary">"{keyword}"</p>
            </div>

            {/* Recording Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={recordings.length >= requiredRecordings}
              className={cn(
                "h-24 w-24 rounded-full flex items-center justify-center mx-auto transition-all",
                isRecording
                  ? "bg-destructive animate-pulse scale-110"
                  : "bg-primary hover:scale-105"
              )}
            >
              {isRecording ? (
                <MicOff className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </button>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="mt-6 space-y-2 animate-fade-in">
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full transition-all duration-75",
                        i < (audioLevel / 5) ? "bg-destructive" : "bg-muted"
                      )}
                      style={{ height: `${Math.random() * 20 + 10}px` }}
                    />
                  ))}
                </div>
                <p className="text-xs text-destructive font-medium">Recording...</p>
              </div>
            )}

            {!isRecording && recordings.length < requiredRecordings && (
              <p className="mt-4 text-sm text-muted-foreground">
                Tap the microphone and say your keyword
              </p>
            )}
          </>
        )}
      </div>

      {/* Previous Recordings */}
      {recordings.length > 0 && status !== "complete" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Recorded Samples</p>
          <div className="flex gap-2">
            {recordings.map((url, i) => (
              <button
                key={i}
                onClick={() => playRecording(url)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border"
              >
                <Volume2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Sample {i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset Button */}
      {(recordings.length > 0 || status === "complete") && (
        <Button variant="outline" onClick={resetTraining} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Start Over
        </Button>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tips for best results:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Speak clearly at normal volume</li>
              <li>Record in a quiet environment</li>
              <li>Say the exact phrase each time</li>
              <li>Use your natural voice tone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
