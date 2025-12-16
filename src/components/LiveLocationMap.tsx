import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Navigation, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LiveLocationMapProps {
  onLocationUpdate?: (lat: number, lng: number) => void;
  isEmergency?: boolean;
  safeZones?: { name: string; lat: number; lng: number; radius: number }[];
}

export function LiveLocationMap({ onLocationUpdate, isEmergency, safeZones = [] }: LiveLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("Detecting location...");
  const [isTracking, setIsTracking] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [showTokenInput, setShowTokenInput] = useState(true);

  useEffect(() => {
    // Try to get saved token
    const savedToken = localStorage.getItem("mapbox_token");
    if (savedToken) {
      setMapboxToken(savedToken);
      setShowTokenInput(false);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      zoom: 14,
      center: [0, 0],
      pitch: 45,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Get initial location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          
          if (map.current) {
            map.current.flyTo({ center: [longitude, latitude], zoom: 15 });
            
            // Create custom marker
            const el = document.createElement("div");
            el.className = "pulse-marker";
            el.innerHTML = `
              <div class="marker-inner ${isEmergency ? 'emergency' : ''}">
                <div class="marker-pulse"></div>
                <div class="marker-dot"></div>
              </div>
            `;
            
            marker.current = new mapboxgl.Marker(el)
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          }

          // Reverse geocode
          fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`
          )
            .then((res) => res.json())
            .then((data) => {
              const place = data.features?.[0]?.place_name || "Location found";
              setAddress(place);
            });

          onLocationUpdate?.(latitude, longitude);
        },
        () => setAddress("Location access denied")
      );
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, isEmergency]);

  // Live tracking
  useEffect(() => {
    if (!isTracking || !map.current || !mapboxToken) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        if (marker.current) {
          marker.current.setLngLat([longitude, latitude]);
        }
        
        map.current?.panTo([longitude, latitude]);
        onLocationUpdate?.(latitude, longitude);
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking, mapboxToken]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem("mapbox_token", mapboxToken);
      setShowTokenInput(false);
    }
  };

  if (showTokenInput) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Live Location Map</h3>
            <p className="text-xs text-muted-foreground">Enter your Mapbox token to enable</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="pk.eyJ1..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
          />
          <Button onClick={handleTokenSubmit} className="w-full">
            Enable Map
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Get your free token at{" "}
            <a href="https://mapbox.com" target="_blank" className="text-primary underline">
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            isEmergency ? "bg-destructive/20" : "bg-primary/10"
          )}>
            {isEmergency ? (
              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
            ) : (
              <MapPin className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Live Location</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{address}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={isTracking ? "default" : "outline"}
          onClick={() => setIsTracking(!isTracking)}
          className={cn(isTracking && "bg-safe hover:bg-safe/90")}
        >
          <Navigation className={cn("h-4 w-4 mr-1", isTracking && "animate-pulse")} />
          {isTracking ? "Tracking" : "Track"}
        </Button>
      </div>
      
      <div ref={mapContainer} className="h-[300px] relative">
        {isEmergency && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">EMERGENCY MODE - Location being shared</span>
            </div>
          </div>
        )}
      </div>
      
      {location && (
        <div className="p-3 bg-secondary/30 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </span>
          <span className={cn(
            "flex items-center gap-1",
            isTracking ? "text-safe" : "text-muted-foreground"
          )}>
            <div className={cn(
              "h-2 w-2 rounded-full",
              isTracking ? "bg-safe animate-pulse" : "bg-muted-foreground"
            )} />
            {isTracking ? "Live" : "Static"}
          </span>
        </div>
      )}

      <style>{`
        .pulse-marker .marker-inner {
          position: relative;
          width: 24px;
          height: 24px;
        }
        .pulse-marker .marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: hsl(var(--primary));
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .pulse-marker .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: hsl(var(--primary) / 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .pulse-marker .marker-inner.emergency .marker-dot {
          background: hsl(var(--destructive));
        }
        .pulse-marker .marker-inner.emergency .marker-pulse {
          background: hsl(var(--destructive) / 0.4);
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
