import { MapPin, Navigation, Clock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LocationStatusProps {
  isSharing: boolean;
  lastUpdate?: Date;
  address?: string;
  onToggleSharing: () => void;
  className?: string;
}

export function LocationStatus({
  isSharing,
  lastUpdate,
  address,
  onToggleSharing,
  className,
}: LocationStatusProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isSharing ? "bg-primary/20" : "bg-secondary"
            )}
          >
            <MapPin
              className={cn(
                "h-5 w-5",
                isSharing ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Location</h3>
            <p className="text-sm text-muted-foreground">
              {isSharing ? "Sharing with contacts" : "Location hidden"}
            </p>
          </div>
        </div>
        <Button
          variant={isSharing ? "default" : "outline"}
          size="sm"
          onClick={onToggleSharing}
        >
          {isSharing ? (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Sharing
            </>
          ) : (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Hidden
            </>
          )}
        </Button>
      </div>

      {isSharing && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
            <Navigation className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {address || "Fetching location..."}
              </p>
            </div>
          </div>

          {lastUpdate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last updated: {formatTime(lastUpdate)}
            </div>
          )}
        </div>
      )}

      {!isSharing && (
        <div className="rounded-lg border border-dashed border-border/50 bg-secondary/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Enable location sharing to let your emergency contacts see where you
            are in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
