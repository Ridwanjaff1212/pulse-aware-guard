import { AlertCircle, CheckCircle2, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type IncidentStatus = "resolved" | "active" | "pending";

interface Incident {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  location?: string;
  status: IncidentStatus;
}

interface SafetyIncidentsProps {
  incidents: Incident[];
  className?: string;
}

const statusConfig = {
  resolved: {
    icon: CheckCircle2,
    label: "Resolved",
    className: "text-safe",
    bgClassName: "bg-safe/10",
  },
  active: {
    icon: AlertCircle,
    label: "Active",
    className: "text-destructive",
    bgClassName: "bg-destructive/10",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-warning",
    bgClassName: "bg-warning/10",
  },
};

export function SafetyIncidents({ incidents, className }: SafetyIncidentsProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Recent Activity
        </h3>
        <p className="text-sm text-muted-foreground">
          Safety events & incidents
        </p>
      </div>

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-safe/10 p-4">
              <CheckCircle2 className="h-8 w-8 text-safe" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No incidents recorded
            </p>
            <p className="text-xs text-muted-foreground/70">
              Your safety history will appear here
            </p>
          </div>
        ) : (
          incidents.map((incident, index) => {
            const config = statusConfig[incident.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={incident.id}
                className={cn(
                  "flex items-start gap-4 rounded-xl border border-border/50 bg-secondary/30 p-4",
                  "transition-all duration-200 hover:bg-secondary/50",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    config.bgClassName
                  )}
                >
                  <StatusIcon className={cn("h-5 w-5", config.className)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">
                      {incident.type}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(incident.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {incident.description}
                  </p>
                  {incident.location && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {incident.location}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
