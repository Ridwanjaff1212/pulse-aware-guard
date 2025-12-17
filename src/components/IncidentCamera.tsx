import { useRef, useEffect } from "react";
import { Video, VideoOff, Camera, Pause, Play, Square, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIncidentCamera } from "@/hooks/useIncidentCamera";

interface IncidentCameraProps {
  userId: string | undefined;
  incidentId?: string;
  autoStart?: boolean;
  className?: string;
}

export function IncidentCamera({ userId, incidentId, autoStart, className }: IncidentCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    isRecording,
    isPaused,
    formattedDuration,
    hasPermission,
    recordingUrl,
    requestPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    takeSnapshot,
  } = useIncidentCamera(userId);

  useEffect(() => {
    if (autoStart && hasPermission) {
      startRecording(incidentId);
    }
  }, [autoStart, hasPermission, incidentId]);

  useEffect(() => {
    // Setup video preview
    const setupPreview = async () => {
      if (isRecording && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
          videoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Preview error:", err);
        }
      }
    };
    
    setupPreview();
    
    const currentVideoRef = videoRef.current;
    return () => {
      if (currentVideoRef?.srcObject) {
        const stream = currentVideoRef.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  if (recordingUrl) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-safe" />
            Recording Complete
          </h3>
        </div>
        <div className="aspect-video bg-black">
          <video
            src={recordingUrl}
            controls
            className="w-full h-full"
          />
        </div>
        <div className="p-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.open(recordingUrl)}>
            Download
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={() => startRecording(incidentId)}
          >
            New Recording
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Video className={cn("h-5 w-5", isRecording ? "text-destructive" : "text-muted-foreground")} />
          Incident Camera
        </h3>
        {isRecording && (
          <div className="flex items-center gap-2">
            <Circle className="h-3 w-3 fill-destructive text-destructive animate-pulse" />
            <span className="text-sm font-mono text-destructive">{formattedDuration}</span>
          </div>
        )}
      </div>

      {/* Video Preview */}
      <div className="aspect-video bg-black relative">
        {isRecording ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {isPaused && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">PAUSED</span>
              </div>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/80 px-3 py-1 rounded-full">
              <Circle className="h-2 w-2 fill-white animate-pulse" />
              <span className="text-xs text-white font-medium">REC</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <VideoOff className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Camera not active</p>
            <p className="text-xs mt-1">Start recording to capture evidence</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        {!hasPermission ? (
          <Button className="w-full" onClick={requestPermission}>
            <Video className="h-4 w-4 mr-2" />
            Enable Camera Access
          </Button>
        ) : !isRecording ? (
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => startRecording(incidentId)}
          >
            <Circle className="h-4 w-4 mr-2 fill-current" />
            Start Recording
          </Button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={isPaused ? resumeRecording : pauseRecording}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={takeSnapshot}
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </div>
        )}

        {isRecording && (
          <p className="text-xs text-center text-muted-foreground">
            Recording will be saved as evidence
          </p>
        )}
      </div>
    </div>
  );
}
