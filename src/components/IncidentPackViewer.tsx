import { useState } from "react";
import { X, FileText, Download, Share2, Clock, MapPin, Activity, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Incident {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  location?: string;
  status: "resolved" | "active" | "pending";
}

interface IncidentPackViewerProps {
  onClose: () => void;
  incidents: Incident[];
  userId: string;
}

export function IncidentPackViewer({ onClose, incidents, userId }: IncidentPackViewerProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);

  const generateIncidentPack = async (incident: Incident) => {
    setSelectedIncident(incident);
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("safepulse-ai", {
        body: {
          type: "generate_incident_summary",
          data: {
            incidentType: incident.type,
            timestamp: incident.timestamp.toISOString(),
            location: incident.location || "Unknown",
            events: [
              { time: incident.timestamp.toISOString(), event: incident.description }
            ],
            riskScore: 75,
            status: incident.status,
          },
        },
      });

      if (error) throw error;

      if (data?.analysis) {
        setGeneratedSummary(typeof data.analysis === "string" 
          ? data.analysis 
          : JSON.stringify(data.analysis, null, 2));
      }
    } catch (err) {
      console.error("Error generating incident pack:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "text-safe bg-safe/10 border-safe/30";
      case "active":
        return "text-destructive bg-destructive/10 border-destructive/30";
      case "pending":
        return "text-warning bg-warning/10 border-warning/30";
      default:
        return "text-muted-foreground bg-muted/10 border-muted/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Incident Packs</h2>
              <p className="text-sm text-muted-foreground">
                {selectedIncident ? "Viewing incident details" : "Select an incident to view"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!selectedIncident ? (
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Incidents</h3>
                  <p className="text-sm text-muted-foreground">
                    When safety incidents occur, they'll appear here as incident packs.
                  </p>
                </div>
              ) : (
                incidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => generateIncidentPack(incident)}
                    className="w-full flex items-start gap-4 rounded-xl border border-border bg-secondary/30 p-4 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{incident.type}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs border",
                          getStatusColor(incident.status)
                        )}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(incident.timestamp)}
                        </span>
                        {incident.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {incident.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedIncident(null);
                  setGeneratedSummary(null);
                }}
              >
                ← Back to incidents
              </Button>

              {/* Incident Header */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-foreground">{selectedIncident.type}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs border",
                    getStatusColor(selectedIncident.status)
                  )}>
                    {selectedIncident.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{selectedIncident.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(selectedIncident.timestamp)}
                  </span>
                  {selectedIncident.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedIncident.location}
                    </span>
                  )}
                </div>
              </div>

              {/* AI Generated Summary */}
              {isGenerating ? (
                <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center">
                  <Brain className="h-8 w-8 text-primary mx-auto mb-3 animate-pulse" />
                  <p className="text-sm text-muted-foreground">
                    Generating incident summary...
                  </p>
                </div>
              ) : generatedSummary && (
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-primary" />
                    <h4 className="font-medium text-foreground">AI-Generated Summary</h4>
                  </div>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                    {generatedSummary}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download Pack
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share with Contacts
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
