import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TruthLockState {
  isLocked: boolean;
  lockId: string | null;
  lockedAt: Date | null;
  unlockDeadline: Date | null;
  autoReleaseHours: number;
  canCancel: boolean;
  timeRemaining: string;
}

interface Evidence {
  type: string;
  data: string;
  timestamp: Date;
  hash?: string;
}

export function useTruthLock(userId: string | undefined) {
  const { toast } = useToast();
  const [state, setState] = useState<TruthLockState>({
    isLocked: false,
    lockId: null,
    lockedAt: null,
    unlockDeadline: null,
    autoReleaseHours: 24,
    canCancel: true,
    timeRemaining: "",
  });
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a simple hash for evidence integrity
  const generateHash = useCallback((data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + Date.now().toString(36);
  }, []);

  // Lock an incident - makes evidence irreversible
  const lockIncident = useCallback(async (
    incidentId: string,
    autoReleaseHours: number = 24
  ) => {
    if (!userId) return null;

    const unlockDeadline = new Date();
    unlockDeadline.setHours(unlockDeadline.getHours() + autoReleaseHours);

    const evidenceHash = generateHash(JSON.stringify(evidence));

    try {
      const { data, error } = await supabase
        .from("incident_locks")
        .insert({
          user_id: userId,
          incident_id: incidentId,
          unlock_deadline: unlockDeadline.toISOString(),
          auto_release_hours: autoReleaseHours,
          evidence_hash: evidenceHash,
        })
        .select()
        .single();

      if (error) throw error;

      setState({
        isLocked: true,
        lockId: data.id,
        lockedAt: new Date(data.locked_at),
        unlockDeadline,
        autoReleaseHours,
        canCancel: true,
        timeRemaining: "",
      });

      toast({
        title: "🔒 Truth Lock Activated",
        description: `Evidence is sealed. Auto-release in ${autoReleaseHours} hours if not cancelled.`,
      });

      console.log("🔒 TRUTH LOCK: Incident sealed, evidence hash:", evidenceHash);
      return data.id;
    } catch (error) {
      console.error("Truth Lock error:", error);
      toast({
        title: "Lock Failed",
        description: "Could not lock the incident.",
        variant: "destructive",
      });
      return null;
    }
  }, [userId, evidence, generateHash, toast]);

  // Add evidence to the lock
  const addEvidence = useCallback((type: string, data: string) => {
    const newEvidence: Evidence = {
      type,
      data,
      timestamp: new Date(),
      hash: generateHash(data),
    };
    setEvidence(prev => [...prev, newEvidence]);
    console.log("📦 TRUTH LOCK: Evidence added:", type);
    return newEvidence;
  }, [generateHash]);

  // Cancel the lock (only within cancellation window)
  const cancelLock = useCallback(async () => {
    if (!state.lockId || !state.canCancel) {
      toast({
        title: "Cannot Cancel",
        description: "The cancellation window has expired.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("incident_locks")
        .update({ is_released: true, released_at: new Date().toISOString() })
        .eq("id", state.lockId);

      if (error) throw error;

      setState({
        isLocked: false,
        lockId: null,
        lockedAt: null,
        unlockDeadline: null,
        autoReleaseHours: 24,
        canCancel: true,
        timeRemaining: "",
      });
      setEvidence([]);

      toast({
        title: "Lock Cancelled",
        description: "The incident lock has been cancelled.",
      });

      return true;
    } catch (error) {
      console.error("Cancel lock error:", error);
      return false;
    }
  }, [state.lockId, state.canCancel, toast]);

  // Release evidence to contacts (auto or manual)
  const releaseEvidence = useCallback(async () => {
    if (!userId || !state.lockId) return;

    try {
      // Get emergency contacts with email
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", userId);

      const emailContacts = contacts?.filter(c => c.email) || [];

      if (emailContacts.length > 0) {
        // Send emergency emails
        await supabase.functions.invoke("send-emergency-email", {
          body: {
            contacts: emailContacts.map(c => ({ name: c.name, email: c.email })),
            userId,
            evidenceCount: evidence.length,
            isAutoRelease: true,
            message: "This is an automated evidence release from SafePulse Truth Lock.",
          },
        });
      }

      // Mark as released
      await supabase
        .from("incident_locks")
        .update({ is_released: true, released_at: new Date().toISOString() })
        .eq("id", state.lockId);

      toast({
        title: "🚨 Evidence Released",
        description: `Sent to ${emailContacts.length} emergency contacts.`,
        variant: "destructive",
      });

      console.log("📤 TRUTH LOCK: Evidence released to", emailContacts.length, "contacts");
    } catch (error) {
      console.error("Release evidence error:", error);
    }
  }, [userId, state.lockId, evidence, toast]);

  // Update time remaining countdown
  useEffect(() => {
    if (state.isLocked && state.unlockDeadline) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const deadline = new Date(state.unlockDeadline!);
        const diff = deadline.getTime() - now.getTime();

        if (diff <= 0) {
          // Auto-release triggered
          releaseEvidence();
          setState(prev => ({ ...prev, isLocked: false, canCancel: false }));
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        // Check if past cancellation window (first 10 minutes)
        const lockedAt = new Date(state.lockedAt!);
        const cancelWindow = 10 * 60 * 1000; // 10 minutes
        const canStillCancel = now.getTime() - lockedAt.getTime() < cancelWindow;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setState(prev => ({
          ...prev,
          canCancel: canStillCancel,
          timeRemaining: `${hours}h ${minutes}m ${seconds}s`,
        }));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isLocked, state.unlockDeadline, state.lockedAt, releaseEvidence]);

  // Check for active locks on mount
  useEffect(() => {
    if (!userId) return;

    const checkActiveLocks = async () => {
      const { data } = await supabase
        .from("incident_locks")
        .select("*")
        .eq("user_id", userId)
        .eq("is_released", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setState({
          isLocked: true,
          lockId: data.id,
          lockedAt: new Date(data.locked_at),
          unlockDeadline: new Date(data.unlock_deadline),
          autoReleaseHours: data.auto_release_hours,
          canCancel: true,
          timeRemaining: "",
        });
      }
    };

    checkActiveLocks();
  }, [userId]);

  return {
    ...state,
    evidence,
    lockIncident,
    addEvidence,
    cancelLock,
    releaseEvidence,
  };
}
