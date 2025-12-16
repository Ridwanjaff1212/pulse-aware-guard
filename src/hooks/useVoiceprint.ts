import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface VoiceprintSample {
  id: string;
  audioData: Float32Array;
  features: AudioFeatures;
  timestamp: Date;
}

interface AudioFeatures {
  mfcc: number[]; // Mel-frequency cepstral coefficients
  pitch: number;
  energy: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
}

interface VoiceprintState {
  isRecording: boolean;
  isProcessing: boolean;
  isMatched: boolean;
  samples: VoiceprintSample[];
  matchConfidence: number;
  hasVoiceprint: boolean;
}

const REQUIRED_SAMPLES = 5;
const MATCH_THRESHOLD = 0.75; // 75% similarity for match

export function useVoiceprint(userId: string | undefined, keyword: string) {
  const { toast } = useToast();
  const [state, setState] = useState<VoiceprintState>({
    isRecording: false,
    isProcessing: false,
    isMatched: false,
    samples: [],
    matchConfidence: 0,
    hasVoiceprint: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceprintRef = useRef<AudioFeatures[] | null>(null);

  // Load voiceprint from localStorage on mount
  useEffect(() => {
    if (userId) {
      const stored = localStorage.getItem(`voiceprint_${userId}`);
      if (stored) {
        try {
          voiceprintRef.current = JSON.parse(stored);
          setState((prev) => ({ ...prev, hasVoiceprint: true }));
          console.log("📝 Voiceprint loaded from storage");
        } catch (e) {
          console.error("Failed to load voiceprint:", e);
        }
      }
    }
  }, [userId]);

  const extractFeatures = useCallback(async (audioData: Float32Array): Promise<AudioFeatures> => {
    // Simple feature extraction (in production, use a proper DSP library)
    
    // Energy (RMS)
    const energy = Math.sqrt(
      audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length
    );

    // Zero Crossing Rate
    let zeroCrossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0 && audioData[i - 1] < 0) || 
          (audioData[i] < 0 && audioData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / audioData.length;

    // Spectral Centroid (simplified)
    const fft = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      fft[i] = Math.abs(audioData[i]);
    }
    let weightedSum = 0;
    let totalSum = 0;
    for (let i = 0; i < fft.length; i++) {
      weightedSum += i * fft[i];
      totalSum += fft[i];
    }
    const spectralCentroid = totalSum > 0 ? weightedSum / totalSum : 0;

    // Pitch estimation (simplified autocorrelation)
    let maxCorrelation = 0;
    let pitch = 0;
    const minLag = 20; // ~2400Hz at 48kHz
    const maxLag = 500; // ~96Hz at 48kHz
    
    for (let lag = minLag; lag < maxLag && lag < audioData.length / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < audioData.length - lag; i++) {
        correlation += audioData[i] * audioData[i + lag];
      }
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        pitch = 48000 / lag; // Assuming 48kHz sample rate
      }
    }

    // Simplified MFCC (just use a few frequency bins)
    const mfcc: number[] = [];
    const binSize = Math.floor(audioData.length / 13);
    for (let i = 0; i < 13; i++) {
      let binEnergy = 0;
      for (let j = i * binSize; j < (i + 1) * binSize && j < audioData.length; j++) {
        binEnergy += Math.abs(audioData[j]);
      }
      mfcc.push(Math.log(1 + binEnergy / binSize));
    }

    return { mfcc, pitch, energy, spectralCentroid, zeroCrossingRate };
  }, []);

  const compareFeatures = useCallback((f1: AudioFeatures, f2: AudioFeatures): number => {
    let similarity = 0;
    let weights = 0;

    // MFCC similarity (most important)
    const mfccSim = f1.mfcc.reduce((sum, val, i) => {
      return sum + 1 / (1 + Math.abs(val - f2.mfcc[i]));
    }, 0) / f1.mfcc.length;
    similarity += mfccSim * 0.4;
    weights += 0.4;

    // Pitch similarity
    const pitchSim = 1 / (1 + Math.abs(f1.pitch - f2.pitch) / 100);
    similarity += pitchSim * 0.25;
    weights += 0.25;

    // Energy similarity
    const energySim = 1 / (1 + Math.abs(f1.energy - f2.energy) * 10);
    similarity += energySim * 0.15;
    weights += 0.15;

    // Spectral centroid similarity
    const centroidSim = 1 / (1 + Math.abs(f1.spectralCentroid - f2.spectralCentroid) / 100);
    similarity += centroidSim * 0.1;
    weights += 0.1;

    // Zero crossing rate similarity
    const zcrSim = 1 / (1 + Math.abs(f1.zeroCrossingRate - f2.zeroCrossingRate) * 100);
    similarity += zcrSim * 0.1;
    weights += 0.1;

    return similarity / weights;
  }, []);

  const recordSample = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 4096;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setState((prev) => ({ ...prev, isRecording: false, isProcessing: true }));
        
        // Convert blob to audio data
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);

        // Extract features
        const features = await extractFeatures(new Float32Array(audioData));
        
        const sample: VoiceprintSample = {
          id: crypto.randomUUID(),
          audioData: new Float32Array(audioData),
          features,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          samples: [...prev.samples, sample],
          isProcessing: false,
        }));

        stream.getTracks().forEach((track) => track.stop());
        
        console.log("🎙️ Voice sample recorded and processed");
      };

      mediaRecorder.start();
      setState((prev) => ({ ...prev, isRecording: true }));

      // Auto-stop after 3 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 3000);
    } catch (error) {
      console.error("Recording error:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  }, [extractFeatures, toast]);

  const createVoiceprint = useCallback(() => {
    if (state.samples.length < REQUIRED_SAMPLES) {
      toast({
        title: "Not Enough Samples",
        description: `Record ${REQUIRED_SAMPLES - state.samples.length} more samples`,
        variant: "destructive",
      });
      return;
    }

    // Average features across all samples
    const voiceprint = state.samples.map((s) => s.features);
    voiceprintRef.current = voiceprint;

    // Save to localStorage
    if (userId) {
      localStorage.setItem(`voiceprint_${userId}`, JSON.stringify(voiceprint));
    }

    setState((prev) => ({ ...prev, hasVoiceprint: true }));
    
    toast({
      title: "✅ Voiceprint Created",
      description: "Your unique voice signature has been saved",
    });

    console.log("🔐 Voiceprint created from", voiceprint.length, "samples");
  }, [state.samples, userId, toast]);

  const matchVoice = useCallback(async (audioData: Float32Array): Promise<number> => {
    if (!voiceprintRef.current || voiceprintRef.current.length === 0) {
      return 0;
    }

    const features = await extractFeatures(audioData);
    
    // Compare against all stored samples and average
    const similarities = voiceprintRef.current.map((stored) => 
      compareFeatures(features, stored)
    );
    
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    
    setState((prev) => ({
      ...prev,
      matchConfidence: avgSimilarity,
      isMatched: avgSimilarity >= MATCH_THRESHOLD,
    }));

    console.log(`🎯 Voice match confidence: ${(avgSimilarity * 100).toFixed(1)}%`);
    
    return avgSimilarity;
  }, [extractFeatures, compareFeatures]);

  const resetVoiceprint = useCallback(() => {
    setState({
      isRecording: false,
      isProcessing: false,
      isMatched: false,
      samples: [],
      matchConfidence: 0,
      hasVoiceprint: false,
    });
    voiceprintRef.current = null;
    
    if (userId) {
      localStorage.removeItem(`voiceprint_${userId}`);
    }

    toast({
      title: "Voiceprint Reset",
      description: "Record new voice samples to create a new voiceprint",
    });
  }, [userId, toast]);

  return {
    ...state,
    requiredSamples: REQUIRED_SAMPLES,
    recordSample,
    createVoiceprint,
    matchVoice,
    resetVoiceprint,
  };
}
