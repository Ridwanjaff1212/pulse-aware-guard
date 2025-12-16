import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SafetySignal {
  type: "motion" | "voice" | "inactivity" | "location" | "time" | "pattern";
  value: number;
  timestamp: Date;
  description: string;
}

export interface DangerState {
  confidenceScore: number;
  riskLevel: "safe" | "uncertain" | "high" | "emergency";
  signals: SafetySignal[];
  isMonitoring: boolean;
  lastUpdate: Date;
  autonomousMode: boolean;
}

const SIGNAL_WEIGHTS = {
  motion: 25,
  voice: 30,
  inactivity: 20,
  location: 15,
  time: 10,
  pattern: 20,
};

const RISK_THRESHOLDS = {
  safe: 30,
  uncertain: 60,
  high: 80,
  emergency: 81,
};

export function useAutonomousSafety(userId: string | undefined) {
  const { toast } = useToast();
  const [dangerState, setDangerState] = useState<DangerState>({
    confidenceScore: 0,
    riskLevel: "safe",
    signals: [],
    isMonitoring: false,
    lastUpdate: new Date(),
    autonomousMode: false,
  });

  const recognitionRef = useRef<any>(null);
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());
  const baselineRef = useRef<{ avgMotion: number; avgStress: number }>({ avgMotion: 0, avgStress: 0 });

  const calculateRiskLevel = useCallback((score: number): DangerState["riskLevel"] => {
    if (score >= RISK_THRESHOLDS.emergency) return "emergency";
    if (score >= RISK_THRESHOLDS.high) return "high";
    if (score >= RISK_THRESHOLDS.uncertain) return "uncertain";
    return "safe";
  }, []);

  const addSignal = useCallback((signal: Omit<SafetySignal, "timestamp">) => {
    const newSignal: SafetySignal = { ...signal, timestamp: new Date() };
    
    setDangerState((prev) => {
      const signals = [...prev.signals, newSignal].slice(-20); // Keep last 20 signals
      const weightedSum = signals.reduce((sum, s) => {
        const age = (Date.now() - s.timestamp.getTime()) / 1000 / 60; // minutes
        const decay = Math.max(0, 1 - age / 10); // Decay over 10 minutes
        return sum + s.value * SIGNAL_WEIGHTS[s.type] * decay / 100;
      }, 0);
      
      const confidenceScore = Math.min(100, Math.round(weightedSum));
      const riskLevel = calculateRiskLevel(confidenceScore);
      
      return {
        ...prev,
        signals,
        confidenceScore,
        riskLevel,
        lastUpdate: new Date(),
      };
    });
  }, [calculateRiskLevel]);

  const triggerAutonomousResponse = useCallback(async () => {
    if (!userId) return;

    console.log("[ASM] Triggering autonomous emergency response");

    // Create incident pack
    const { data: incident } = await supabase.from("safety_incidents").insert({
      user_id: userId,
      type: "autonomous_detection",
      description: "Autonomous Safety AI detected potential danger based on combined signals",
      status: "active",
      ai_risk_score: dangerState.confidenceScore,
    }).select().single();

    // Get current location
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      await supabase.from("location_history").insert({
        user_id: userId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        is_emergency: true,
      });

      // Create emergency alert
      await supabase.from("emergency_alerts").insert({
        user_id: userId,
        incident_id: incident?.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        status: "active",
        message: "Autonomous Safety AI has detected potential danger. Emergency contacts are being notified.",
      });
    });

    // Send push notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 SafePulse Emergency", {
        body: "Autonomous Safety AI has detected danger. Emergency protocols activated.",
        icon: "/favicon.ico",
        tag: "emergency",
        requireInteraction: true,
      });
    }

    toast({
      title: "🚨 AUTONOMOUS RESPONSE ACTIVATED",
      description: "Emergency protocols initiated. Contacts are being alerted.",
      variant: "destructive",
    });
  }, [userId, dangerState.confidenceScore, toast]);

  // Monitor for emergency threshold
  useEffect(() => {
    if (dangerState.autonomousMode && dangerState.riskLevel === "emergency") {
      triggerAutonomousResponse();
    }
  }, [dangerState.riskLevel, dangerState.autonomousMode, triggerAutonomousResponse]);

  const startVoiceMonitoring = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.log("[ASM] Voice recognition not supported");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.toLowerCase();
          
          // Detect distress words
          const distressWords = ["help", "stop", "no", "please", "emergency", "scared", "danger", "hurt"];
          const distressCount = distressWords.filter(word => text.includes(word)).length;
          
          if (distressCount > 0) {
            addSignal({
              type: "voice",
              value: Math.min(100, distressCount * 40),
              description: `Detected distress indicators: ${distressCount} keywords`,
            });
          }

          // Update activity
          lastActivityRef.current = new Date();
        }
      }
    };

    recognitionRef.current.onerror = () => {
      setTimeout(() => {
        if (dangerState.isMonitoring) recognitionRef.current?.start();
      }, 1000);
    };

    recognitionRef.current.onend = () => {
      if (dangerState.isMonitoring) {
        setTimeout(() => recognitionRef.current?.start(), 100);
      }
    };

    recognitionRef.current.start();
  }, [addSignal, dangerState.isMonitoring]);

  const startMotionMonitoring = useCallback(() => {
    if (!("DeviceMotionEvent" in window)) {
      console.log("[ASM] Motion detection not supported");
      return;
    }

    let lastMotion = 0;
    let stillnessStart: Date | null = null;

    motionHandlerRef.current = (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      const totalAcceleration = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);

      // Detect sudden impact (potential fall)
      if (totalAcceleration > 25 && lastMotion < 15) {
        addSignal({
          type: "motion",
          value: 80,
          description: "Sudden impact detected - potential fall",
        });
        stillnessStart = null;
      }
      // Detect prolonged stillness after motion
      else if (totalAcceleration < 10 && lastMotion > 15) {
        if (!stillnessStart) {
          stillnessStart = new Date();
        } else {
          const stillnessDuration = (Date.now() - stillnessStart.getTime()) / 1000;
          if (stillnessDuration > 30) {
            addSignal({
              type: "motion",
              value: 60,
              description: `Prolonged stillness: ${Math.round(stillnessDuration)}s after movement`,
            });
          }
        }
      } else {
        stillnessStart = null;
        lastActivityRef.current = new Date();
      }

      lastMotion = totalAcceleration;
    };

    window.addEventListener("devicemotion", motionHandlerRef.current);
  }, [addSignal]);

  const startInactivityMonitoring = useCallback(() => {
    inactivityTimerRef.current = setInterval(() => {
      const inactivityMinutes = (Date.now() - lastActivityRef.current.getTime()) / 1000 / 60;
      
      if (inactivityMinutes > 5) {
        addSignal({
          type: "inactivity",
          value: Math.min(100, inactivityMinutes * 10),
          description: `No activity for ${Math.round(inactivityMinutes)} minutes`,
        });
      }
    }, 60000); // Check every minute
  }, [addSignal]);

  const startLocationMonitoring = useCallback(() => {
    // Check if user is in unusual location at unusual time
    const checkLocationTime = async () => {
      const hour = new Date().getHours();
      const isLateNight = hour >= 23 || hour <= 5;

      if (isLateNight) {
        navigator.geolocation?.getCurrentPosition(async (pos) => {
          // Check against safe zones
          const { data: safeZones } = await supabase
            .from("safe_zones")
            .select("*")
            .eq("user_id", userId);

          if (safeZones && safeZones.length > 0) {
            const isInSafeZone = safeZones.some((zone) => {
              const distance = Math.sqrt(
                Math.pow(zone.latitude - pos.coords.latitude, 2) +
                Math.pow(zone.longitude - pos.coords.longitude, 2)
              );
              return distance * 111000 < (zone.radius_meters || 500);
            });

            if (!isInSafeZone) {
              addSignal({
                type: "location",
                value: 50,
                description: "Outside safe zone during late hours",
              });
              addSignal({
                type: "time",
                value: 30,
                description: `Late night activity detected (${hour}:00)`,
              });
            }
          }
        });
      }
    };

    checkLocationTime();
    const interval = setInterval(checkLocationTime, 300000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [userId, addSignal]);

  const startMonitoring = useCallback(() => {
    console.log("[ASM] Starting autonomous safety monitoring");
    setDangerState((prev) => ({ ...prev, isMonitoring: true }));

    startVoiceMonitoring();
    startMotionMonitoring();
    startInactivityMonitoring();
    startLocationMonitoring();

    toast({
      title: "Autonomous Safety Active",
      description: "AI is now monitoring your safety patterns",
    });
  }, [startVoiceMonitoring, startMotionMonitoring, startInactivityMonitoring, startLocationMonitoring, toast]);

  const stopMonitoring = useCallback(() => {
    console.log("[ASM] Stopping autonomous safety monitoring");
    setDangerState((prev) => ({ ...prev, isMonitoring: false }));

    recognitionRef.current?.stop();
    if (motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
    }
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
    }

    toast({
      title: "Autonomous Safety Paused",
      description: "Manual controls are still available",
    });
  }, [toast]);

  const toggleAutonomousMode = useCallback((enabled: boolean) => {
    setDangerState((prev) => ({ ...prev, autonomousMode: enabled }));
    toast({
      title: enabled ? "Autonomous Mode Enabled" : "Autonomous Mode Disabled",
      description: enabled
        ? "AI will automatically respond when danger is detected"
        : "AI will only alert, not take automatic action",
    });
  }, [toast]);

  const resetDangerScore = useCallback(() => {
    setDangerState((prev) => ({
      ...prev,
      confidenceScore: 0,
      riskLevel: "safe",
      signals: [],
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (motionHandlerRef.current) {
        window.removeEventListener("devicemotion", motionHandlerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, []);

  return {
    dangerState,
    startMonitoring,
    stopMonitoring,
    toggleAutonomousMode,
    resetDangerScore,
    addSignal,
  };
}
