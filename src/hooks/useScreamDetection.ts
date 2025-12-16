import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface ScreamState {
  isListening: boolean;
  isScreamDetected: boolean;
  currentVolume: number;
  peakFrequency: number;
  screamConfidence: number;
  lastScreamTime: Date | null;
}

// Scream detection parameters
const SCREAM_VOLUME_THRESHOLD = 0.7; // 70% of max volume
const SCREAM_FREQUENCY_MIN = 1000; // Hz - typical scream range
const SCREAM_FREQUENCY_MAX = 4000; // Hz
const SCREAM_DURATION_MIN = 500; // ms - minimum scream duration
const PANIC_PITCH_VARIANCE = 200; // Hz - rapid pitch changes indicate panic

export function useScreamDetection(onScreamDetected: (confidence: number) => void) {
  const { toast } = useToast();
  const [state, setState] = useState<ScreamState>({
    isListening: false,
    isScreamDetected: false,
    currentVolume: 0,
    peakFrequency: 0,
    screamConfidence: 0,
    lastScreamTime: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const screamStartRef = useRef<number | null>(null);
  const frequencyHistoryRef = useRef<number[]>([]);
  const volumeHistoryRef = useRef<number[]>([]);

  const detectScream = useCallback((
    volume: number,
    dominantFrequency: number,
    frequencyVariance: number
  ): number => {
    let confidence = 0;

    // Volume check - screams are loud
    if (volume > SCREAM_VOLUME_THRESHOLD) {
      confidence += 30 * (volume / 1);
    }

    // Frequency check - screams are high pitched
    if (dominantFrequency >= SCREAM_FREQUENCY_MIN && dominantFrequency <= SCREAM_FREQUENCY_MAX) {
      const normalizedFreq = (dominantFrequency - SCREAM_FREQUENCY_MIN) / (SCREAM_FREQUENCY_MAX - SCREAM_FREQUENCY_MIN);
      confidence += 30 * normalizedFreq;
    }

    // Panic indicator - rapid pitch changes
    if (frequencyVariance > PANIC_PITCH_VARIANCE) {
      confidence += 20 * Math.min(1, frequencyVariance / 500);
    }

    // Duration check - screams last at least 0.5 seconds
    if (screamStartRef.current && Date.now() - screamStartRef.current > SCREAM_DURATION_MIN) {
      confidence += 20;
    }

    return Math.min(100, confidence);
  }, []);

  const getDominantFrequency = useCallback((dataArray: Uint8Array, sampleRate: number): number => {
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }
    
    return (maxIndex * sampleRate) / (2 * dataArray.length);
  }, []);

  const getFrequencyVariance = useCallback((history: number[]): number => {
    if (history.length < 2) return 0;
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    return Math.sqrt(variance);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.3;

      const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
      const timeDomainData = new Uint8Array(analyserRef.current.fftSize);

      const analyze = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        analyserRef.current.getByteFrequencyData(frequencyData);
        analyserRef.current.getByteTimeDomainData(timeDomainData);

        // Calculate volume (RMS)
        let sum = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const normalized = (timeDomainData[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / timeDomainData.length);

        // Get dominant frequency
        const frequency = getDominantFrequency(frequencyData, audioContextRef.current.sampleRate);

        // Track history for variance calculation
        frequencyHistoryRef.current.push(frequency);
        volumeHistoryRef.current.push(volume);
        
        // Keep only last 10 samples (~300ms at 30fps)
        if (frequencyHistoryRef.current.length > 10) {
          frequencyHistoryRef.current.shift();
          volumeHistoryRef.current.shift();
        }

        const frequencyVariance = getFrequencyVariance(frequencyHistoryRef.current);

        // Track scream start time
        if (volume > SCREAM_VOLUME_THRESHOLD && frequency > SCREAM_FREQUENCY_MIN) {
          if (!screamStartRef.current) {
            screamStartRef.current = Date.now();
          }
        } else {
          screamStartRef.current = null;
        }

        // Calculate scream confidence
        const confidence = detectScream(volume, frequency, frequencyVariance);

        setState((prev) => ({
          ...prev,
          currentVolume: volume,
          peakFrequency: frequency,
          screamConfidence: confidence,
        }));

        // Trigger if confidence is high enough
        if (confidence >= 75) {
          setState((prev) => ({
            ...prev,
            isScreamDetected: true,
            lastScreamTime: new Date(),
          }));
          onScreamDetected(confidence / 100);
          
          toast({
            title: "😱 Scream Detected",
            description: `High-pitched distress vocalization detected (${Math.round(confidence)}% confidence)`,
            variant: "destructive",
          });
        }

        animationRef.current = requestAnimationFrame(analyze);
      };

      setState((prev) => ({ ...prev, isListening: true }));
      analyze();

      console.log("🔊 Scream detection started");
    } catch (error) {
      console.error("Microphone error:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone for scream detection",
        variant: "destructive",
      });
    }
  }, [detectScream, getDominantFrequency, getFrequencyVariance, onScreamDetected, toast]);

  const stopListening = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setState((prev) => ({ ...prev, isListening: false }));
    frequencyHistoryRef.current = [];
    volumeHistoryRef.current = [];
    screamStartRef.current = null;

    console.log("🔇 Scream detection stopped");
  }, []);

  const resetScreamDetection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isScreamDetected: false,
      screamConfidence: 0,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    resetScreamDetection,
  };
}
