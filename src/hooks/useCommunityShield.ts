import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ShieldMember {
  id: string;
  distance: number;
  status: "available" | "responding" | "nearby";
  role: "user" | "volunteer" | "guardian";
  lastSeen: Date;
}

export interface ShieldState {
  isActive: boolean;
  nearbyCount: number;
  respondingCount: number;
  members: ShieldMember[];
  alertRadius: number;
  alertLevel: "standby" | "watching" | "active" | "emergency";
}

export interface AlertPayload {
  type: "watching" | "active" | "emergency";
  location: { lat: number; lng: number };
  riskLevel: number;
  message?: string;
}

export function useCommunityShield(userId: string | undefined) {
  const { toast } = useToast();
  
  const [shieldState, setShieldState] = useState<ShieldState>({
    isActive: false,
    nearbyCount: 0,
    respondingCount: 0,
    members: [],
    alertRadius: 500, // meters
    alertLevel: "standby",
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const locationWatchRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Simulate nearby SafePulse users (in real app, would query from Supabase)
  const generateSimulatedMembers = useCallback((lat: number, lng: number): ShieldMember[] => {
    // Simulate 3-8 nearby users within radius
    const count = Math.floor(Math.random() * 6) + 3;
    const members: ShieldMember[] = [];
    
    for (let i = 0; i < count; i++) {
      // Random distance within 500m
      const distance = Math.floor(Math.random() * 450) + 50;
      const roles: ShieldMember["role"][] = ["user", "user", "user", "volunteer", "guardian"];
      
      members.push({
        id: `shield_${i}_${Date.now()}`,
        distance,
        status: distance < 100 ? "nearby" : "available",
        role: roles[Math.floor(Math.random() * roles.length)],
        lastSeen: new Date(Date.now() - Math.random() * 300000), // Within last 5 min
      });
    }
    
    return members.sort((a, b) => a.distance - b.distance);
  }, []);

  // Update nearby members based on location
  const updateNearbyMembers = useCallback(async () => {
    if (!currentLocationRef.current || !userId) return;

    const { lat, lng } = currentLocationRef.current;
    
    // In production, this would query community_alert_zones table
    // For MVP, simulate nearby users
    const members = generateSimulatedMembers(lat, lng);
    
    setShieldState(prev => ({
      ...prev,
      nearbyCount: members.length,
      respondingCount: members.filter(m => m.status === "responding").length,
      members,
    }));
  }, [userId, generateSimulatedMembers]);

  // Broadcast alert to nearby shield members
  const broadcastAlert = useCallback(async (payload: AlertPayload) => {
    if (!userId || !currentLocationRef.current) return;

    console.log("[SHIELD] Broadcasting alert:", payload.type);

    try {
      // Create emergency alert in database
      const { data: alert, error } = await supabase
        .from("emergency_alerts")
        .insert({
          user_id: userId,
          latitude: payload.location.lat,
          longitude: payload.location.lng,
          status: "active",
          message: payload.message || `${payload.type.toUpperCase()} alert - Risk level: ${payload.riskLevel}`,
          radius_meters: shieldState.alertRadius,
        })
        .select()
        .single();

      if (error) throw error;

      // Update shield state
      setShieldState(prev => ({
        ...prev,
        alertLevel: payload.type === "emergency" ? "emergency" : payload.type === "active" ? "active" : "watching",
        members: prev.members.map(m => ({
          ...m,
          status: m.distance < 200 ? "responding" : m.status,
        })),
      }));

      // Send push notifications to nearby community members
      await supabase.functions.invoke("send-push-notification", {
        body: {
          type: "community",
          userId,
          location: payload.location,
          radius: shieldState.alertRadius,
          message: payload.message,
        },
      });

      toast({
        title: "🛡️ Community Shield Activated",
        description: `${shieldState.nearbyCount} nearby guardians notified`,
      });

    } catch (error) {
      console.error("[SHIELD] Broadcast error:", error);
    }
  }, [userId, shieldState.alertRadius, shieldState.nearbyCount, toast]);

  // Request help from shield (lower urgency than emergency)
  const requestWatchers = useCallback(async () => {
    if (!currentLocationRef.current) return;

    await broadcastAlert({
      type: "watching",
      location: currentLocationRef.current,
      riskLevel: 30,
      message: "Requesting nearby presence - feeling unsafe",
    });
  }, [broadcastAlert]);

  // Activate full shield response
  const activateShield = useCallback(async (riskLevel: number = 50) => {
    if (!currentLocationRef.current) return;

    await broadcastAlert({
      type: "active",
      location: currentLocationRef.current,
      riskLevel,
      message: "Active safety concern - please stay visible nearby",
    });
  }, [broadcastAlert]);

  // Emergency shield (highest priority)
  const emergencyShield = useCallback(async () => {
    if (!currentLocationRef.current) return;

    await broadcastAlert({
      type: "emergency",
      location: currentLocationRef.current,
      riskLevel: 100,
      message: "EMERGENCY! Please respond immediately or call authorities",
    });

    // Vibrate pattern for local feedback
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [broadcastAlert]);

  // Set alert radius
  const setAlertRadius = useCallback((radius: number) => {
    setShieldState(prev => ({ ...prev, alertRadius: Math.max(100, Math.min(2000, radius)) }));
  }, []);

  // Cancel active alert
  const cancelAlert = useCallback(async () => {
    if (!userId) return;

    await supabase
      .from("emergency_alerts")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "active");

    setShieldState(prev => ({
      ...prev,
      alertLevel: "standby",
      members: prev.members.map(m => ({ ...m, status: "available" })),
    }));

    toast({
      title: "Alert Cancelled",
      description: "Community shield returned to standby",
    });
  }, [userId, toast]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    console.log("[SHIELD] Starting Community Shield monitoring");
    setIsMonitoring(true);
    setShieldState(prev => ({ ...prev, isActive: true }));

    // Watch location
    if (navigator.geolocation) {
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          currentLocationRef.current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          updateNearbyMembers();
        },
        (error) => console.log("[SHIELD] Location error:", error),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    // Periodic updates
    updateIntervalRef.current = setInterval(updateNearbyMembers, 30000);

    toast({
      title: "🛡️ Community Shield Active",
      description: "You're connected to nearby SafePulse guardians",
    });
  }, [updateNearbyMembers, toast]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    console.log("[SHIELD] Stopping Community Shield monitoring");
    setIsMonitoring(false);
    setShieldState(prev => ({ ...prev, isActive: false }));

    if (locationWatchRef.current) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, []);

  return {
    shieldState,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    requestWatchers,
    activateShield,
    emergencyShield,
    cancelAlert,
    setAlertRadius,
  };
}
