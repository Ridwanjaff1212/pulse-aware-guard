import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export interface CoercionSignal {
  type: "forced_unlock" | "shaking_hands" | "erratic_touch" | "rapid_navigation" | "unusual_timing" | "stress_pattern";
  value: number;
  timestamp: Date;
  description: string;
}

export interface CoercionState {
  isDetected: boolean;
  confidence: number;
  signals: CoercionSignal[];
  silentMode: boolean;
  escalationLevel: "none" | "suspected" | "confirmed";
}

// Touch pressure patterns indicating stress
interface TouchPattern {
  pressure: number;
  speed: number;
  accuracy: number;
  timestamp: number;
}

export function useAntiCoercion(userId: string | undefined, onCoercionDetected?: () => void) {
  const { toast } = useToast();
  
  const [coercionState, setCoercionState] = useState<CoercionState>({
    isDetected: false,
    confidence: 0,
    signals: [],
    silentMode: false,
    escalationLevel: "none",
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Refs for tracking
  const touchPatternsRef = useRef<TouchPattern[]>([]);
  const lastUnlockTimeRef = useRef<number>(0);
  const unlockCountRef = useRef<number>(0);
  const navigationHistoryRef = useRef<{ path: string; time: number }[]>([]);
  const baselineTouchRef = useRef<{ avgPressure: number; avgSpeed: number } | null>(null);
  const coercionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate coercion level
  const calculateLevel = useCallback((confidence: number): CoercionState["escalationLevel"] => {
    if (confidence >= 70) return "confirmed";
    if (confidence >= 40) return "suspected";
    return "none";
  }, []);

  // Add coercion signal
  const addSignal = useCallback((signal: Omit<CoercionSignal, "timestamp">) => {
    const newSignal: CoercionSignal = { ...signal, timestamp: new Date() };
    
    setCoercionState(prev => {
      const signals = [...prev.signals, newSignal].slice(-30);
      
      // Calculate weighted confidence
      const now = Date.now();
      const weightedSum = signals.reduce((sum, s) => {
        const age = (now - s.timestamp.getTime()) / 1000 / 60;
        const decay = Math.max(0, 1 - age / 5); // Faster decay - 5 minutes
        const typeWeight = {
          forced_unlock: 1.5,
          shaking_hands: 1.3,
          erratic_touch: 1.2,
          rapid_navigation: 1.0,
          unusual_timing: 0.8,
          stress_pattern: 1.4,
        }[s.type];
        return sum + s.value * typeWeight * decay;
      }, 0);
      
      const confidence = Math.min(100, Math.round(weightedSum / 2));
      const level = calculateLevel(confidence);
      const isDetected = level !== "none";
      
      return {
        ...prev,
        isDetected,
        confidence,
        signals,
        escalationLevel: level,
        silentMode: level === "confirmed", // Auto-enable silent mode when confirmed
      };
    });

    console.log("[ACIS] Coercion signal:", signal.type, signal.value);
  }, [calculateLevel]);

  // Monitor touch patterns for stress indicators
  const monitorTouchPatterns = useCallback(() => {
    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      // Estimate "pressure" from touch size (not actual pressure API)
      const pressure = (touch as any).force || (touch.radiusX * touch.radiusY) / 100;
      
      const now = Date.now();
      const lastPattern = touchPatternsRef.current[touchPatternsRef.current.length - 1];
      const speed = lastPattern ? 1000 / (now - lastPattern.timestamp) : 0;
      
      const pattern: TouchPattern = {
        pressure: pressure || 0.5,
        speed,
        accuracy: 1, // Would need more sophisticated tracking
        timestamp: now,
      };
      
      touchPatternsRef.current.push(pattern);
      if (touchPatternsRef.current.length > 50) touchPatternsRef.current.shift();

      // Establish baseline from first 10 touches
      if (!baselineTouchRef.current && touchPatternsRef.current.length >= 10) {
        const patterns = touchPatternsRef.current;
        baselineTouchRef.current = {
          avgPressure: patterns.reduce((a, p) => a + p.pressure, 0) / patterns.length,
          avgSpeed: patterns.reduce((a, p) => a + p.speed, 0) / patterns.length,
        };
      }

      // Compare to baseline
      if (baselineTouchRef.current && touchPatternsRef.current.length > 20) {
        const recent = touchPatternsRef.current.slice(-10);
        const recentAvgPressure = recent.reduce((a, p) => a + p.pressure, 0) / recent.length;
        const recentAvgSpeed = recent.reduce((a, p) => a + p.speed, 0) / recent.length;
        
        // Detect shaking (high pressure variance)
        const pressureVariance = recent.reduce((a, p) => 
          a + Math.pow(p.pressure - recentAvgPressure, 2), 0) / recent.length;
        
        if (pressureVariance > 0.3) {
          addSignal({
            type: "shaking_hands",
            value: Math.min(50, pressureVariance * 100),
            description: "Trembling touch detected - possible fear/stress",
          });
        }

        // Detect erratic touching (much faster than normal)
        if (recentAvgSpeed > baselineTouchRef.current.avgSpeed * 2) {
          addSignal({
            type: "erratic_touch",
            value: 35,
            description: "Erratic touch speed - possible coerced navigation",
          });
        }
      }
    };

    document.addEventListener("touchstart", handleTouch);
    document.addEventListener("touchmove", handleTouch);

    return () => {
      document.removeEventListener("touchstart", handleTouch);
      document.removeEventListener("touchmove", handleTouch);
    };
  }, [addSignal]);

  // Monitor for forced unlock patterns
  const monitorUnlockPatterns = useCallback(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const timeSinceLastUnlock = now - lastUnlockTimeRef.current;
        
        // Very rapid unlocks suggest someone forcing access
        if (timeSinceLastUnlock < 5000 && lastUnlockTimeRef.current > 0) {
          unlockCountRef.current++;
          
          if (unlockCountRef.current >= 3) {
            addSignal({
              type: "forced_unlock",
              value: 45,
              description: "Rapid consecutive unlocks - possible forced access",
            });
            unlockCountRef.current = 0;
          }
        } else {
          unlockCountRef.current = Math.max(0, unlockCountRef.current - 1);
        }
        
        lastUnlockTimeRef.current = now;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [addSignal]);

  // Monitor navigation patterns
  const monitorNavigation = useCallback(() => {
    const handlePopState = () => {
      const now = Date.now();
      navigationHistoryRef.current.push({ path: window.location.pathname, time: now });
      
      if (navigationHistoryRef.current.length > 20) navigationHistoryRef.current.shift();
      
      // Detect rapid, erratic navigation (someone being shown around the app)
      const recent = navigationHistoryRef.current.slice(-5);
      if (recent.length >= 5) {
        const timeSpan = recent[recent.length - 1].time - recent[0].time;
        if (timeSpan < 3000) { // 5 pages in 3 seconds
          addSignal({
            type: "rapid_navigation",
            value: 40,
            description: "Rapid navigation detected - possible forced showing",
          });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [addSignal]);

  // Handle coercion detection
  useEffect(() => {
    if (coercionState.escalationLevel === "confirmed" && onCoercionDetected) {
      onCoercionDetected();
    }
  }, [coercionState.escalationLevel, onCoercionDetected]);

  // Enable silent mode - app appears normal but escalates silently
  const enableSilentMode = useCallback(() => {
    setCoercionState(prev => ({ ...prev, silentMode: true }));
    console.log("[ACIS] Silent mode enabled - app will pretend to deactivate");
  }, []);

  // Simulate app shutdown (for coercer to see)
  const fakeShutdown = useCallback(() => {
    // This would show a fake "app closed" screen while continuing to monitor
    setCoercionState(prev => ({ ...prev, silentMode: true }));
    
    // Don't show any toast - that would give it away
    console.log("[ACIS] Fake shutdown initiated - monitoring continues silently");
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    console.log("[ACIS] Starting Anti-Coercion Interface System");
    setIsMonitoring(true);

    const cleanupTouch = monitorTouchPatterns();
    const cleanupUnlock = monitorUnlockPatterns();
    const cleanupNav = monitorNavigation();

    // Store cleanup functions
    coercionTimerRef.current = setInterval(() => {
      // Periodic checks could go here
    }, 10000);

    return () => {
      cleanupTouch();
      cleanupUnlock();
      cleanupNav();
      if (coercionTimerRef.current) clearInterval(coercionTimerRef.current);
    };
  }, [monitorTouchPatterns, monitorUnlockPatterns, monitorNavigation]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    console.log("[ACIS] Stopping Anti-Coercion Interface System");
    setIsMonitoring(false);
    if (coercionTimerRef.current) clearInterval(coercionTimerRef.current);
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    setCoercionState({
      isDetected: false,
      confidence: 0,
      signals: [],
      silentMode: false,
      escalationLevel: "none",
    });
    touchPatternsRef.current = [];
    baselineTouchRef.current = null;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (coercionTimerRef.current) clearInterval(coercionTimerRef.current);
    };
  }, []);

  return {
    coercionState,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetState,
    enableSilentMode,
    fakeShutdown,
    addSignal,
  };
}
