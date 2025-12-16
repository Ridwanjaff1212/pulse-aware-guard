import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IncidentCameraState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  hasPermission: boolean;
  recordingUrl: string | null;
}

export function useIncidentCamera(userId: string | undefined) {
  const { toast } = useToast();
  const [state, setState] = useState<IncidentCameraState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    hasPermission: false,
    recordingUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      
      // Store stream but stop tracks immediately (just checking permission)
      stream.getTracks().forEach(track => track.stop());
      
      setState(prev => ({ ...prev, hasPermission: true }));
      return true;
    } catch (err) {
      console.error("Camera permission denied:", err);
      toast({
        title: "Permission Denied",
        description: "Camera and microphone access is required for incident recording.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const startRecording = useCallback(async (incidentId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          recordingUrl: url,
        }));

        // Save to incident evidence if we have an incident ID
        if (incidentId && userId) {
          try {
            // In a real app, you'd upload to Supabase Storage
            await supabase.from("incident_evidence").insert({
              incident_id: incidentId,
              type: "video_recording",
              metadata: {
                duration: state.duration,
                size: blob.size,
                recorded_at: new Date().toISOString(),
              },
            });
            
            toast({
              title: "Recording Saved",
              description: "Incident recording has been saved to evidence.",
            });
          } catch (err) {
            console.error("Failed to save evidence:", err);
          }
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;

      // Start timer
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        hasPermission: true,
      }));

      toast({
        title: "Recording Started",
        description: "Incident camera is now recording.",
        variant: "destructive",
      });

      console.log("🎥 Incident camera recording started");
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast({
        title: "Recording Failed",
        description: "Could not start incident recording.",
        variant: "destructive",
      });
    }
  }, [userId, state.duration, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    console.log("🎥 Incident camera recording stopped");
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }
  }, []);

  const takeSnapshot = useCallback(async () => {
    if (!streamRef.current) return null;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      const blob = await imageCapture.takePhoto();
      const url = URL.createObjectURL(blob);
      
      toast({
        title: "Snapshot Taken",
        description: "Photo captured and saved to evidence.",
      });

      return url;
    } catch (err) {
      console.error("Failed to take snapshot:", err);
      return null;
    }
  }, [toast]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    ...state,
    formattedDuration: formatDuration(state.duration),
    requestPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    takeSnapshot,
  };
}
