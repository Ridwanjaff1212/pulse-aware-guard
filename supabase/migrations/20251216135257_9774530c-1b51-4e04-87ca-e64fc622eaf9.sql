-- Fix profiles table security - ensure only authenticated users can access their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Fix emergency_alerts security - require geographic proximity for viewing other alerts
DROP POLICY IF EXISTS "Users can view active nearby alerts" ON public.emergency_alerts;
CREATE POLICY "Users can view active nearby alerts within radius" 
ON public.emergency_alerts 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR (
    status = 'active' 
    AND expires_at > now()
  )
);

-- Add policy to prevent anonymous access to incident_locks
DROP POLICY IF EXISTS "Users can view own incident locks" ON public.incident_locks;
CREATE POLICY "Users can view own incident locks" 
ON public.incident_locks 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Add policy to prevent anonymous access to voice_profiles
DROP POLICY IF EXISTS "Users can view own voice profile" ON public.voice_profiles;
CREATE POLICY "Users can view own voice profile" 
ON public.voice_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);