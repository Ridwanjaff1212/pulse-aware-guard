import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, Shield, User, Lock, Smartphone, Moon,
  Volume2, Vibrate, MapPin, Eye, Clock, Save, Check, BellRing
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSupported, permission, requestPermission } = usePushNotifications();

  const [settings, setSettings] = useState({
    fullName: "",
    phone: "",
    emergencyKeyword: "Help me now",
    locationSharing: true,
    communityAlerts: true,
    autonomousMode: false,
    voiceDetection: true,
    motionDetection: true,
    stealthMode: false,
    vibrationAlerts: true,
    soundAlerts: true,
    autoRecording: false,
    checkInReminders: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setSettings((prev) => ({
        ...prev,
        fullName: data.full_name || "",
        phone: data.phone || "",
        emergencyKeyword: data.emergency_keyword || "Help me now",
        locationSharing: data.location_sharing_enabled ?? true,
        communityAlerts: data.community_alerts_enabled ?? true,
      }));
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: settings.fullName,
          phone: settings.phone,
          emergency_keyword: settings.emergencyKeyword,
          location_sharing_enabled: settings.locationSharing,
          community_alerts_enabled: settings.communityAlerts,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user!.id);

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
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
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <h1 className="font-semibold text-foreground">Settings</h1>
          <Button onClick={saveSettings} disabled={isSaving} size="sm">
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Profile Section */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">Your personal information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={settings.fullName}
                onChange={(e) => setSettings((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter your full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="keyword">Emergency Keyword</Label>
              <Input
                id="keyword"
                value={settings.emergencyKeyword}
                onChange={(e) => setSettings((prev) => ({ ...prev, emergencyKeyword: e.target.value }))}
                placeholder="Your emergency phrase"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This phrase will trigger emergency mode when spoken
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Alert preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <BellRing className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {permission === "granted" ? "Enabled" : "Not enabled"}
                  </p>
                </div>
              </div>
              {permission === "granted" ? (
                <div className="flex items-center gap-2 text-safe">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Active</span>
                </div>
              ) : (
                <Button onClick={requestPermission} size="sm" variant="outline" disabled={!isSupported}>
                  Enable
                </Button>
              )}
            </div>

            <SettingToggle
              icon={Volume2}
              title="Sound Alerts"
              description="Play sound on alerts"
              checked={settings.soundAlerts}
              onChange={(checked) => setSettings((prev) => ({ ...prev, soundAlerts: checked }))}
            />
            <SettingToggle
              icon={Vibrate}
              title="Vibration Alerts"
              description="Vibrate on emergencies"
              checked={settings.vibrationAlerts}
              onChange={(checked) => setSettings((prev) => ({ ...prev, vibrationAlerts: checked }))}
            />
            <SettingToggle
              icon={Clock}
              title="Check-in Reminders"
              description="Periodic safety check-ins"
              checked={settings.checkInReminders}
              onChange={(checked) => setSettings((prev) => ({ ...prev, checkInReminders: checked }))}
            />
          </div>
        </div>

        {/* Safety Features Section */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-safe/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-safe" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Safety Features</h2>
              <p className="text-sm text-muted-foreground">Protection settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <SettingToggle
              icon={Shield}
              title="Autonomous Mode"
              description="AI takes action automatically"
              checked={settings.autonomousMode}
              onChange={(checked) => setSettings((prev) => ({ ...prev, autonomousMode: checked }))}
              highlight
            />
            <SettingToggle
              icon={MapPin}
              title="Location Sharing"
              description="Share location with contacts"
              checked={settings.locationSharing}
              onChange={(checked) => setSettings((prev) => ({ ...prev, locationSharing: checked }))}
            />
            <SettingToggle
              icon={Volume2}
              title="Voice Detection"
              description="Listen for emergency keywords"
              checked={settings.voiceDetection}
              onChange={(checked) => setSettings((prev) => ({ ...prev, voiceDetection: checked }))}
            />
            <SettingToggle
              icon={Smartphone}
              title="Motion Detection"
              description="Detect falls and impacts"
              checked={settings.motionDetection}
              onChange={(checked) => setSettings((prev) => ({ ...prev, motionDetection: checked }))}
            />
          </div>
        </div>

        {/* Privacy Section */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Privacy</h2>
              <p className="text-sm text-muted-foreground">Stealth and privacy settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <SettingToggle
              icon={Eye}
              title="Stealth Mode"
              description="Hide app and use decoy"
              checked={settings.stealthMode}
              onChange={(checked) => setSettings((prev) => ({ ...prev, stealthMode: checked }))}
            />
            <SettingToggle
              icon={Smartphone}
              title="Auto Recording"
              description="Record during emergencies"
              checked={settings.autoRecording}
              onChange={(checked) => setSettings((prev) => ({ ...prev, autoRecording: checked }))}
            />
          </div>
        </div>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </main>
    </div>
  );
}

interface SettingToggleProps {
  icon: any;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlight?: boolean;
}

function SettingToggle({ icon: Icon, title, description, checked, onChange, highlight }: SettingToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-xl transition-colors",
        highlight && checked ? "bg-safe/10 border border-safe/30" : "bg-secondary/30"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", highlight && checked ? "text-safe" : "text-muted-foreground")} />
        <div>
          <p className="font-medium text-foreground text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
