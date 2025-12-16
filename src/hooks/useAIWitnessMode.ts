import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

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

interface WitnessState {
  isActive: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  evidence: WitnessEvidence[];
  currentTranscript: string;
  threatAnalysis: ThreatAnalysis | null;
  activatedAt: Date | null;
  recordingDuration: number;
}

export function useAIWitnessMode(userId: string | undefined) {
  const [state, setState] = useState<WitnessState>({
    isActive: false,
    isRecording: false,
    isTranscribing: false,
    evidence: [],
    currentTranscript: '',
    threatAnalysis: null,
    activatedAt: null,
    recordingDuration: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const addEvidence = useCallback((evidence: Omit<WitnessEvidence, 'id' | 'timestamp'>) => {
    const newEvidence: WitnessEvidence = {
      ...evidence,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setState(prev => ({
      ...prev,
      evidence: [...prev.evidence, newEvidence],
    }));
    return newEvidence;
  }, []);

  const analyzeTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    try {
      const { data, error } = await supabase.functions.invoke('ai-witness-analyze', {
        body: { type: 'threat_detection', data: { transcript } }
      });

      if (error) throw error;

      if (data?.analysis) {
        setState(prev => ({
          ...prev,
          threatAnalysis: data.analysis as ThreatAnalysis,
        }));

        // Add analysis as evidence
        addEvidence({
          type: 'analysis',
          data: JSON.stringify(data.analysis),
          metadata: { analysisType: 'threat_detection' }
        });

        // Alert on high threat
        if (data.analysis.threatLevel === 'high' || data.analysis.threatLevel === 'imminent') {
          toast({
            title: "⚠️ High Threat Detected",
            description: data.analysis.immediateAction || "Stay alert and seek safety",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Transcript analysis error:', error);
    }
  }, [addEvidence]);

  const startTranscription = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let fullTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript += transcript + ' ';
          
          // Add transcript as evidence
          addEvidence({
            type: 'transcript',
            data: transcript,
            metadata: { confidence: event.results[i][0].confidence }
          });
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        currentTranscript: fullTranscript + interimTranscript,
        isTranscribing: true,
      }));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        // Try to restart
        setTimeout(() => {
          if (state.isActive) {
            recognition.start();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Restart if still active
      if (state.isActive) {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Periodic threat analysis
    transcriptIntervalRef.current = setInterval(() => {
      if (fullTranscript.trim()) {
        analyzeTranscript(fullTranscript);
      }
    }, 15000); // Analyze every 15 seconds

  }, [state.isActive, addEvidence, analyzeTranscript]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          addEvidence({
            type: 'video',
            data: reader.result as string,
            metadata: { 
              duration: state.recordingDuration,
              size: blob.size 
            }
          });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(5000); // Chunk every 5 seconds
      mediaRecorderRef.current = mediaRecorder;

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 1,
        }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true }));

    } catch (error) {
      console.error('Recording error:', error);
      // Fallback to audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = audioStream;
        
        const audioRecorder = new MediaRecorder(audioStream);
        audioRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        
        audioRecorder.start(5000);
        mediaRecorderRef.current = audioRecorder;
        setState(prev => ({ ...prev, isRecording: true }));
      } catch (audioError) {
        console.error('Audio recording error:', audioError);
      }
    }
  }, [addEvidence, state.recordingDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (transcriptIntervalRef.current) {
      clearInterval(transcriptIntervalRef.current);
      transcriptIntervalRef.current = null;
    }

    setState(prev => ({ ...prev, isTranscribing: false }));
  }, []);

  const activate = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({
      ...prev,
      isActive: true,
      activatedAt: new Date(),
      evidence: [],
      currentTranscript: '',
      threatAnalysis: null,
      recordingDuration: 0,
    }));

    toast({
      title: "🔴 AI Witness Mode Active",
      description: "Silent recording and threat analysis started",
    });

    // Start all monitoring
    await startRecording();
    startTranscription();

  }, [userId, startRecording, startTranscription]);

  const deactivate = useCallback(async () => {
    stopRecording();
    stopTranscription();

    // Final analysis
    if (state.currentTranscript) {
      await analyzeTranscript(state.currentTranscript);
    }

    setState(prev => ({
      ...prev,
      isActive: false,
    }));

    toast({
      title: "AI Witness Mode Stopped",
      description: `Collected ${state.evidence.length} pieces of evidence`,
    });

  }, [stopRecording, stopTranscription, state.currentTranscript, state.evidence.length, analyzeTranscript]);

  const generateIncidentReport = useCallback(async () => {
    if (state.evidence.length === 0) return null;

    try {
      const { data, error } = await supabase.functions.invoke('ai-witness-analyze', {
        body: {
          type: 'generate_summary',
          data: {
            evidence: state.evidence,
            transcript: state.currentTranscript,
            threatAnalysis: state.threatAnalysis,
            duration: state.recordingDuration,
            activatedAt: state.activatedAt,
          }
        }
      });

      if (error) throw error;
      return data?.analysis?.raw || data?.analysis;

    } catch (error) {
      console.error('Report generation error:', error);
      return null;
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      stopTranscription();
    };
  }, [stopRecording, stopTranscription]);

  return {
    ...state,
    activate,
    deactivate,
    generateIncidentReport,
    addEvidence,
  };
}
