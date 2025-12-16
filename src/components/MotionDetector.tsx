import { useState, useEffect } from "react";
import { X, Smartphone, AlertTriangle, Activity, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MotionDetectorProps {
  onClose: () => void;
  onAlert: (type: string) => void;
}

export function MotionDetector({ onClose, onAlert }: MotionDetectorProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [motionData, setMotionData] = useState({
    acceleration: { x: 0, y: 0, z: 0 },
    rotationRate: { alpha: 0, beta: 0, gamma: 0 },
  });
  const [fallDetected, setFallDetected] = useState(false);
  const [inactivitySeconds, setInactivitySeconds] = useState(0);
  const [lastMovement, setLastMovement] = useState(Date.now());

  useEffect(() => {
    let motionHandler: ((e: DeviceMotionEvent) => void) | null = null;
    let inactivityInterval: NodeJS.Timeout | null = null;

    if (isMonitoring) {
      // Motion detection
      motionHandler = (event: DeviceMotionEvent) => {
        const { acceleration, rotationRate } = event;
        
        if (acceleration) {
          const totalAcceleration = Math.sqrt(
            (acceleration.x || 0) ** 2 +
            (acceleration.y || 0) ** 2 +
            (acceleration.z || 0) ** 2
          );

          // Detect sudden fall (high acceleration followed by stillness)
          if (totalAcceleration > 25) {
            setFallDetected(true);
            onAlert("Potential fall detected");
          }

          // Update last movement time if significant motion
          if (totalAcceleration > 1) {
            setLastMovement(Date.now());
            setInactivitySeconds(0);
          }

          setMotionData({
            acceleration: {
              x: acceleration.x || 0,
              y: acceleration.y || 0,
              z: acceleration.z || 0,
            },
            rotationRate: {
              alpha: rotationRate?.alpha || 0,
              beta: rotationRate?.beta || 0,
              gamma: rotationRate?.gamma || 0,
            },
          });
        }
      };

      window.addEventListener("devicemotion", motionHandler);

      // Inactivity detection
      inactivityInterval = setInterval(() => {
        const secondsSinceMovement = Math.floor((Date.now() - lastMovement) / 1000);
        setInactivitySeconds(secondsSinceMovement);

        if (secondsSinceMovement > 300) {
          onAlert("Extended inactivity detected");
        }
      }, 1000);
    }

    return () => {
      if (motionHandler) {
        window.removeEventListener("devicemotion", motionHandler);
      }
      if (inactivityInterval) {
        clearInterval(inactivityInterval);
      }
    };
  }, [isMonitoring, lastMovement, onAlert]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Smartphone className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Motion Detection</h2>
              <p className="text-sm text-muted-foreground">Fall & inactivity monitoring</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!isMonitoring ? (
          <div className="text-center py-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 mb-4">
              <Activity className="h-8 w-8 text-warning" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Motion Monitoring
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Uses your device's accelerometer and gyroscope to detect falls and unusual inactivity.
            </p>
            <Button onClick={() => setIsMonitoring(true)} variant="warning" size="lg">
              <Activity className="mr-2 h-5 w-5" />
              Start Monitoring
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Status */}
            <div className={cn(
              "flex items-center gap-4 rounded-xl border p-4",
              fallDetected 
                ? "border-destructive/30 bg-destructive/10" 
                : "border-safe/30 bg-safe/10"
            )}>
              {fallDetected ? (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              ) : (
                <Activity className="h-8 w-8 text-safe" />
              )}
              <div>
                <h3 className={cn(
                  "font-semibold",
                  fallDetected ? "text-destructive" : "text-safe"
                )}>
                  {fallDetected ? "Fall Detected!" : "Monitoring Active"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {fallDetected 
                    ? "Sudden impact detected. Are you okay?" 
                    : "Watching for falls and inactivity"}
                </p>
              </div>
            </div>

            {/* Acceleration Data */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <h4 className="font-medium text-foreground mb-3">Acceleration</h4>
              <div className="grid grid-cols-3 gap-4">
                {["x", "y", "z"].map((axis) => (
                  <div key={axis} className="text-center">
                    <span className="text-xs text-muted-foreground uppercase">{axis}</span>
                    <p className="text-lg font-mono text-foreground">
                      {motionData.acceleration[axis as keyof typeof motionData.acceleration].toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Inactivity Timer */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Inactivity</span>
                </div>
                <span className={cn(
                  "text-lg font-mono",
                  inactivitySeconds > 60 ? "text-warning" : "text-foreground"
                )}>
                  {formatTime(inactivitySeconds)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Alert triggers after 5 minutes of no movement
              </p>
            </div>

            {fallDetected && (
              <Button 
                onClick={() => setFallDetected(false)} 
                variant="outline" 
                className="w-full"
              >
                I'm Okay - Clear Alert
              </Button>
            )}

            <Button 
              onClick={() => setIsMonitoring(false)} 
              variant="destructive" 
              className="w-full"
            >
              Stop Monitoring
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
