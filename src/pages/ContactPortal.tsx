import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Shield, AlertTriangle, MapPin, Clock, Bell, 
  Phone, Mail, Check, X, RefreshCw, ChevronRight,
  Navigation, Activity, Lock, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Alert {
  id: string;
  created_at: string;
  status: string;
  message: string | null;
  latitude: number;
  longitude: number;
  incident_id: string | null;
  user_name?: string;
}

interface IncidentDetail {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  ai_risk_score: number | null;
}

export default function ContactPortalPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for email in URL params
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const verifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsVerifying(true);

    try {
      // Check if this email is registered as an emergency contact
      const { data: contactData, error } = await supabase
        .from("emergency_contacts")
        .select("id, name, user_id")
        .eq("email", email.toLowerCase())
        .limit(1);

      if (error) throw error;

      if (!contactData || contactData.length === 0) {
        toast({
          title: "Not Found",
          description: "This email is not registered as an emergency contact.",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      setIsVerified(true);
      
      // Load alerts for this contact
      await loadAlerts(email.toLowerCase());

      toast({
        title: "Access Granted",
        description: "You can now view emergency alerts from your contacts.",
      });
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const loadAlerts = async (contactEmail: string) => {
    setIsLoading(true);
    
    try {
      // Get all user IDs where this email is an emergency contact
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("user_id, name")
        .eq("email", contactEmail);

      if (!contacts || contacts.length === 0) {
        setAlerts([]);
        return;
      }

      const userIds = contacts.map(c => c.user_id);

      // Get alerts from these users
      const { data: alertsData, error } = await supabase
        .from("emergency_alerts")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles for names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const alertsWithNames = (alertsData || []).map(alert => ({
        ...alert,
        user_name: profiles?.find(p => p.user_id === alert.user_id)?.full_name || "Your Contact",
      }));

      setAlerts(alertsWithNames);
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast({
        title: "Error Loading Alerts",
        description: "Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadIncidentDetails = async (incidentId: string) => {
    try {
      const { data, error } = await supabase
        .from("safety_incidents")
        .select("*")
        .eq("id", incidentId)
        .single();

      if (error) throw error;
      setSelectedIncident(data);
    } catch (error) {
      console.error("Error loading incident:", error);
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-destructive text-destructive-foreground";
      case "resolved": return "bg-safe text-safe-foreground";
      default: return "bg-warning text-warning-foreground";
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background px-6 pt-12 pb-8">
          <div className="max-w-md mx-auto text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">Emergency Contact Portal</h1>
            <p className="text-muted-foreground">
              View real-time alerts and locations from people who've added you as their emergency contact
            </p>
          </div>
        </div>

        {/* Verification Form */}
        <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
          <form onSubmit={verifyEmail} className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="font-semibold text-foreground">Verify Your Email</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the email registered as an emergency contact
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isVerifying || !email}>
                {isVerifying ? (
                  <span className="animate-pulse">Verifying...</span>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Access Portal
                  </>
                )}
              </Button>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <FeatureItem 
                icon={Bell} 
                title="Real-time Alerts" 
                description="See emergency alerts as they happen"
              />
              <FeatureItem 
                icon={MapPin} 
                title="Live Location" 
                description="Track your contact's location during emergencies"
              />
              <FeatureItem 
                icon={Activity} 
                title="Incident Details" 
                description="View AI risk scores and incident status"
              />
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Not registered yet?{" "}
              <button 
                onClick={() => navigate("/contact-register")}
                className="text-primary font-medium hover:underline"
              >
                Sign up for alerts
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Emergency Portal</h1>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadAlerts(email.toLowerCase())}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Active Alert Banner */}
        {alerts.some(a => a.status === "active") && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 animate-pulse-danger">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-bold text-destructive">Active Emergency!</p>
                <p className="text-sm text-muted-foreground">
                  Someone needs your help right now
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Emergency Alerts</h2>
          
          {alerts.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-border bg-card">
              <Check className="h-12 w-12 text-safe mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">All Clear</h3>
              <p className="text-sm text-muted-foreground">
                No emergency alerts from your contacts
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={cn(
                  "rounded-2xl border p-4 transition-all hover:shadow-md",
                  alert.status === "active" 
                    ? "border-destructive/50 bg-destructive/5" 
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      alert.status === "active" ? "bg-destructive/20" : "bg-secondary"
                    )}>
                      <AlertTriangle className={cn(
                        "h-5 w-5",
                        alert.status === "active" ? "text-destructive animate-pulse" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{alert.user_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(alert.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium uppercase",
                    getStatusColor(alert.status)
                  )}>
                    {alert.status}
                  </span>
                </div>

                {alert.message && (
                  <p className="text-sm text-foreground mb-3 p-3 rounded-xl bg-secondary/50">
                    {alert.message}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    onClick={() => openInMaps(alert.latitude, alert.longitude)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    View Location
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openInMaps(alert.latitude, alert.longitude)}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Get Directions
                  </Button>
                  {alert.incident_id && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => loadIncidentDetails(alert.incident_id!)}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Incident Details Modal */}
        {selectedIncident && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
            <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Incident Details</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedIncident(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium text-foreground capitalize">
                    {selectedIncident.type.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{selectedIncident.description}</p>
                </div>
                {selectedIncident.ai_risk_score && (
                  <div>
                    <p className="text-xs text-muted-foreground">AI Risk Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            selectedIncident.ai_risk_score > 75 ? "bg-destructive" :
                            selectedIncident.ai_risk_score > 50 ? "bg-warning" : "bg-safe"
                          )}
                          style={{ width: `${selectedIncident.ai_risk_score}%` }}
                        />
                      </div>
                      <span className="font-bold text-foreground">{selectedIncident.ai_risk_score}%</span>
                    </div>
                  </div>
                )}
                {selectedIncident.location_address && (
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm text-foreground">{selectedIncident.location_address}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1" onClick={() => {
                  if (selectedIncident.location_lat && selectedIncident.location_lng) {
                    openInMaps(selectedIncident.location_lat, selectedIncident.location_lng);
                  }
                }}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Open in Maps
                </Button>
                <Button variant="outline" onClick={() => setSelectedIncident(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <h3 className="font-semibold text-foreground mb-3">What to do during an emergency?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-primary mt-0.5" />
              Try calling your contact first
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-primary mt-0.5" />
              If no response, try other emergency contacts
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              Call emergency services (911) if situation is critical
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5" />
              Use the location to find them or send help
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
      <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
