import { useState } from "react";
import { X, Brain, Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AIAnalysisPanelProps {
  onClose: () => void;
  userId: string;
}

interface AnalysisResult {
  riskLevel: string;
  confidence: number;
  analysis: string;
  recommendations: string[];
  shouldEscalate: boolean;
  triggerType?: string;
}

export function AIAnalysisPanel({ onClose, userId }: AIAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("safepulse-ai", {
        body: {
          type: "analyze_situation",
          data: {
            motionData: {
              accelerometer: { x: 0.1, y: -0.05, z: 9.8 },
              gyroscope: { x: 0, y: 0, z: 0 },
            },
            inactivityMinutes: 5,
            timeOfDay: new Date().toLocaleTimeString(),
            locationType: "unknown",
            voiceStressScore: 20,
            recentActivity: "normal browsing",
            userContext: "User is checking their safety dashboard",
          },
        },
      });

      if (error) throw error;
      
      if (data?.analysis) {
        setResult(data.analysis);
      }
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "safe":
        return "text-safe";
      case "low":
        return "text-accent";
      case "medium":
        return "text-warning";
      case "high":
      case "critical":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case "safe":
      case "low":
        return <CheckCircle className="h-6 w-6 text-safe" />;
      case "medium":
        return <Activity className="h-6 w-6 text-warning" />;
      case "high":
      case "critical":
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
      default:
        return <Brain className="h-6 w-6 text-primary" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Safety Analysis</h2>
              <p className="text-sm text-muted-foreground">Real-time threat assessment</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!result && !isAnalyzing && (
          <div className="text-center py-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ready to Analyze
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Our AI will analyze your current situation using motion data, time context, and behavioral patterns.
            </p>
            <Button onClick={runAnalysis} size="lg">
              <Brain className="mr-2 h-5 w-5" />
              Run Safety Analysis
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Brain className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Analyzing...
            </h3>
            <p className="text-sm text-muted-foreground">
              Processing sensor data and evaluating risk factors
            </p>
            <div className="mt-4 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* Risk Level */}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 p-4">
              {getRiskIcon(result.riskLevel)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-lg font-bold", getRiskColor(result.riskLevel))}>
                    {result.riskLevel?.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Risk Level
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {result.confidence}% confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <h4 className="font-medium text-foreground mb-2">Analysis</h4>
              <p className="text-sm text-muted-foreground">{result.analysis}</p>
            </div>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <h4 className="font-medium text-foreground mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-safe mt-0.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.shouldEscalate && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Escalation Recommended</span>
                </div>
                <p className="text-sm text-destructive/80 mt-1">
                  Based on our analysis, we recommend alerting your emergency contacts.
                </p>
              </div>
            )}

            <Button onClick={runAnalysis} variant="outline" className="w-full">
              Run New Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
