import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface KeywordDetectionState {
  isListening: boolean;
  keyword: string;
  lastDetectedAt: Date | null;
  detectionCount: number;
  voiceMatchConfidence: number;
  isVoiceMatched: boolean;
}

interface AudioFeatures {
  mfcc: number[];
  pitch: number;
  energy: number;
}

export function useEnhancedKeywordDetection(
  userId: string | undefined,
  onKeywordDetected: (confidence: number) => void,
  onVoiceVerified: (confidence: number) => void
) {
  const { toast } = useToast();
  const [state, setState] = useState<KeywordDetectionState>({
    isListening: false,
    keyword: "",
    lastDetectedAt: null,
    detectionCount: 0,
    voiceMatchConfidence: 0,
    isVoiceMatched: false,
  });

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceprintRef = useRef<AudioFeatures[] | null>(null);

  // Load user's keyword and voiceprint
  useEffect(() => {
    if (userId) {
      loadUserSettings();
    }
  }, [userId]);

  const loadUserSettings = async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("emergency_keyword, keyword_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.emergency_keyword) {
      setState((prev) => ({ ...prev, keyword: data.emergency_keyword }));
    }

    // Load voiceprint from localStorage
    const stored = localStorage.getItem(`voiceprint_${userId}`);
    if (stored) {
      try {
        voiceprintRef.current = JSON.parse(stored);
        console.log("🔐 Voiceprint loaded for keyword detection");
      } catch (e) {
        console.error("Failed to load voiceprint:", e);
      }
    }

    if (data?.keyword_enabled && data?.emergency_keyword) {
      startListening();
    }
  };

  const extractQuickFeatures = useCallback((analyser: AnalyserNode): AudioFeatures => {
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeDomainData = new Uint8Array(analyser.fftSize);
    
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeDomainData);

    // Energy
    let energy = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const normalized = (timeDomainData[i] - 128) / 128;
      energy += normalized * normalized;
    }
    energy = Math.sqrt(energy / timeDomainData.length);

    // Simplified MFCC
    const mfcc: number[] = [];
    const binSize = Math.floor(frequencyData.length / 13);
    for (let i = 0; i < 13; i++) {
      let binEnergy = 0;
      for (let j = i * binSize; j < (i + 1) * binSize && j < frequencyData.length; j++) {
        binEnergy += frequencyData[j];
      }
      mfcc.push(Math.log(1 + binEnergy / binSize));
    }

    // Pitch estimation
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 20; i < frequencyData.length / 2; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        maxIndex = i;
      }
    }
    const pitch = maxIndex * 48000 / (2 * frequencyData.length);

    return { mfcc, pitch, energy };
  }, []);

  const compareVoiceFeatures = useCallback((current: AudioFeatures): number => {
    if (!voiceprintRef.current || voiceprintRef.current.length === 0) {
      return 0.5; // No voiceprint, moderate confidence
    }

    let totalSim = 0;
    for (const stored of voiceprintRef.current) {
      let sim = 0;
      
      // MFCC similarity
      const mfccSim = current.mfcc.reduce((sum, val, i) => {
        return sum + 1 / (1 + Math.abs(val - stored.mfcc[i]));
      }, 0) / current.mfcc.length;
      sim += mfccSim * 0.5;

      // Pitch similarity
      const pitchSim = 1 / (1 + Math.abs(current.pitch - stored.pitch) / 100);
      sim += pitchSim * 0.3;

      // Energy similarity
      const energySim = 1 / (1 + Math.abs(current.energy - stored.energy) * 10);
      sim += energySim * 0.2;

      totalSim += sim;
    }

    return totalSim / voiceprintRef.current.length;
  }, []);

  const startListening = useCallback(async () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: "Not Supported",
        description: "Voice detection is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Start audio context for voice analysis
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 2048;

      // Start speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.maxAlternatives = 5;

      recognitionRef.current.onresult = (event: any) => {
        const keyword = state.keyword.toLowerCase();
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          // Check all alternatives for better detection
          for (let j = 0; j < event.results[i].length; j++) {
            const transcript = event.results[i][j].transcript.toLowerCase();
            const baseConfidence = event.results[i][j].confidence;
            
            if (transcript.includes(keyword)) {
              // Extract voice features for verification
              const features = extractQuickFeatures(analyser);
              const voiceMatch = compareVoiceFeatures(features);
              
              // Combined confidence = speech confidence × voice match
              const combinedConfidence = baseConfidence * voiceMatch;
              
              console.log(`🎤 Keyword detected! Speech: ${(baseConfidence * 100).toFixed(1)}%, Voice: ${(voiceMatch * 100).toFixed(1)}%, Combined: ${(combinedConfidence * 100).toFixed(1)}%`);

              setState((prev) => ({
                ...prev,
                lastDetectedAt: new Date(),
                detectionCount: prev.detectionCount + 1,
                voiceMatchConfidence: voiceMatch,
                isVoiceMatched: voiceMatch >= 0.65,
              }));

              // Callback with combined confidence
              onKeywordDetected(combinedConfidence);
              
              if (voiceMatch >= 0.65) {
                onVoiceVerified(voiceMatch);
                toast({
                  title: "🚨 KEYWORD + VOICE VERIFIED",
                  description: `Emergency keyword detected with ${(voiceMatch * 100).toFixed(0)}% voice match`,
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "⚠️ Keyword Detected",
                  description: `Voice verification: ${(voiceMatch * 100).toFixed(0)}% match`,
                });
              }
              
              return;
            }
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech" && event.error !== "aborted") {
          setTimeout(() => {
            if (state.isListening) startListening();
          }, 1000);
        }
      };

      recognitionRef.current.onend = () => {
        if (state.isListening) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.log("Restarting recognition...");
            }
          }, 500);
        }
      };

      recognitionRef.current.start();
      setState((prev) => ({ ...prev, isListening: true }));
      
      console.log("🎤 Enhanced keyword detection started - listening for:", state.keyword);
    } catch (error) {
      console.error("Failed to start keyword detection:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  }, [state.keyword, state.isListening, extractQuickFeatures, compareVoiceFeatures, onKeywordDetected, onVoiceVerified, toast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    
    setState((prev) => ({ ...prev, isListening: false }));
    console.log("🔇 Keyword detection stopped");
  }, []);

  const updateKeyword = useCallback(async (newKeyword: string) => {
    if (!userId) return;
    
    await supabase
      .from("profiles")
      .update({ emergency_keyword: newKeyword })
      .eq("user_id", userId);

    setState((prev) => ({ ...prev, keyword: newKeyword }));
    
    toast({
      title: "Keyword Updated",
      description: `Your emergency keyword is now "${newKeyword}"`,
    });
  }, [userId, toast]);

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    updateKeyword,
  };
}
