import { useEffect, useState, useRef, useCallback } from "react";

interface ShakeState {
  isShaking: boolean;
  shakeCount: number;
  lastShakeTime: Date | null;
  isEnabled: boolean;
  sensitivity: number;
}

export function useShakeDetection(
  onShakeDetected: () => void,
  requiredShakes = 3,
  timeWindow = 2000
) {
  const [state, setState] = useState<ShakeState>({
    isShaking: false,
    shakeCount: 0,
    lastShakeTime: null,
    isEnabled: false,
    sensitivity: 25,
  });

  const shakeHistory = useRef<number[]>([]);
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    const { x, y, z } = acceleration;
    if (x === null || y === null || z === null) return;

    const deltaX = Math.abs(x - lastAcceleration.current.x);
    const deltaY = Math.abs(y - lastAcceleration.current.y);
    const deltaZ = Math.abs(z - lastAcceleration.current.z);

    lastAcceleration.current = { x, y, z };

    const totalDelta = deltaX + deltaY + deltaZ;

    if (totalDelta > state.sensitivity) {
      const now = Date.now();
      
      // Clean old shakes
      shakeHistory.current = shakeHistory.current.filter(
        (time) => now - time < timeWindow
      );
      
      shakeHistory.current.push(now);

      setState((prev) => ({
        ...prev,
        isShaking: true,
        shakeCount: shakeHistory.current.length,
        lastShakeTime: new Date(),
      }));

      // Check if we've reached the threshold
      if (shakeHistory.current.length >= requiredShakes) {
        onShakeDetected();
        shakeHistory.current = [];
        setState((prev) => ({ ...prev, shakeCount: 0 }));
      }

      // Reset shaking state after a short delay
      setTimeout(() => {
        setState((prev) => ({ ...prev, isShaking: false }));
      }, 200);
    }
  }, [state.sensitivity, requiredShakes, timeWindow, onShakeDetected]);

  const enableShakeDetection = useCallback(async () => {
    // Request permission on iOS 13+
    if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== "granted") {
          console.log("Motion permission denied");
          return false;
        }
      } catch (error) {
        console.error("Error requesting motion permission:", error);
        return false;
      }
    }

    window.addEventListener("devicemotion", handleMotion);
    setState((prev) => ({ ...prev, isEnabled: true }));
    return true;
  }, [handleMotion]);

  const disableShakeDetection = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    setState((prev) => ({ ...prev, isEnabled: false, isShaking: false, shakeCount: 0 }));
  }, [handleMotion]);

  const setSensitivity = useCallback((value: number) => {
    setState((prev) => ({ ...prev, sensitivity: value }));
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [handleMotion]);

  return {
    ...state,
    enableShakeDetection,
    disableShakeDetection,
    setSensitivity,
  };
}
