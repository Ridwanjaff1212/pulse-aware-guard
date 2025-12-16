import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface DecoyState {
  isDecoyActive: boolean;
  secretGestureProgress: number;
  lastGestureTime: number;
}

const SECRET_PATTERN = [1, 1, 2, 1]; // tap, tap, double-tap, tap
const GESTURE_TIMEOUT = 2000; // 2 seconds to complete gesture

export function useDecoyMode() {
  const [state, setState] = useState<DecoyState>({
    isDecoyActive: false,
    secretGestureProgress: 0,
    lastGestureTime: 0,
  });

  const patternIndexRef = useRef(0);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetGesture = useCallback(() => {
    patternIndexRef.current = 0;
    tapCountRef.current = 0;
    setState(prev => ({ ...prev, secretGestureProgress: 0 }));
    
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }
  }, []);

  const activateDecoy = useCallback((opts?: { silent?: boolean }) => {
    setState(prev => ({ ...prev, isDecoyActive: true }));

    // Store state in localStorage
    localStorage.setItem('safepulse_decoy_active', 'true');

    if (!opts?.silent) {
      toast({
        title: "Calculator Mode",
        description: "Safety monitoring continues invisibly",
        duration: 2000,
      });
    }
  }, []);

  const deactivateDecoy = useCallback((opts?: { silent?: boolean }) => {
    setState(prev => ({ ...prev, isDecoyActive: false }));
    localStorage.removeItem('safepulse_decoy_active');

    if (!opts?.silent) {
      toast({
        title: "SafePulse Restored",
        description: "Full interface active",
      });
    }
  }, []);

  const handleSecretTap = useCallback(() => {
    const now = Date.now();
    
    // Reset if too much time has passed
    if (now - state.lastGestureTime > GESTURE_TIMEOUT && patternIndexRef.current > 0) {
      resetGesture();
    }

    setState(prev => ({ ...prev, lastGestureTime: now }));

    // Clear existing tap timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    tapCountRef.current++;

    // Wait for potential double tap
    tapTimeoutRef.current = setTimeout(() => {
      const expectedTaps = SECRET_PATTERN[patternIndexRef.current];
      
      if (tapCountRef.current === expectedTaps) {
        patternIndexRef.current++;
        const progress = (patternIndexRef.current / SECRET_PATTERN.length) * 100;
        
        setState(prev => ({ ...prev, secretGestureProgress: progress }));

        // Check if pattern complete
        if (patternIndexRef.current >= SECRET_PATTERN.length) {
          if (state.isDecoyActive) {
            deactivateDecoy();
          } else {
            activateDecoy();
          }
          resetGesture();
        }
      } else {
        resetGesture();
      }

      tapCountRef.current = 0;
    }, 300); // Wait 300ms for double tap

    // Reset gesture if taking too long
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
    
    gestureTimeoutRef.current = setTimeout(() => {
      resetGesture();
    }, GESTURE_TIMEOUT);

  }, [state.lastGestureTime, state.isDecoyActive, resetGesture, activateDecoy, deactivateDecoy]);

  // Check localStorage on mount
  useEffect(() => {
    const decoyActive = localStorage.getItem('safepulse_decoy_active') === 'true';
    if (decoyActive) {
      setState(prev => ({ ...prev, isDecoyActive: true }));
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    };
  }, []);

  return {
    ...state,
    handleSecretTap,
    activateDecoy,
    deactivateDecoy,
    resetGesture,
  };
}
