import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SituationalSignal {
  type: "motion" | "location" | "time" | "handling" | "noise" | "routine" | "stillness";
  value: number;
  timestamp: Date;
  description: string;
  raw?: any;
}

export interface PreDangerState {
  isActive: boolean;
  level: "none" | "monitoring" | "armed" | "critical";
  confidence: number;
  signals: SituationalSignal[];
  triggers: string[];
  timeInState: number;
}

interface RoutineData {
  usualLocations: { lat: number; lng: number; time: string }[];
  usualTimes: { hour: number; activity: string }[];
  avgWalkingSpeed: number;
  avgScreenUnlocks: number;
}

const PRE_DANGER_THRESHOLDS = {
  monitoring: 30,
  armed: 50,
  critical: 75,
};

export function useSituationalIntelligence(userId: string | undefined, onPreDangerEscalate?: (level: PreDangerState["level"]) => void) {
  const { toast } = useToast();
  
  const [preDangerState, setPreDangerState] = useState<PreDangerState>({
    isActive: false,
    level: "none",
    confidence: 0,
    signals: [],
    triggers: [],
    timeInState: 0,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [routine, setRoutine] = useState<RoutineData | null>(null);
  
  // Refs for continuous monitoring
  const motionRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const orientationRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Tracking variables
  const lastLocationRef = useRef<{ lat: number; lng: number; time: Date } | null>(null);
  const motionHistoryRef = useRef<number[]>([]);
  const screenUnlocksRef = useRef<number>(0);
  const gripPressureRef = useRef<number[]>([]);
  const lastOrientationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);

  // Calculate pre-danger level based on confidence
  const calculateLevel = useCallback((confidence: number): PreDangerState["level"] => {
    if (confidence >= PRE_DANGER_THRESHOLDS.critical) return "critical";
    if (confidence >= PRE_DANGER_THRESHOLDS.armed) return "armed";
    if (confidence >= PRE_DANGER_THRESHOLDS.monitoring) return "monitoring";
    return "none";
  }, []);

  // Add a situational signal
  const addSignal = useCallback((signal: Omit<SituationalSignal, "timestamp">) => {
    const newSignal: SituationalSignal = { ...signal, timestamp: new Date() };
    
    setPreDangerState(prev => {
      const signals = [...prev.signals, newSignal].slice(-50); // Keep last 50 signals
      
      // Calculate weighted confidence based on recent signals
      const now = Date.now();
      const weightedSum = signals.reduce((sum, s) => {
        const age = (now - s.timestamp.getTime()) / 1000 / 60; // minutes
        const decay = Math.max(0, 1 - age / 15); // Decay over 15 minutes
        const typeWeight = {
          motion: 1.2,
          location: 1.5,
          time: 0.8,
          handling: 1.3,
          noise: 0.9,
          routine: 1.4,
          stillness: 1.1,
        }[s.type];
        return sum + s.value * typeWeight * decay;
      }, 0);
      
      const confidence = Math.min(100, Math.round(weightedSum / 3));
      const level = calculateLevel(confidence);
      
      // Build trigger list
      const triggers: string[] = [];
      if (signals.some(s => s.type === "location" && s.value > 30)) triggers.push("route_deviation");
      if (signals.some(s => s.type === "handling" && s.value > 40)) triggers.push("grip_tension");
      if (signals.some(s => s.type === "noise" && s.value < 20)) triggers.push("sudden_silence");
      if (signals.some(s => s.type === "stillness" && s.value > 50)) triggers.push("prolonged_stillness");
      if (signals.some(s => s.type === "time" && s.value > 30)) triggers.push("unusual_time");
      
      return {
        ...prev,
        isActive: level !== "none",
        level,
        confidence,
        signals,
        triggers,
      };
    });

    console.log("[SIE] Signal added:", signal.type, signal.value);
  }, [calculateLevel]);

  // Monitor device motion for grip tension and sudden movements
  const startMotionAnalysis = useCallback(() => {
    if (!("DeviceMotionEvent" in window)) return;

    let lastAccel = 0;
    let gripSamples: number[] = [];

    motionRef.current = (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      const totalAccel = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
      
      // Track motion history
      motionHistoryRef.current.push(totalAccel);
      if (motionHistoryRef.current.length > 100) motionHistoryRef.current.shift();

      // Detect grip tension from micro-vibrations
      const accelDelta = Math.abs(totalAccel - lastAccel);
      gripSamples.push(accelDelta);
      if (gripSamples.length > 20) gripSamples.shift();
      
      const avgGripTension = gripSamples.reduce((a, b) => a + b, 0) / gripSamples.length;
      gripPressureRef.current.push(avgGripTension);
      if (gripPressureRef.current.length > 50) gripPressureRef.current.shift();

      // Detect tight grip (shaking hands, nervous)
      if (avgGripTension > 2 && avgGripTension < 5) {
        addSignal({
          type: "handling",
          value: Math.min(60, avgGripTension * 15),
          description: "Elevated grip tension detected - possible stress",
        });
      }

      // Detect sudden drop or impact
      if (totalAccel > 25 && lastAccel < 15) {
        addSignal({
          type: "motion",
          value: 70,
          description: "Sudden impact detected - possible fall or struggle",
        });
      }

      // Detect fast walking/running
      const avgMotion = motionHistoryRef.current.reduce((a, b) => a + b, 0) / motionHistoryRef.current.length;
      if (avgMotion > 15) {
        addSignal({
          type: "motion",
          value: 40,
          description: "Fast movement detected - running or fleeing",
        });
      }

      lastAccel = totalAccel;
    };

    window.addEventListener("devicemotion", motionRef.current);
  }, [addSignal]);

  // Monitor orientation for phone handling patterns
  const startOrientationAnalysis = useCallback(() => {
    if (!("DeviceOrientationEvent" in window)) return;

    let rapidChanges = 0;

    orientationRef.current = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = event;
      if (alpha === null || beta === null || gamma === null) return;

      const current = { alpha, beta, gamma };
      
      if (lastOrientationRef.current) {
        const deltaAlpha = Math.abs(current.alpha - lastOrientationRef.current.alpha);
        const deltaBeta = Math.abs(current.beta - lastOrientationRef.current.beta);
        const deltaGamma = Math.abs(current.gamma - lastOrientationRef.current.gamma);
        
        // Detect erratic phone handling
        if (deltaAlpha > 30 || deltaBeta > 30 || deltaGamma > 30) {
          rapidChanges++;
          if (rapidChanges > 5) {
            addSignal({
              type: "handling",
              value: 35,
              description: "Erratic phone handling - possible coercion",
            });
            rapidChanges = 0;
          }
        } else {
          rapidChanges = Math.max(0, rapidChanges - 1);
        }
      }

      lastOrientationRef.current = current;
    };

    window.addEventListener("deviceorientation", orientationRef.current);
  }, [addSignal]);

  // Monitor location for route deviations
  const startLocationAnalysis = useCallback(() => {
    if (!navigator.geolocation) return;

    locationWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const current = { lat: latitude, lng: longitude, time: new Date() };

        if (lastLocationRef.current) {
          // Calculate distance traveled
          const distance = Math.sqrt(
            Math.pow(current.lat - lastLocationRef.current.lat, 2) +
            Math.pow(current.lng - lastLocationRef.current.lng, 2)
          ) * 111000; // Rough conversion to meters

          const timeDiff = (current.time.getTime() - lastLocationRef.current.time.getTime()) / 1000;
          const speed = distance / timeDiff; // m/s

          // Check if outside safe zones
          if (userId) {
            const { data: safeZones } = await supabase
              .from("safe_zones")
              .select("*")
              .eq("user_id", userId);

            if (safeZones && safeZones.length > 0) {
              const isInSafeZone = safeZones.some((zone) => {
                const zoneDist = Math.sqrt(
                  Math.pow(zone.latitude - latitude, 2) +
                  Math.pow(zone.longitude - longitude, 2)
                ) * 111000;
                return zoneDist < (zone.radius_meters || 500);
              });

              if (!isInSafeZone) {
                addSignal({
                  type: "location",
                  value: 40,
                  description: "Outside established safe zones",
                });
              }
            }
          }

          // Detect unusual speed (too fast = fleeing, too slow = being held)
          if (speed > 5) { // Running speed
            addSignal({
              type: "motion",
              value: 35,
              description: `High speed movement: ${speed.toFixed(1)}m/s`,
            });
          }
        }

        lastLocationRef.current = current;
      },
      (error) => console.log("[SIE] Location error:", error),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }, [userId, addSignal]);

  // Analyze time-based patterns
  const analyzeTimePatterns = useCallback(() => {
    const hour = new Date().getHours();
    const isLateNight = hour >= 23 || hour <= 5;
    const isEarlyMorning = hour >= 5 && hour <= 7;

    if (isLateNight) {
      addSignal({
        type: "time",
        value: 35,
        description: `Late night activity (${hour}:00)`,
      });
    }

    // Track screen unlock frequency
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        screenUnlocksRef.current++;
        
        // Many unlocks in short time = anxiety/checking
        if (screenUnlocksRef.current > 10) {
          addSignal({
            type: "handling",
            value: 30,
            description: "Frequent screen unlocks - possible anxiety",
          });
          screenUnlocksRef.current = 0;
        }
      }
    });
  }, [addSignal]);

  // Main analysis loop
  const startAnalysis = useCallback(() => {
    analysisIntervalRef.current = setInterval(() => {
      // Check for prolonged stillness
      if (motionHistoryRef.current.length > 50) {
        const avgMotion = motionHistoryRef.current.reduce((a, b) => a + b, 0) / motionHistoryRef.current.length;
        if (avgMotion < 10) {
          addSignal({
            type: "stillness",
            value: 25,
            description: "Prolonged stillness detected",
          });
        }
      }

      // Reset screen unlock counter periodically
      screenUnlocksRef.current = Math.max(0, screenUnlocksRef.current - 1);
    }, 30000); // Every 30 seconds
  }, [addSignal]);

  // Handle pre-danger level changes
  useEffect(() => {
    if (preDangerState.level !== "none" && onPreDangerEscalate) {
      onPreDangerEscalate(preDangerState.level);
    }

    // Show toast on escalation
    if (preDangerState.level === "armed") {
      toast({
        title: "⚡ Pre-Danger State: ARMED",
        description: "SafePulse is quietly preparing emergency systems.",
      });
    } else if (preDangerState.level === "critical") {
      toast({
        title: "🚨 Pre-Danger State: CRITICAL",
        description: "Emergency systems on standby. Recording primed.",
        variant: "destructive",
      });
    }
  }, [preDangerState.level, onPreDangerEscalate, toast]);

  // Track time in current state
  useEffect(() => {
    if (preDangerState.isActive) {
      stateTimerRef.current = setInterval(() => {
        setPreDangerState(prev => ({
          ...prev,
          timeInState: prev.timeInState + 1,
        }));
      }, 1000);
    } else {
      if (stateTimerRef.current) clearInterval(stateTimerRef.current);
      setPreDangerState(prev => ({ ...prev, timeInState: 0 }));
    }

    return () => {
      if (stateTimerRef.current) clearInterval(stateTimerRef.current);
    };
  }, [preDangerState.isActive]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    console.log("[SIE] Starting Situational Intelligence Engine");
    setIsMonitoring(true);
    
    startMotionAnalysis();
    startOrientationAnalysis();
    startLocationAnalysis();
    analyzeTimePatterns();
    startAnalysis();

    toast({
      title: "🧠 Situational Intelligence Active",
      description: "Predictive safety monitoring enabled",
    });
  }, [startMotionAnalysis, startOrientationAnalysis, startLocationAnalysis, analyzeTimePatterns, startAnalysis, toast]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    console.log("[SIE] Stopping Situational Intelligence Engine");
    setIsMonitoring(false);

    if (motionRef.current) window.removeEventListener("devicemotion", motionRef.current);
    if (orientationRef.current) window.removeEventListener("deviceorientation", orientationRef.current);
    if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current);
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
  }, []);

  // Reset pre-danger state
  const resetState = useCallback(() => {
    setPreDangerState({
      isActive: false,
      level: "none",
      confidence: 0,
      signals: [],
      triggers: [],
      timeInState: 0,
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    preDangerState,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetState,
    addSignal,
  };
}
