-- Add email field to emergency_contacts
ALTER TABLE public.emergency_contacts ADD COLUMN email text;

-- Create incident_locks table for Truth Lock feature
CREATE TABLE public.incident_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  incident_id UUID REFERENCES public.safety_incidents(id) ON DELETE CASCADE,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unlock_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_release_hours INTEGER NOT NULL DEFAULT 24,
  is_released BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMP WITH TIME ZONE,
  evidence_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_locks ENABLE ROW LEVEL SECURITY;

-- RLS policies for incident_locks
CREATE POLICY "Users can view own incident locks" 
ON public.incident_locks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incident locks" 
ON public.incident_locks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incident locks" 
ON public.incident_locks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create voice_profiles table for storing voiceprint data
CREATE TABLE public.voice_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  keyword TEXT NOT NULL,
  samples_count INTEGER NOT NULL DEFAULT 0,
  mfcc_average JSONB,
  pitch_average REAL,
  energy_average REAL,
  is_trained BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_profiles
CREATE POLICY "Users can view own voice profile" 
ON public.voice_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice profile" 
ON public.voice_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profile" 
ON public.voice_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_voice_profiles_updated_at
BEFORE UPDATE ON public.voice_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();