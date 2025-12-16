import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface IntentEvent {
  type: "phone_drop" | "keyword_detected" | "scream_detected" | "stress_spike" | "stillness";
  timestamp: Date;
  confidence: number;
  data?: Record<string, unknown>;
}

interface IntentState {
  events: IntentEvent[];
  isIntentConfirmed: boolean;
  confirmationScore: number;
  lastDropTime: Date | null;
  keywordCount: number;
  timeWindow: number; // 2 minutes in ms
}

const INTENT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export function useIntentVerification(onIntentConfirmed: () => void) {
  const { toast } = useToast();
  const [state, setState] = useState<IntentState>({
    events: [],
    isIntentConfirmed: false,
    confirmationScore: 0,
    lastDropTime: null,
    keywordCount: 0,
    timeWindow: INTENT_WINDOW_MS,
  });

  const confirmationTriggeredRef = useRef(false);

  const calculateConfirmationScore = useCallback((events: IntentEvent[]): number => {
    const now = Date.now();
    const recentEvents = events.filter(
      (e) => now - e.timestamp.getTime() < INTENT_WINDOW_MS
    );

    let score = 0;
    let hasPhoneDrop = false;
    let keywordCount = 0;
    let hasScream = false;
    let hasStress = false;

    recentEvents.forEach((event) => {
      switch (event.type) {
        case "phone_drop":
          hasPhoneDrop = true;
          score += 30 * event.confidence;
          break;
        case "keyword_detected":
          keywordCount++;
          score += 25 * event.confidence;
          break;
        case "scream_detected":
          hasScream = true;
          score += 20 * event.confidence;
          break;
        case "stress_spike":
          hasStress = true;
          score += 15 * event.confidence;
          break;
        case "stillness":
          score += 10 * event.confidence;
          break;
      }
    });

    // Bonus for multi-signal confirmation
    if (hasPhoneDrop && keywordCount >= 1) score += 20;
    if (hasScream && keywordCount >= 1) score += 15;
    if (keywordCount >= 2) score += 25; // Keyword repeated within window

    return Math.min(100, score);
  }, []);

  const checkIntentConfirmation = useCallback((events: IntentEvent[]) => {
    const now = Date.now();
    const recentEvents = events.filter(
      (e) => now - e.timestamp.getTime() < INTENT_WINDOW_MS
    );

    // Intent confirmation logic:
    // REQUIRED: (Phone drop OR sudden motion) AND (keyword repeated within 2 min)
    // BONUS: scream OR stress spike
    
    const hasPhoneDrop = recentEvents.some((e) => e.type === "phone_drop");
    const keywordEvents = recentEvents.filter((e) => e.type === "keyword_detected");
    const hasScream = recentEvents.some((e) => e.type === "scream_detected");
    const hasStress = recentEvents.some((e) => e.type === "stress_spike");

    // Check if keyword was repeated within window
    const keywordRepeated = keywordEvents.length >= 1 && hasPhoneDrop;
    const keywordDoubleRepeated = keywordEvents.length >= 2;
    
    // Core intent confirmed: drop + keyword OR double keyword
    const intentConfirmed = (hasPhoneDrop && keywordEvents.length >= 1) || keywordDoubleRepeated;

    return intentConfirmed;
  }, []);

  const registerEvent = useCallback((event: Omit<IntentEvent, "timestamp">) => {
    const newEvent: IntentEvent = { ...event, timestamp: new Date() };
    
    setState((prev) => {
      const events = [...prev.events, newEvent].slice(-50); // Keep last 50 events
      const score = calculateConfirmationScore(events);
      const isConfirmed = checkIntentConfirmation(events);
      
      const keywordCount = events.filter(
        (e) => 
          e.type === "keyword_detected" &&
          Date.now() - e.timestamp.getTime() < INTENT_WINDOW_MS
      ).length;

      const lastDrop = events
        .filter((e) => e.type === "phone_drop")
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      return {
        ...prev,
        events,
        confirmationScore: score,
        isIntentConfirmed: isConfirmed,
        keywordCount,
        lastDropTime: lastDrop?.timestamp || null,
      };
    });
  }, [calculateConfirmationScore, checkIntentConfirmation]);

  // Trigger callback when intent is confirmed
  useEffect(() => {
    if (state.isIntentConfirmed && !confirmationTriggeredRef.current) {
      confirmationTriggeredRef.current = true;
      console.log("🚨 INTENT CONFIRMED - Multi-signal verification passed");
      toast({
        title: "🚨 Intent Verified",
        description: "Multiple distress signals confirmed. Activating emergency response.",
        variant: "destructive",
      });
      onIntentConfirmed();
    }
  }, [state.isIntentConfirmed, onIntentConfirmed, toast]);

  const resetIntent = useCallback(() => {
    setState({
      events: [],
      isIntentConfirmed: false,
      confirmationScore: 0,
      lastDropTime: null,
      keywordCount: 0,
      timeWindow: INTENT_WINDOW_MS,
    });
    confirmationTriggeredRef.current = false;
  }, []);

  const registerPhoneDrop = useCallback((confidence: number = 1) => {
    registerEvent({ type: "phone_drop", confidence });
    console.log("📱 Phone drop detected - confidence:", confidence);
  }, [registerEvent]);

  const registerKeyword = useCallback((confidence: number = 1) => {
    registerEvent({ type: "keyword_detected", confidence });
    console.log("🎤 Keyword detected - confidence:", confidence);
  }, [registerEvent]);

  const registerScream = useCallback((confidence: number = 1) => {
    registerEvent({ type: "scream_detected", confidence });
    console.log("😱 Scream detected - confidence:", confidence);
  }, [registerEvent]);

  const registerStressSpike = useCallback((confidence: number = 1) => {
    registerEvent({ type: "stress_spike", confidence });
    console.log("💓 Stress spike detected - confidence:", confidence);
  }, [registerEvent]);

  const registerStillness = useCallback((confidence: number = 1) => {
    registerEvent({ type: "stillness", confidence });
    console.log("🧍 Stillness detected - confidence:", confidence);
  }, [registerEvent]);

  return {
    ...state,
    registerEvent,
    registerPhoneDrop,
    registerKeyword,
    registerScream,
    registerStressSpike,
    registerStillness,
    resetIntent,
  };
}
