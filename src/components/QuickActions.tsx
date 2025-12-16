import { Mic, MapPin, Bell, Camera, Share2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  status?: "active" | "inactive";
  onClick: () => void;
}

interface QuickActionsProps {
  className?: string;
  onKeywordSetup: () => void;
  onLocationShare: () => void;
  onCommunityAlert: () => void;
  onCaptureEvidence: () => void;
}

export function QuickActions({
  className,
  onKeywordSetup,
  onLocationShare,
  onCommunityAlert,
  onCaptureEvidence,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: "keyword",
      icon: Mic,
      label: "Voice Keyword",
      description: "Emergency phrase active",
      status: "active",
      onClick: onKeywordSetup,
    },
    {
      id: "location",
      icon: MapPin,
      label: "Location Sharing",
      description: "Share with contacts",
      onClick: onLocationShare,
    },
    {
      id: "community",
      icon: Bell,
      label: "Community Alert",
      description: "Alert nearby users",
      onClick: onCommunityAlert,
    },
    {
      id: "evidence",
      icon: Camera,
      label: "Capture Evidence",
      description: "Photo & audio capture",
      onClick: onCaptureEvidence,
    },
  ];

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <p className="text-sm text-muted-foreground">
          Fast access to safety features
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isActive = action.status === "active";

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={cn(
                "flex flex-col items-start gap-3 rounded-xl border p-4",
                "transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                "animate-fade-in",
                isActive
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isActive ? "bg-primary/20" : "bg-secondary"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <div className="text-left">
                <h4
                  className={cn(
                    "text-sm font-medium",
                    isActive ? "text-primary" : "text-foreground"
                  )}
                >
                  {action.label}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
              {isActive && (
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-safe animate-pulse" />
                  <span className="text-xs text-safe">Active</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
