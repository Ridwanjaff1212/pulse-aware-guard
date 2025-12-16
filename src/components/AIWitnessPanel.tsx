import { Eye, EyeOff, Radio, FileText, AlertTriangle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface WitnessEvidence {
  id: string;
  type: 'audio' | 'video' | 'transcript' | 'analysis';
  timestamp: Date;
  data: string;
  metadata?: Record<string, unknown>;
}

interface ThreatAnalysis {
  threatLevel: 'none' | 'low' | 'moderate' | 'high' | 'imminent';
  threats: string[];
  confidence: number;
  immediateAction: string;
}

interface AIWitnessPanelProps {
  isActive: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  evidence: WitnessEvidence[];
  currentTranscript: string;
  threatAnalysis: ThreatAnalysis | null;
  recordingDuration: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onGenerateReport: () => Promise<string | null>;
}

export function AIWitnessPanel({
  isActive,
  isRecording,
  isTranscribing,
  evidence,
  currentTranscript,
  threatAnalysis,
  recordingDuration,
  onActivate,
  onDeactivate,
  onGenerateReport,
}: AIWitnessPanelProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'imminent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const handleDownloadReport = async () => {
    const report = await onGenerateReport();
    if (report) {
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-report-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className={`border-2 ${isActive ? 'border-red-500 bg-red-500/5' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className={`h-5 w-5 ${isActive ? 'text-red-500 animate-pulse' : ''}`} />
            AI Witness Mode
          </CardTitle>
          {isActive && (
            <Badge variant="destructive" className="animate-pulse">
              <Radio className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Control Button */}
        <Button
          onClick={isActive ? onDeactivate : onActivate}
          variant={isActive ? "destructive" : "default"}
          className="w-full"
        >
          {isActive ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Stop Witness Mode
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Activate Witness Mode
            </>
          )}
        </Button>

        {isActive && (
          <>
            {/* Status Indicators */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className={`p-2 rounded ${isRecording ? 'bg-red-500/20 text-red-500' : 'bg-muted'}`}>
                <div className="font-semibold">{formatDuration(recordingDuration)}</div>
                <div className="text-xs opacity-70">Recording</div>
              </div>
              <div className={`p-2 rounded ${isTranscribing ? 'bg-blue-500/20 text-blue-500' : 'bg-muted'}`}>
                <div className="font-semibold">{evidence.filter(e => e.type === 'transcript').length}</div>
                <div className="text-xs opacity-70">Transcripts</div>
              </div>
              <div className="p-2 rounded bg-muted">
                <div className="font-semibold">{evidence.length}</div>
                <div className="text-xs opacity-70">Evidence</div>
              </div>
            </div>

            {/* Threat Analysis */}
            {threatAnalysis && (
              <div className={`p-3 rounded-lg ${getThreatColor(threatAnalysis.threatLevel)}/20 border border-${getThreatColor(threatAnalysis.threatLevel).replace('bg-', '')}/50`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold capitalize">
                    {threatAnalysis.threatLevel} Threat
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {threatAnalysis.confidence}% confidence
                  </Badge>
                </div>
                {threatAnalysis.immediateAction && (
                  <p className="text-sm opacity-80">{threatAnalysis.immediateAction}</p>
                )}
                {threatAnalysis.threats.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {threatAnalysis.threats.map((threat, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {threat}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Live Transcript */}
            {currentTranscript && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Live Transcript
                </div>
                <ScrollArea className="h-24 rounded border p-2 bg-muted/50">
                  <p className="text-sm">{currentTranscript}</p>
                </ScrollArea>
              </div>
            )}

            {/* Generate Report */}
            {evidence.length > 0 && (
              <Button
                onClick={handleDownloadReport}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Incident Report
              </Button>
            )}
          </>
        )}

        {/* Auto-activation notice */}
        {!isActive && (
          <p className="text-xs text-muted-foreground text-center">
            Auto-activates when danger confidence exceeds 80%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
