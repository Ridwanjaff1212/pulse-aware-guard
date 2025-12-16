-- Fix security issue: Remove overly permissive SELECT policy on emergency_alerts
DROP POLICY IF EXISTS "Users can view active nearby alerts within radius" ON public.emergency_alerts;

-- Add DELETE policies for data privacy compliance

-- Allow users to delete their own profiles
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own location history
CREATE POLICY "Users can delete own location history"
ON public.location_history
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own incidents
CREATE POLICY "Users can delete own incidents"
ON public.safety_incidents
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own evidence (via incident ownership)
CREATE POLICY "Users can delete own evidence"
ON public.incident_evidence
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM safety_incidents
  WHERE safety_incidents.id = incident_evidence.incident_id
  AND safety_incidents.user_id = auth.uid()
));

-- Allow users to delete their own incident locks
CREATE POLICY "Users can delete own incident locks"
ON public.incident_locks
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own emergency alerts
CREATE POLICY "Users can delete own alerts"
ON public.emergency_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own voice profiles
CREATE POLICY "Users can delete own voice profile"
ON public.voice_profiles
FOR DELETE
USING (auth.uid() = user_id);