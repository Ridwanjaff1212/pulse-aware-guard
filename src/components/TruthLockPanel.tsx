import { Lock, Unlock, Shield, Clock, AlertTriangle, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TruthLockPanelProps {
  isLocked: boolean;
  timeRemaining: string;
  canCancel: boolean;
  evidenceCount: number;
  autoReleaseHours: number;
  onActivate: () => void;
  onCancel: () => void;
  onManualRelease: () => void;
}

export function TruthLockPanel({
  isLocked,
  timeRemaining,
  canCancel,
  evidenceCount,
  autoReleaseHours,
  onActivate,
  onCancel,
  onManualRelease,
}: TruthLockPanelProps) {
  // Calculate progress (time elapsed)
  const parseTimeRemaining = () => {
    if (!timeRemaining) return 100;
    const match = timeRemaining.match(/(\d+)h\s*(\d+)m/);
    if (!match) return 0;
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const totalMinutes = hours * 60 + minutes;
    const totalAutoReleaseMinutes = autoReleaseHours * 60;
    return ((totalAutoReleaseMinutes - totalMinutes) / totalAutoReleaseMinutes) * 100;
  };

  return (
    <div className={cn(
      "rounded-2xl border p-6 transition-all",
      isLocked 
        ? "border-destructive/50 bg-gradient-to-br from-destructive/10 to-background" 
        : "border-border bg-card"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center",
            isLocked ? "bg-destructive/20 animate-pulse" : "bg-secondary"
          )}>
            {isLocked ? (
              <Lock className="h-6 w-6 text-destructive" />
            ) : (
              <Unlock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Post-Incident Truth Lock™
              {isLocked && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive animate-pulse">
                  ACTIVE
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isLocked 
                ? "Evidence sealed and protected" 
                : "Seal evidence so it can never be deleted"}
            </p>
          </div>
        </div>
      </div>

      {isLocked ? (
        <div className="space-y-4">
          {/* Time Remaining */}
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-foreground">Auto-Release In</span>
              </div>
              <span className="text-lg font-bold text-destructive">{timeRemaining || "Calculating..."}</span>
            </div>
            <Progress value={parseTimeRemaining()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Evidence will be automatically sent to your emergency contacts if not cancelled
            </p>
          </div>

          {/* Evidence Count */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{evidenceCount} Evidence Items Sealed</p>
              <p className="text-xs text-muted-foreground">Hash-verified and tamper-proof</p>
            </div>
            <Shield className="h-5 w-5 text-safe" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {canCancel ? (
              <Button 
                variant="outline" 
                className="flex-1 border-warning text-warning hover:bg-warning/10"
                onClick={onCancel}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Cancel Lock
              </Button>
            ) : (
              <div className="flex-1 p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-xs text-destructive font-medium">
                  Cancellation window expired
                </p>
              </div>
            )}
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={onManualRelease}
            >
              <Send className="h-4 w-4 mr-2" />
              Release Now
            </Button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Anti-Coercion Protection</p>
              <p className="text-muted-foreground text-xs mt-1">
                Even if you're forced to say you're okay, the evidence will still be released 
                automatically unless the lock is cancelled within the first 10 minutes.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When activated, Truth Lock will:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Seal all collected evidence with cryptographic hash
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Prevent deletion or modification of evidence
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Auto-release to contacts after {autoReleaseHours} hours
            </li>
            <li className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Continue even if phone is shut down or app closed
            </li>
          </ul>
          <Button 
            className="w-full" 
            variant="destructive"
            onClick={onActivate}
          >
            <Lock className="h-4 w-4 mr-2" />
            Activate Truth Lock
          </Button>
        </div>
      )}
    </div>
  );
}
