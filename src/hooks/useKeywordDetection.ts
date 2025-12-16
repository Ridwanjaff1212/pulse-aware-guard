import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface KeywordDetectionState {
  isListening: boolean;
  isActivated: boolean;
  keyword: string;
  lastDetectedAt: Date | null;
  confidenceScore: number;
}

export function useKeywordDetection(userId: string | undefined) {
  const { toast } = useToast();
  const [state, setState] = useState<KeywordDetectionState>({
    isListening: false,
    isActivated: false,
    keyword: "",
    lastDetectedAt: null,
    confidenceScore: 0,
  });
  
  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  // Load user's keyword from profile
  useEffect(() => {
    if (userId) {
      loadKeyword();
    }
  }, [userId]);

  const loadKeyword = async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("emergency_keyword, keyword_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) {
      setState(prev => ({
        ...prev,
        keyword: data.emergency_keyword || "",
        isListening: data.keyword_enabled || false,
      }));
      
      if (data.keyword_enabled && data.emergency_keyword) {
        startListening();
      }
    }
  };

  const saveKeyword = async (newKeyword: string) => {
    if (!userId) return;
    
    await supabase
      .from("profiles")
      .update({ emergency_keyword: newKeyword })
      .eq("user_id", userId);
    
    setState(prev => ({ ...prev, keyword: newKeyword }));
    
    toast({
      title: "Keyword Saved",
      description: `Your emergency keyword "${newKeyword}" has been saved.`,
    });
  };

  const triggerEmergency = useCallback(async () => {
    if (!userId || isProcessingRef.current) return;
    isProcessingRef.current = true;

    console.log("🚨 EMERGENCY KEYWORD DETECTED - TRIGGERING AUTONOMOUS RESPONSE");

    setState(prev => ({
      ...prev,
      isActivated: true,
      lastDetectedAt: new Date(),
    }));

    // Get current location
    let location: { lat: number; lng: number; address?: string } | null = null;
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });
      
      location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Try to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18`
        );
        const data = await response.json();
        location.address = data.display_name;
      } catch {
        location.address = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
      }
    } catch (err) {
      console.error("Could not get location:", err);
    }

    // Create safety incident
    const { data: incident } = await supabase.from("safety_incidents").insert({
      user_id: userId,
      type: "keyword_trigger",
      description: `Emergency keyword "${state.keyword}" detected via voice`,
      status: "active",
      ai_risk_score: 95,
      location_lat: location?.lat,
      location_lng: location?.lng,
      location_address: location?.address,
    }).select().single();

    // Create emergency alert
    if (location) {
      await supabase.from("emergency_alerts").insert({
        user_id: userId,
        incident_id: incident?.id,
        latitude: location.lat,
        longitude: location.lng,
        message: "EMERGENCY: Voice keyword triggered - User may be in danger",
        status: "active",
        radius_meters: 5000,
      });

      // Save emergency location
      await supabase.from("location_history").insert({
        user_id: userId,
        latitude: location.lat,
        longitude: location.lng,
        address: location.address,
        is_emergency: true,
      });
    }

    // Send SMS to emergency contacts via Twilio
    try {
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("phone, name")
        .eq("user_id", userId);

      if (contacts && contacts.length > 0) {
        await supabase.functions.invoke("send-emergency-sms", {
          body: {
            contacts,
            message: `🚨 SAFEPULSE EMERGENCY: Your contact triggered their emergency keyword. Location: ${location?.address || "Unknown"}. Please check on them immediately!`,
            location: location,
          },
        });
      }
    } catch (err) {
      console.error("SMS send error:", err);
    }

    // Show emergency notification
    toast({
      title: "🚨 EMERGENCY ACTIVATED",
      description: "Emergency contacts alerted. Help is on the way.",
      variant: "destructive",
    });

    // Send browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 SafePulse Emergency Activated", {
        body: "Emergency keyword detected. Alerting contacts...",
        icon: "/favicon.ico",
        tag: "emergency",
        requireInteraction: true,
      });
    }

    // Reset after processing
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 10000);
  }, [userId, state.keyword, toast]);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: "Not Supported",
        description: "Voice detection is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log("🎤 Keyword detection started - listening for:", state.keyword);
      setState(prev => ({ ...prev, isListening: true }));
    };

    recognition.onresult = (event: any) => {
      const keyword = state.keyword.toLowerCase();
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        const confidence = event.results[i][0].confidence;
        
        console.log("Heard:", transcript, "Confidence:", confidence);
        
        setState(prev => ({ ...prev, confidenceScore: Math.round(confidence * 100) }));
        
        // Check if keyword is in the transcript
        if (transcript.includes(keyword) && confidence > 0.6) {
          console.log("🚨 KEYWORD DETECTED:", keyword);
          triggerEmergency();
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        // Restart on error
        setTimeout(() => {
          if (state.isListening) {
            startListening();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Auto-restart for continuous listening
      if (state.isListening && !isProcessingRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log("Restarting recognition...");
          }
        }, 500);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start recognition:", err);
    }
  }, [state.keyword, state.isListening, triggerEmergency, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const toggleListening = useCallback(async (enabled: boolean) => {
    if (!userId) return;

    await supabase
      .from("profiles")
      .update({ keyword_enabled: enabled })
      .eq("user_id", userId);

    if (enabled && state.keyword) {
      startListening();
    } else {
      stopListening();
    }
  }, [userId, state.keyword, startListening, stopListening]);

  const resetEmergency = useCallback(() => {
    setState(prev => ({ ...prev, isActivated: false }));
    isProcessingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    saveKeyword,
    startListening,
    stopListening,
    toggleListening,
    resetEmergency,
    triggerEmergency,
  };
}
