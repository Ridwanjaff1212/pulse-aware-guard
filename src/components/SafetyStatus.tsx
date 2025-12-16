import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type SafetyLevel = "safe" | "monitoring" | "emergency";

interface SafetyStatusProps {
  level: SafetyLevel;
  className?: string;
}

const statusConfig = {
  safe: {
    icon: ShieldCheck,
    emoji: "✅",
    label: "All Clear",
    description: "You're protected by SafePulse AI",
    bgClass: "bg-safe/10",
    borderClass: "border-safe/30",
    iconClass: "text-safe",
    pulseClass: "animate-pulse-safe",
    dotClass: "bg-safe",
  },
  monitoring: {
    icon: Shield,
    emoji: "⚠️",
    label: "Monitoring Active",
    description: "AI sensors are tracking your safety",
    bgClass: "bg-warning/10",
    borderClass: "border-warning/30",
    iconClass: "text-warning",
    pulseClass: "animate-pulse-warning",
    dotClass: "bg-warning",
  },
  emergency: {
    icon: ShieldAlert,
    emoji: "🚨",
    label: "Emergency Active",
    description: "Help is on the way • Contacts alerted",
    bgClass: "bg-destructive/10",
    borderClass: "border-destructive/30",
    iconClass: "text-destructive",
    pulseClass: "animate-pulse-emergency",
    dotClass: "bg-destructive",
  },
};

export function SafetyStatus({ level, className }: SafetyStatusProps) {
  const config = statusConfig[level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 transition-all duration-300",
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("relative rounded-full p-4", config.bgClass)}>
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              config.pulseClass,
              config.dotClass
            )}
          />
          <Icon className={cn("relative h-8 w-8", config.iconClass)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.emoji}</span>
            <h3 className="text-lg font-semibold text-foreground">
              {config.label}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className={cn("h-3 w-3 rounded-full", config.dotClass, config.pulseClass)} />
      </div>
    </div>
  );
}