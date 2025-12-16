import { useState, useEffect } from "react";
import { X, MapPin, Plus, Trash2, Home, Building, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface SafeZonesManagerProps {
  onClose: () => void;
  userId: string;
}

const zoneIcons = {
  Home: Home,
  Work: Building,
  Store: Store,
  Default: MapPin,
};

export function SafeZonesManager({ onClose, userId }: SafeZonesManagerProps) {
  const [zones, setZones] = useState<SafeZone[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneRadius, setNewZoneRadius] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    const { data, error } = await supabase
      .from("safe_zones")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setZones(data);
    }
    setIsLoading(false);
  };

  const addCurrentLocationAsZone = async () => {
    if (!newZoneName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this safe zone.",
        variant: "destructive",
      });
      return;
    }

    if (!navigator.geolocation) {
      toast({
        title: "Location Unavailable",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { error } = await supabase.from("safe_zones").insert({
          user_id: userId,
          name: newZoneName.trim(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radius_meters: newZoneRadius,
        });

        if (error) {
          toast({
            title: "Error",
            description: "Failed to save safe zone.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Safe Zone Added",
            description: `"${newZoneName}" has been added to your safe zones.`,
          });
          setNewZoneName("");
          setNewZoneRadius(100);
          setIsAdding(false);
          loadZones();
        }
      },
      (error) => {
        toast({
          title: "Location Error",
          description: "Could not get your current location.",
          variant: "destructive",
        });
      }
    );
  };

  const deleteZone = async (zoneId: string) => {
    const { error } = await supabase
      .from("safe_zones")
      .delete()
      .eq("id", zoneId);

    if (!error) {
      setZones(zones.filter(z => z.id !== zoneId));
      toast({
        title: "Zone Deleted",
        description: "Safe zone has been removed.",
      });
    }
  };

  const getIconForZone = (name: string) => {
    if (name.toLowerCase().includes("home")) return zoneIcons.Home;
    if (name.toLowerCase().includes("work") || name.toLowerCase().includes("office")) return zoneIcons.Work;
    if (name.toLowerCase().includes("store") || name.toLowerCase().includes("shop")) return zoneIcons.Store;
    return zoneIcons.Default;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-safe/20">
              <MapPin className="h-5 w-5 text-safe" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Safe Zones</h2>
              <p className="text-sm text-muted-foreground">Trusted locations you frequent</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Add New Zone */}
          {!isAdding ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Current Location as Safe Zone
            </Button>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3 animate-fade-in">
              <Input
                placeholder="Zone name (e.g., Home, Office)"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="bg-secondary/50 border-border"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Radius:</label>
                <Input
                  type="number"
                  value={newZoneRadius}
                  onChange={(e) => setNewZoneRadius(parseInt(e.target.value) || 100)}
                  className="w-24 bg-secondary/50 border-border"
                  min={50}
                  max={1000}
                />
                <span className="text-sm text-muted-foreground">meters</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={addCurrentLocationAsZone}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Save Zone
                </Button>
              </div>
            </div>
          )}

          {/* Zone List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Safe Zones</h3>
              <p className="text-sm text-muted-foreground">
                Add locations you frequently visit to help SafePulse understand your routine.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {zones.map((zone, index) => {
                const Icon = getIconForZone(zone.name);
                return (
                  <div
                    key={zone.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 p-4 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-safe/10">
                      <Icon className="h-5 w-5 text-safe" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{zone.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {zone.radius_meters}m radius
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteZone(zone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Safe zones help our AI understand your routine and detect when you might be in an unfamiliar area.
        </p>
      </div>
    </div>
  );
}
