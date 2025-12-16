import { Brain, Eye, AlertTriangle, Shield, Zap, Activity, MapPin, Clock, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PreDangerState } from "@/hooks/useSituationalIntelligence";

interface PreDangerPanelProps {
  state: PreDangerState;
  isMonitoring: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

const TRIGGER_ICONS: Record<string, any> = {
  route_deviation: MapPin,
  grip_tension: Activity,
  sudden_silence: Volume2,
  prolonged_stillness: Clock,
  unusual_time: Clock,
};

const TRIGGER_LABELS: Record<string, string> = {
  route_deviation: "Route Deviation",
  grip_tension: "Grip Tension",
  sudden_silence: "Sudden Silence",
  prolonged_stillness: "Stillness Detected",
  unusual_time: "Unusual Time",
};

export function PreDangerPanel({ state, isMonitoring, onStart, onStop, onReset }: PreDangerPanelProps) {
  const getLevelConfig = () => {
    switch (state.level) {
      case "critical":
        return {
          color: "text-destructive",
          bg: "bg-destructive/20",
          border: "border-destructive/50",
          label: "CRITICAL",
          description: "Emergency systems primed",
        };
      case "armed":
        return {
          color: "text-warning",
          bg: "bg-warning/20",
          border: "border-warning/50",
          label: "ARMED",
          description: "Safety systems on standby",
        };
      case "monitoring":
        return {
          color: "text-accent",
          bg: "bg-accent/20",
          border: "border-accent/50",
          label: "MONITORING",
          description: "Elevated awareness",
        };
      default:
        return {
          color: "text-safe",
          bg: "bg-safe/20",
          border: "border-safe/50",
          label: "SAFE",
          description: "No threats detected",
        };
    }
  };

  const config = getLevelConfig();

  return (
    <div className={cn(
      "rounded-2xl border p-6 transition-all",
      state.isActive ? config.border : "border-border",
      state.isActive ? `bg-gradient-to-br from-${config.color.split('-')[1]}/5 to-background` : "bg-card"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            isMonitoring ? config.bg : "bg-secondary",
            state.level === "critical" && "animate-pulse"
          )}>
            <Brain className={cn(
              "h-6 w-6",
              isMonitoring ? config.color : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Situational Intelligence
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
              Predictive safety monitoring
            </p>
          </div>
        </div>
        <Button
          variant={isMonitoring ? "outline" : "default"}
          onClick={isMonitoring ? onStop : onStart}
        >
          {isMonitoring ? "Pause" : "Enable"}
        </Button>
      </div>

      {/* Pre-Danger Meter */}
      {isMonitoring && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pre-Danger Confidence</span>
              <span className={cn("font-bold", config.color)}>{state.confidence}%</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  state.level === "critical" ? "bg-destructive" :
                  state.level === "armed" ? "bg-warning" :
                  state.level === "monitoring" ? "bg-accent" : "bg-safe"
                )}
                style={{ width: `${state.confidence}%` }}
              />
              {/* Threshold markers */}
              <div className="relative -mt-3">
                <div className="absolute left-[30%] w-px h-3 bg-border" />
                <div className="absolute left-[50%] w-px h-3 bg-border" />
                <div className="absolute left-[75%] w-px h-3 bg-border" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Safe</span>
              <span>Monitoring</span>
              <span>Armed</span>
              <span>Critical</span>
            </div>
          </div>

          {/* Active Triggers */}
          {state.triggers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Active Triggers
              </p>
              <div className="flex flex-wrap gap-2">
                {state.triggers.map((trigger, i) => {
                  const Icon = TRIGGER_ICONS[trigger] || AlertTriangle;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
                        config.bg, config.color
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{TRIGGER_LABELS[trigger] || trigger}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time in State */}
          {state.isActive && state.timeInState > 0 && (
            <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-secondary/50">
              <span className="text-muted-foreground">Time in {config.label} state</span>
              <span className="font-mono text-foreground">
                {Math.floor(state.timeInState / 60)}:{(state.timeInState % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* What's happening */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-foreground">What's Happening</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {state.level === "critical" 
                ? "Multiple danger signals detected. Camera primed, emergency contacts on standby, keyword sensitivity maximum."
                : state.level === "armed"
                ? "Elevated signals detected. SafePulse is quietly preparing emergency systems."
                : state.level === "monitoring"
                ? "Some unusual patterns detected. Increasing monitoring sensitivity."
                : "Analyzing motion, location, time patterns, and phone handling behavior."}
            </p>
          </div>

          {/* Recent Signals */}
          {state.signals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent Signals ({state.signals.length})
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {state.signals.slice(-5).reverse().map((signal, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-secondary/50">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      signal.value > 50 ? "bg-destructive" : signal.value > 30 ? "bg-warning" : "bg-accent"
                    )} />
                    <span className="flex-1 truncate text-muted-foreground">{signal.description}</span>
                    <span className="text-foreground font-medium">+{signal.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.isActive && (
            <Button variant="outline" size="sm" onClick={onReset} className="w-full">
              Reset Pre-Danger State
            </Button>
          )}
        </div>
      )}

      {!isMonitoring && (
        <p className="text-sm text-muted-foreground p-4 rounded-xl bg-secondary/30">
          <strong>Predictive Safety:</strong> The AI continuously analyzes motion, location, time, 
          and behavior patterns to detect danger <em>before</em> it happens. No user action needed.
        </p>
      )}
    </div>
  );
}
