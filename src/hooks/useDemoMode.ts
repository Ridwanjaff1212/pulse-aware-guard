import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  events: DemoEvent[];
}

export interface DemoEvent {
  timestamp: number; // seconds from start
  type: 'danger_score' | 'keyword_detected' | 'scream_detected' | 'motion_detected' | 
        'location_deviation' | 'coercion_detected' | 'vision_alert' | 'community_alert';
  data: any;
  narration: string;
}

export interface DemoState {
  isActive: boolean;
  isPaused: boolean;
  currentScenario: DemoScenario | null;
  elapsedTime: number;
  currentEvent: DemoEvent | null;
  dangerScore: number;
  signals: any[];
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'walking_home_late',
    name: 'Walking Home Late',
    description: 'Simulates a user walking home late at night with increasing danger signals',
    duration: 60,
    events: [
      { timestamp: 5, type: 'location_deviation', data: { deviation: 50 }, narration: 'User deviates from normal route' },
      { timestamp: 10, type: 'danger_score', data: { score: 25 }, narration: 'Situational Intelligence detects unusual pattern' },
      { timestamp: 15, type: 'motion_detected', data: { type: 'fast_walking' }, narration: 'Motion sensor detects rapid movement' },
      { timestamp: 20, type: 'danger_score', data: { score: 45 }, narration: 'Pre-danger state: ARMED' },
      { timestamp: 25, type: 'vision_alert', data: { object: 'person_following' }, narration: 'AI Vision detects person following' },
      { timestamp: 30, type: 'danger_score', data: { score: 65 }, narration: 'Danger confidence increasing' },
      { timestamp: 35, type: 'keyword_detected', data: { keyword: 'help', confidence: 0.85 }, narration: 'Emergency keyword detected!' },
      { timestamp: 40, type: 'danger_score', data: { score: 85 }, narration: 'Critical danger threshold reached' },
      { timestamp: 45, type: 'community_alert', data: { responders: 3 }, narration: 'Community Shield activated - 3 nearby users notified' },
      { timestamp: 50, type: 'danger_score', data: { score: 100 }, narration: 'Emergency protocols activated automatically' },
    ]
  },
  {
    id: 'coerced_interaction',
    name: 'Coerced Phone Access',
    description: 'Demonstrates anti-coercion detection when attacker forces phone unlock',
    duration: 45,
    events: [
      { timestamp: 5, type: 'coercion_detected', data: { type: 'forced_unlock' }, narration: 'Unusual unlock pattern detected' },
      { timestamp: 10, type: 'coercion_detected', data: { type: 'shaking_hands' }, narration: 'Touch pressure indicates stress' },
      { timestamp: 15, type: 'danger_score', data: { score: 40 }, narration: 'ACIS detecting potential coercion' },
      { timestamp: 20, type: 'coercion_detected', data: { type: 'erratic_navigation' }, narration: 'Erratic app navigation pattern' },
      { timestamp: 25, type: 'danger_score', data: { score: 70 }, narration: 'High coercion probability' },
      { timestamp: 30, type: 'danger_score', data: { score: 90 }, narration: 'Decoy mode activated - appears shutdown' },
      { timestamp: 35, type: 'community_alert', data: { silent: true }, narration: 'Silent escalation - contacts notified' },
    ]
  },
  {
    id: 'vision_assist_demo',
    name: 'AI Vision Assist Demo',
    description: 'Showcases the AI Vision Assist module for low-vision users',
    duration: 40,
    events: [
      { timestamp: 5, type: 'vision_alert', data: { object: 'stairs_ahead', distance: '3m' }, narration: 'Stairs detected 3 meters ahead' },
      { timestamp: 10, type: 'vision_alert', data: { object: 'person_left', distance: '2m' }, narration: 'Person approaching from left' },
      { timestamp: 15, type: 'vision_alert', data: { object: 'obstacle_ground' }, narration: 'Ground obstacle detected - possible tripping hazard' },
      { timestamp: 20, type: 'vision_alert', data: { object: 'exit_door', distance: '5m' }, narration: 'Exit door detected ahead' },
      { timestamp: 25, type: 'danger_score', data: { score: 50 }, narration: 'Emergency mode - Vision Assist prioritizing threats' },
      { timestamp: 30, type: 'vision_alert', data: { object: 'clear_path_right' }, narration: 'Clear path to the right. Move now.' },
      { timestamp: 35, type: 'vision_alert', data: { object: 'safe_zone_reached' }, narration: 'Safe zone reached. Area secure.' },
    ]
  },
  {
    id: 'scream_detection',
    name: 'Voice Distress Detection',
    description: 'Shows scream and voice stress detection capabilities',
    duration: 35,
    events: [
      { timestamp: 5, type: 'danger_score', data: { score: 10 }, narration: 'Ambient audio monitoring active' },
      { timestamp: 10, type: 'motion_detected', data: { type: 'sudden_stop' }, narration: 'Sudden movement stop detected' },
      { timestamp: 15, type: 'scream_detected', data: { confidence: 0.75 }, narration: 'Voice stress detected - elevated pitch' },
      { timestamp: 20, type: 'danger_score', data: { score: 55 }, narration: 'AI analyzing voice patterns' },
      { timestamp: 25, type: 'scream_detected', data: { confidence: 0.95 }, narration: 'Scream detected! High confidence' },
      { timestamp: 30, type: 'danger_score', data: { score: 100 }, narration: 'Emergency triggered automatically' },
    ]
  }
];

