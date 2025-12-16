import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, AlertTriangle, CheckCircle2, Clock, Download,
  Filter, Search, MapPin, Mic, Activity, Brain, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  type: string;
  description: string;
  status: string;
  ai_risk_score: number | null;
  voice_stress_score: number | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  resolved_at: string | null;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  sos_trigger: { icon: AlertTriangle, label: "SOS Alert", color: "destructive" },
  voice_detection: { icon: Mic, label: "Voice Detection", color: "accent" },
  motion_alert: { icon: Activity, label: "Motion Alert", color: "warning" },
  ai_detection: { icon: Brain, label: "AI Detection", color: "primary" },
  inactivity: { icon: Clock, label: "Inactivity", color: "muted-foreground" },
  emergency_location: { icon: MapPin, label: "Emergency Location", color: "destructive" },
};

export default function Incidents() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadIncidents();
    }
  }, [user, filter]);

  const loadIncidents = async () => {
    setIsLoading(true);
    let query = supabase
      .from("safety_incidents")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (filter === "active") {
      query = query.eq("status", "active");
    } else if (filter === "resolved") {
      query = query.eq("status", "resolved");
    }

    const { data } = await query;
    if (data) setIncidents(data);
    setIsLoading(false);
  };

  const resolveIncident = async (id: string) => {
    await supabase
      .from("safety_incidents")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    
    toast({
      title: "Incident Resolved",
      description: "The incident has been marked as resolved",
    });
    loadIncidents();
  };

  const exportIncidents = () => {
    const data = incidents.map(i => ({
      Type: TYPE_CONFIG[i.type]?.label || i.type,
      Description: i.description,
      Status: i.status,
      "Risk Score": i.ai_risk_score || "N/A",
      Location: i.location_address || "Unknown",
      Date: new Date(i.created_at).toLocaleString(),
    }));
    
    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map(row => Object.values(row).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safepulse-incidents-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    
    toast({
      title: "Export Complete",
      description: "Incidents exported to CSV file",
    });
  };

  const filteredIncidents = incidents.filter(i => 
    i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout title="Incident History">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{incidents.length}</p>
            <p className="text-xs text-muted-foreground">Total Incidents</p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-center">
            <p className="text-3xl font-bold text-warning">
              {incidents.filter(i => i.status === "active").length}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="rounded-xl border border-safe/30 bg-safe/5 p-4 text-center">
            <p className="text-3xl font-bold text-safe">
              {incidents.filter(i => i.status === "resolved").length}
            </p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "resolved"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportIncidents}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Incident List */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-safe/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No incidents found</p>
              <p className="text-xs text-muted-foreground mt-1">You're all clear!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredIncidents.map((incident) => {
                const config = TYPE_CONFIG[incident.type] || TYPE_CONFIG.ai_detection;
                const Icon = config.icon;
                const isExpanded = expandedId === incident.id;
                const isActive = incident.status === "active";

                return (
                  <div key={incident.id} className="hover:bg-secondary/30 transition-colors">
                    <button
                      className="w-full p-4 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center",
                          isActive ? "bg-warning/20" : "bg-safe/20"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            isActive ? "text-warning" : "text-safe"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{config.label}</p>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              isActive ? "bg-warning/20 text-warning" : "bg-safe/20 text-safe"
                            )}>
                              {incident.status}
                            </span>
                            {incident.ai_risk_score && incident.ai_risk_score > 70 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                                High Risk
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {incident.description}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(incident.created_at).toLocaleDateString()}
                          </p>
                          <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform mx-auto mt-1",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/30">
                          {incident.ai_risk_score !== null && (
                            <div>
                              <p className="text-xs text-muted-foreground">AI Risk Score</p>
                              <p className={cn(
                                "text-lg font-bold",
                                incident.ai_risk_score > 70 ? "text-destructive" :
                                incident.ai_risk_score > 40 ? "text-warning" : "text-safe"
                              )}>
                                {incident.ai_risk_score}%
                              </p>
                            </div>
                          )}
                          {incident.voice_stress_score !== null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Voice Stress</p>
                              <p className="text-lg font-bold text-foreground">
                                {incident.voice_stress_score}%
                              </p>
                            </div>
                          )}
                          {incident.location_address && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="text-sm text-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {incident.location_address}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm text-foreground">
                              {new Date(incident.created_at).toLocaleString()}
                            </p>
                          </div>
                          {incident.resolved_at && (
                            <div>
                              <p className="text-xs text-muted-foreground">Resolved</p>
                              <p className="text-sm text-foreground">
                                {new Date(incident.resolved_at).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {isActive && (
                          <Button
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveIncident(incident.id);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Resolved
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
