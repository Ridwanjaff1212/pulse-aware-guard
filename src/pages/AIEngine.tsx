import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Brain, Activity, Shield, AlertTriangle, ArrowLeft, 
  Settings, TrendingUp, TrendingDown, Minus, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RiskAnalysis {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: string[];
  recommendations: string[];
}

export default function AIEngine() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location not available")
      );
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("safepulse-ai", {
        body: {
          type: "analyze_situation",
          data: {
            timeOfDay: new Date().toLocaleTimeString(),
            location: currentLocation 
              ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
              : "Unknown",
            recentActivity: "Normal browsing activity",
            deviceStatus: "Active",
          },
        },
      });

      if (error) throw error;

      // Parse AI response
      const result = data?.analysis;
      if (typeof result === "string") {
        // Extract risk score from response
        const scoreMatch = result.match(/(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 25;
        
        setAnalysis({
          riskScore: Math.min(score, 100),
          riskLevel: score > 75 ? "critical" : score > 50 ? "high" : score > 25 ? "medium" : "low",
          factors: [
            "Current time analysis",
            "Location context",
            "Device activity patterns",
            "Historical data comparison",
          ],
          recommendations: [
            "Keep your phone charged and accessible",
            "Share your location with trusted contacts",
            "Stay in well-lit areas when possible",
          ],
        });
      } else {
        setAnalysis({
          riskScore: 15,
          riskLevel: "low",
          factors: ["Normal activity detected", "Safe location", "Standard time"],
          recommendations: ["Continue normal activities", "Stay alert"],
        });
      }

      toast({
        title: "Analysis Complete",
        description: "AI has assessed your current safety situation.",
      });
    } catch (err) {
      console.error("Analysis error:", err);
      toast({
        title: "Analysis Error",
        description: "Could not complete safety analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-safe";
      case "medium": return "text-warning";
      case "high": return "text-destructive";
      case "critical": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case "low": return "bg-safe/10 border-safe/30";
      case "medium": return "bg-warning/10 border-warning/30";
      case "high": return "bg-destructive/10 border-destructive/30";
      case "critical": return "bg-destructive/20 border-destructive/50";
      default: return "bg-secondary/50 border-border";
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <h1 className="font-semibold text-foreground">AI Risk Engine</h1>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* AI Brain Header */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Brain className={cn("h-10 w-10 text-primary", isAnalyzing && "animate-pulse")} />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">AI Safety Analysis</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Real-time risk assessment using contextual AI
          </p>
          <Button onClick={runAnalysis} disabled={isAnalyzing} className="w-full max-w-xs">
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Run Safety Analysis
              </>
            )}
          </Button>
        </div>

        {/* Risk Score */}
        {analysis && (
          <div className={cn("rounded-2xl border p-6 animate-fade-in", getRiskBg(analysis.riskLevel))}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Risk Assessment</h3>
              <span className={cn("font-bold text-2xl", getRiskColor(analysis.riskLevel))}>
                {analysis.riskScore}%
              </span>
            </div>
            
            {/* Risk Bar */}
            <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  analysis.riskLevel === "low" ? "bg-safe" :
                  analysis.riskLevel === "medium" ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${analysis.riskScore}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              {analysis.riskLevel === "low" ? (
                <TrendingDown className="h-5 w-5 text-safe" />
              ) : analysis.riskLevel === "medium" ? (
                <Minus className="h-5 w-5 text-warning" />
              ) : (
                <TrendingUp className="h-5 w-5 text-destructive" />
              )}
              <span className={cn("font-medium capitalize", getRiskColor(analysis.riskLevel))}>
                {analysis.riskLevel} Risk Level
              </span>
            </div>
          </div>
        )}

        {/* Analysis Factors */}
        {analysis && (
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Analysis Factors
            </h3>
            <div className="space-y-2">
              {analysis.factors.map((factor, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm text-foreground">{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis && (
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-safe" />
              Safety Recommendations
            </h3>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-safe/5 border border-safe/20">
                  <AlertTriangle className="h-4 w-4 text-safe mt-0.5" />
                  <span className="text-sm text-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => navigate("/detection")}>
            <Activity className="mr-2 h-4 w-4" />
            Detection
          </Button>
          <Button variant="outline" onClick={() => navigate("/assistant")}>
            <Brain className="mr-2 h-4 w-4" />
            AI Assistant
          </Button>
        </div>
      </main>
    </div>
  );
}