export function useDemoMode() {
  const { toast } = useToast();
  const [state, setState] = useState<DemoState>({
    isActive: false,
    isPaused: false,
    currentScenario: null,
    elapsedTime: 0,
    currentEvent: null,
    dangerScore: 0,
    signals: [],
  });

  const [eventCallbacks, setEventCallbacks] = useState<{
    onDangerScore?: (score: number) => void;
    onSignal?: (signal: any) => void;
    onEvent?: (event: DemoEvent) => void;
  }>({});

  const startDemo = useCallback((scenarioId: string, callbacks?: typeof eventCallbacks) => {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    if (callbacks) setEventCallbacks(callbacks);

    setState({
      isActive: true,
      isPaused: false,
      currentScenario: scenario,
      elapsedTime: 0,
      currentEvent: null,
      dangerScore: 0,
      signals: [],
    });

    toast({
      title: '🎬 Demo Mode Started',
      description: `Running: ${scenario.name}`,
    });
  }, [toast]);

  const stopDemo = useCallback(() => {
    setState({
      isActive: false,
      isPaused: false,
      currentScenario: null,
      elapsedTime: 0,
      currentEvent: null,
      dangerScore: 0,
      signals: [],
    });
    setEventCallbacks({});

    toast({
      title: 'Demo Stopped',
      description: 'Returning to normal mode',
    });
  }, [toast]);

  const pauseDemo = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeDemo = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const skipToEvent = useCallback((eventIndex: number) => {
    if (!state.currentScenario) return;
    const event = state.currentScenario.events[eventIndex];
    if (!event) return;
    setState(prev => ({ ...prev, elapsedTime: event.timestamp }));
  }, [state.currentScenario]);

  // Demo timer and event processor
  useEffect(() => {
    if (!state.isActive || state.isPaused || !state.currentScenario) return;

    const interval = setInterval(() => {
      setState(prev => {
        const newTime = prev.elapsedTime + 1;
        
        // Check for events at this timestamp
        const event = prev.currentScenario?.events.find(e => e.timestamp === newTime);
        
        if (event) {
          // Process event
          let newScore = prev.dangerScore;
          if (event.type === 'danger_score') {
            newScore = event.data.score;
            eventCallbacks.onDangerScore?.(newScore);
          }
          
          eventCallbacks.onEvent?.(event);
          
          // Speak narration
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(event.narration);
            utterance.rate = 1.1;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
          }

          return {
            ...prev,
            elapsedTime: newTime,
            currentEvent: event,
            dangerScore: newScore,
            signals: [...prev.signals, event],
          };
        }

        // Check if demo is complete
        if (newTime >= (prev.currentScenario?.duration || 0)) {
          toast({
            title: '✅ Demo Complete',
            description: `Finished: ${prev.currentScenario?.name}`,
          });
          return {
            ...prev,
            isActive: false,
            elapsedTime: newTime,
          };
        }

        return { ...prev, elapsedTime: newTime };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isActive, state.isPaused, state.currentScenario, eventCallbacks, toast]);

  return {
    state,
    scenarios: DEMO_SCENARIOS,
    startDemo,
    stopDemo,
    pauseDemo,
    resumeDemo,
    skipToEvent,
  };
}
