import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Zap, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DangerState, SafetySignal } from "@/hooks/useAutonomousSafety";

interface DangerConfidenceScoreProps {
  dangerState: DangerState;
  compact?: boolean;
}

export function DangerConfidenceScore({ dangerState, compact }: DangerConfidenceScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const diff = dangerState.confidenceScore - animatedScore;
    if (Math.abs(diff) > 1) {
      const timer = setTimeout(() => {
        setAnimatedScore((prev) => prev + Math.sign(diff) * Math.ceil(Math.abs(diff) / 10));
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setAnimatedScore(dangerState.confidenceScore);
    }
  }, [dangerState.confidenceScore, animatedScore]);

  const getRiskConfig = () => {
    switch (dangerState.riskLevel) {
      case "emergency":
        return {
          color: "text-destructive",
          bg: "bg-destructive/20",
          border: "border-destructive/50",
          gradient: "from-destructive/20 to-destructive/5",
          pulse: "animate-pulse-emergency",
          icon: AlertTriangle,
          label: "EMERGENCY",
        };
      case "high":
        return {
          color: "text-warning",
          bg: "bg-warning/20",
          border: "border-warning/50",
          gradient: "from-warning/20 to-warning/5",
          pulse: "animate-pulse-warning",
          icon: Zap,
          label: "HIGH RISK",
        };
      case "uncertain":
        return {
          color: "text-accent",
          bg: "bg-accent/20",
          border: "border-accent/50",
          gradient: "from-accent/20 to-accent/5",
          pulse: "",
          icon: Activity,
          label: "UNCERTAIN",
        };
      default:
        return {
          color: "text-safe",
          bg: "bg-safe/20",
          border: "border-safe/50",
          gradient: "from-safe/20 to-safe/5",
          pulse: "animate-pulse-safe",
          icon: Shield,
          label: "SAFE",
        };
    }
  };

  const config = getRiskConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border", config.bg, config.border)}>
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-bold", config.color)}>{animatedScore}</span>
        <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-6", config.border, `bg-gradient-to-br ${config.gradient}`)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", config.bg, config.pulse)}>
            <Icon className={cn("h-6 w-6", config.color)} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Danger Confidence</h3>
            <p className="text-sm text-muted-foreground">Autonomous AI Assessment</p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-3xl font-bold tabular-nums", config.color)}>{animatedScore}</div>
          <div className={cn("text-xs font-medium uppercase tracking-wide", config.color)}>{config.label}</div>
        </div>
      </div>

      {/* Score Bar */}
      <div className="relative h-3 rounded-full bg-secondary overflow-hidden mb-4">
        <div
          className={cn("h-full transition-all duration-500 rounded-full", {
            "bg-safe": dangerState.riskLevel === "safe",
            "bg-accent": dangerState.riskLevel === "uncertain",
            "bg-warning": dangerState.riskLevel === "high",
            "bg-destructive": dangerState.riskLevel === "emergency",
          })}
          style={{ width: `${animatedScore}%` }}
        />
        {/* Threshold markers */}
        <div className="absolute top-0 left-[30%] w-px h-full bg-border" />
        <div className="absolute top-0 left-[60%] w-px h-full bg-border" />
        <div className="absolute top-0 left-[80%] w-px h-full bg-border" />
      </div>

      {/* Threshold Labels */}
      <div className="flex justify-between text-xs text-muted-foreground mb-4">
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>

      {/* Recent Signals */}
      {dangerState.signals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Signals</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {dangerState.signals.slice(-5).reverse().map((signal, i) => (
              <SignalRow key={i} signal={signal} />
            ))}
          </div>
        </div>
      )}

      {/* Autonomous Mode Indicator */}
      {dangerState.autonomousMode && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-safe animate-pulse" />
          <span className="text-muted-foreground">Autonomous response enabled</span>
        </div>
      )}
    </div>
  );
}

function SignalRow({ signal }: { signal: SafetySignal }) {
  const getSignalIcon = () => {
    switch (signal.type) {
      case "motion":
        return Activity;
      case "voice":
        return "🎤";
      case "inactivity":
        return "⏸️";
      case "location":
        return "📍";
      case "time":
        return "🌙";
      default:
        return "⚡";
    }
  };

  const icon = getSignalIcon();
  const age = Math.round((Date.now() - signal.timestamp.getTime()) / 1000);
  const ageStr = age < 60 ? `${age}s ago` : `${Math.round(age / 60)}m ago`;

  return (
    <div className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-secondary/50">
      <span>{typeof icon === "string" ? icon : <Activity className="h-3 w-3" />}</span>
      <span className="flex-1 truncate text-muted-foreground">{signal.description}</span>
      <span className="text-muted-foreground/50">{ageStr}</span>
      <span className="font-medium text-foreground">+{signal.value}</span>
    </div>
  );
}
