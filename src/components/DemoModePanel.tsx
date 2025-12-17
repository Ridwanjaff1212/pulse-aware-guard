import { Play, Pause, Square, SkipForward, Film, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useDemoMode, DemoScenario } from "@/hooks/useDemoMode";

interface DemoModePanelProps {
  onDangerScoreChange?: (score: number) => void;
  onSignal?: (signal: any) => void;
}

export function DemoModePanel({ onDangerScoreChange, onSignal }: DemoModePanelProps) {
  const { state, scenarios, startDemo, stopDemo, pauseDemo, resumeDemo, skipToEvent } = useDemoMode();

  const handleStartScenario = (scenario: DemoScenario) => {
    startDemo(scenario.id, {
      onDangerScore: onDangerScoreChange,
      onSignal,
    });
  };

  if (state.isActive && state.currentScenario) {
    const progress = (state.elapsedTime / state.currentScenario.duration) * 100;
    
    return (
      <div className="rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              🎬 DEMO MODE ACTIVE
            </h3>
            <p className="text-sm text-muted-foreground">{state.currentScenario.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{state.dangerScore}%</p>
            <p className="text-xs text-muted-foreground">Danger Score</p>
          </div>
        </div>

        {/* Current Event */}
        {state.currentEvent && (
          <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/30 animate-shake">
            <p className="text-sm font-medium text-foreground">{state.currentEvent.narration}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Event: {state.currentEvent.type.replace(/_/g, ' ').toUpperCase()}
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{state.elapsedTime}s</span>
            <span>{state.currentScenario.duration}s</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {state.isPaused ? (
            <Button onClick={resumeDemo} size="sm" className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          ) : (
            <Button onClick={pauseDemo} size="sm" variant="outline" className="flex-1">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          <Button onClick={stopDemo} size="sm" variant="destructive">
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>

        {/* Event Timeline */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">TIMELINE</p>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {state.currentScenario.events.map((event, idx) => (
              <button
                key={idx}
                onClick={() => skipToEvent(idx)}
                className={cn(
                  "flex-shrink-0 h-8 w-8 rounded-lg text-xs font-medium transition-all",
                  state.elapsedTime >= event.timestamp
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {event.timestamp}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-background p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Film className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Demo Mode</h3>
          <p className="text-sm text-muted-foreground">Showcase features without real emergencies</p>
        </div>
      </div>

      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => handleStartScenario(scenario)}
            className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {scenario.name}
              </h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {scenario.duration}s
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{scenario.description}</p>
            <div className="flex items-center gap-1 mt-2">
              <Zap className="h-3 w-3 text-warning" />
              <span className="text-xs text-warning">{scenario.events.length} events</span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Perfect for hackathon presentations! 🎉
      </p>
    </div>
  );
}
