import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmergencyButtonProps {
  onTrigger: () => void;
  className?: string;
}

export function EmergencyButton({ onTrigger, className }: EmergencyButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const holdDuration = 2000;

  const handleMouseDown = () => {
    setIsHolding(true);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / holdDuration) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setIsHolding(false);
        setHoldProgress(0);
        setShowConfirm(true);
      }
    }, 50);

    const handleRelease = () => {
      clearInterval(interval);
      setIsHolding(false);
      setHoldProgress(0);
      document.removeEventListener("mouseup", handleRelease);
      document.removeEventListener("touchend", handleRelease);
    };

    document.addEventListener("mouseup", handleRelease);
    document.addEventListener("touchend", handleRelease);
  };

  const handleConfirmEmergency = () => {
    setShowConfirm(false);
    onTrigger();
  };

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          className={cn(
            "relative flex h-32 w-32 items-center justify-center rounded-full",
            "bg-destructive/20 border-4 border-destructive/40",
            "transition-all duration-200",
            "hover:bg-destructive/30 hover:border-destructive/60",
            "focus:outline-none focus:ring-4 focus:ring-destructive/30",
            isHolding && "scale-95"
          )}
        >
          {/* Progress ring */}
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-destructive/20"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${holdProgress * 2.89} 289`}
              className="text-destructive transition-all duration-100"
            />
          </svg>

          <div className="flex flex-col items-center gap-1">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              {isHolding ? "Hold..." : "SOS"}
            </span>
          </div>
        </button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Hold for 2 seconds to activate
        </p>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="border-destructive/30 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Emergency
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will alert your emergency contacts and share your location.
              Are you sure you want to activate Emergency Mode?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirmEmergency}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Activate SOS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
