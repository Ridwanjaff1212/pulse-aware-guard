-- Create push subscriptions table for storing web push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Create contact push subscriptions (for emergency contacts who install the app)
CREATE TABLE public.contact_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS - allow inserts from anyone (contacts registering)
ALTER TABLE public.contact_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact subscription"
ON public.contact_push_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view subscriptions for their contacts"
ON public.contact_push_subscriptions FOR SELECT
USING (
  contact_email IN (
    SELECT email FROM emergency_contacts WHERE user_id = auth.uid() AND email IS NOT NULL
  )
);

-- Create community alert subscriptions (for nearby alerts)
CREATE TABLE public.community_alert_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 5000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_alert_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert zones"
ON public.community_alert_zones FOR ALL
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();