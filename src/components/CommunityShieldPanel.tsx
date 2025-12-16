import { Shield, Users, MapPin, Radio, AlertTriangle, Eye, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ShieldState } from "@/hooks/useCommunityShield";

interface CommunityShieldPanelProps {
  state: ShieldState;
  isMonitoring: boolean;
  onStart: () => void;
  onStop: () => void;
  onRequestWatchers: () => void;
  onActivateShield: () => void;
  onEmergencyShield: () => void;
  onCancelAlert: () => void;
  onRadiusChange: (radius: number) => void;
}

export function CommunityShieldPanel({
  state,
  isMonitoring,
  onStart,
  onStop,
  onRequestWatchers,
  onActivateShield,
  onEmergencyShield,
  onCancelAlert,
  onRadiusChange,
}: CommunityShieldPanelProps) {
  const getLevelConfig = () => {
    switch (state.alertLevel) {
      case "emergency":
        return {
          color: "text-destructive",
          bg: "bg-destructive/20",
          border: "border-destructive/50",
          label: "EMERGENCY",
        };
      case "active":
        return {
          color: "text-warning",
          bg: "bg-warning/20",
          border: "border-warning/50",
          label: "ACTIVE",
        };
      case "watching":
        return {
          color: "text-accent",
          bg: "bg-accent/20",
          border: "border-accent/50",
          label: "WATCHING",
        };
      default:
        return {
          color: "text-safe",
          bg: "bg-safe/20",
          border: "border-safe/50",
          label: "STANDBY",
        };
    }
  };

  const config = getLevelConfig();

  return (
    <div className={cn(
      "rounded-2xl border p-6 transition-all",
      state.alertLevel !== "standby" ? config.border : "border-border",
      state.alertLevel !== "standby" && `bg-gradient-to-br ${config.bg} to-background`
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            isMonitoring ? config.bg : "bg-secondary",
            state.alertLevel === "emergency" && "animate-pulse"
          )}>
            <Shield className={cn(
              "h-6 w-6",
              isMonitoring ? config.color : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Community Shield
              {state.isActive && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  config.bg, config.color
                )}>
                  {config.label}
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              Distributed human protection network
            </p>
          </div>
        </div>
        <Button
          variant={isMonitoring ? "outline" : "default"}
          onClick={isMonitoring ? onStop : onStart}
        >
          {isMonitoring ? "Disconnect" : "Connect"}
        </Button>
      </div>

      {isMonitoring && (
        <div className="space-y-4">
          {/* Nearby Members */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{state.nearbyCount}</p>
              <p className="text-xs text-muted-foreground">Nearby</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <Radio className="h-5 w-5 text-safe mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{state.respondingCount}</p>
              <p className="text-xs text-muted-foreground">Responding</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <MapPin className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{state.alertRadius}m</p>
              <p className="text-xs text-muted-foreground">Radius</p>
            </div>
          </div>

          {/* Alert Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Alert Radius</span>
              <span className="text-foreground font-medium">{state.alertRadius}m</span>
            </div>
            <Slider
              value={[state.alertRadius]}
              onValueChange={([value]) => onRadiusChange(value)}
              min={100}
              max={2000}
              step={50}
              className="w-full"
            />
          </div>

          {/* Member List */}
          {state.members.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Shield Members
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {state.members.slice(0, 5).map((member, i) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      member.status === "responding" ? "bg-safe/20" :
                      member.status === "nearby" ? "bg-accent/20" : "bg-secondary"
                    )}>
                      <Users className={cn(
                        "h-4 w-4",
                        member.status === "responding" ? "text-safe" :
                        member.status === "nearby" ? "text-accent" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {member.role}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.distance}m away</p>
                    </div>
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      member.status === "responding" ? "bg-safe animate-pulse" :
                      member.status === "nearby" ? "bg-accent" : "bg-muted-foreground"
                    )} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {state.alertLevel === "standby" ? (
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                className="border-accent/50 text-accent hover:bg-accent/10"
                onClick={onRequestWatchers}
              >
                <Eye className="h-4 w-4 mr-1" />
                Watch
              </Button>
              <Button 
                variant="outline"
                className="border-warning/50 text-warning hover:bg-warning/10"
                onClick={onActivateShield}
              >
                <Shield className="h-4 w-4 mr-1" />
                Active
              </Button>
              <Button 
                variant="destructive"
                onClick={onEmergencyShield}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                SOS
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={cn(
                "p-3 rounded-xl text-center",
                config.bg
              )}>
                <p className={cn("font-semibold", config.color)}>
                  {state.alertLevel === "emergency" ? "🚨 EMERGENCY ALERT ACTIVE" :
                   state.alertLevel === "active" ? "⚡ Shield Active" :
                   "👁️ Watchers Notified"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {state.respondingCount} guardians responding
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={onCancelAlert}>
                <X className="h-4 w-4 mr-2" />
                Cancel Alert
              </Button>
            </div>
          )}

          {/* How it works */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">How it works:</strong> When you need help, 
              nearby SafePulse users receive your risk level and approximate location. 
              They can stay visible, call for help, or be a presence nearby.
            </p>
          </div>
        </div>
      )}

      {!isMonitoring && (
        <p className="text-sm text-muted-foreground p-4 rounded-xl bg-secondary/30">
          <strong>Distributed Protection:</strong> Connect to create a temporary safety mesh 
          with nearby SafePulse users, verified volunteers, and community guardians.
        </p>
      )}
    </div>
  );
}
