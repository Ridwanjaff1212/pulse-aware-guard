import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, User, Phone, Mic, MapPin, Users, Bell,
  ArrowRight, ArrowLeft, Check, ChevronRight,
  Heart, AlertTriangle, Clock, Eye, Fingerprint, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "welcome", title: "Welcome to SafePulse", icon: Shield, description: "Your AI-powered personal safety guardian" },
  { id: "name", title: "What's your name?", icon: User, description: "We'll use this to personalize your experience" },
  { id: "phone", title: "Your phone number", icon: Phone, description: "For emergency SMS alerts to your contacts" },
  { id: "keyword", title: "Choose your safety phrase", icon: Mic, description: "Say this phrase to trigger emergency mode" },
  { id: "location", title: "Enable location sharing", icon: MapPin, description: "Share your location during emergencies" },
  { id: "contacts", title: "Add emergency contacts", icon: Users, description: "People who'll be alerted in emergencies" },
  { id: "sensitivity", title: "Detection sensitivity", icon: AlertTriangle, description: "How sensitive should the AI be?" },
  { id: "notifications", title: "Set up notifications", icon: Bell, description: "How you want to be notified" },
  { id: "privacy", title: "Privacy preferences", icon: Eye, description: "Control your data and privacy" },
  { id: "complete", title: "You're all set!", icon: Heart, description: "Your safety guardian is ready" },
];

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    emergencyKeyword: "Help me now",
    locationEnabled: false,
    contacts: [] as { name: string; phone: string; relationship: string }[],
    sensitivity: "balanced",
    notificationsEnabled: true,
    communityAlerts: true,
    stealthMode: false,
  });
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await supabase.from("profiles").upsert({
        user_id: user!.id,
        full_name: formData.fullName,
        phone: formData.phone,
        emergency_keyword: formData.emergencyKeyword,
        location_sharing_enabled: formData.locationEnabled,
        keyword_enabled: true,
        community_alerts_enabled: formData.communityAlerts,
      });

      if (formData.contacts.length > 0) {
        await supabase.from("emergency_contacts").insert(
          formData.contacts.map((c, i) => ({
            user_id: user!.id,
            name: c.name,
            phone: c.phone,
            relationship: c.relationship,
            is_primary: i === 0,
          }))
        );
      }

      toast({
        title: "Setup Complete!",
        description: "Your SafePulse guardian is now active.",
      });
      navigate("/");
    } catch (err) {
      console.error("Onboarding error:", err);
      toast({
        title: "Setup Error",
        description: "There was an issue saving your preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addContact = () => {
    if (newContact.name && newContact.phone) {
      setFormData({
        ...formData,
        contacts: [...formData.contacts, { ...newContact }],
      });
      setNewContact({ name: "", phone: "", relationship: "" });
    }
  };

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setFormData({ ...formData, locationEnabled: true });
          toast({ title: "Location Enabled" });
        },
        () => {
          toast({ title: "Location Denied", variant: "destructive" });
        }
      );
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  const renderStepContent = () => {
    switch (step.id) {
      case "welcome":
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="flex justify-center gap-4">
                {[Mic, MapPin, Bell, Shield].map((Icon, i) => (
                  <div key={i} className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground">
                Let's set up your personal safety guardian in just a few steps.
              </p>
            </div>
          </div>
        );

      case "name":
        return (
          <Input
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="text-center text-lg py-6 bg-secondary/50"
          />
        );

      case "phone":
        return (
          <Input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="text-center text-lg py-6 bg-secondary/50"
          />
        );

      case "keyword":
        return (
          <div className="space-y-4">
            <Input
              placeholder="e.g., Help me now"
              value={formData.emergencyKeyword}
              onChange={(e) => setFormData({ ...formData, emergencyKeyword: e.target.value })}
              className="text-center text-lg py-6 bg-secondary/50"
            />
            <div className="flex flex-wrap gap-2 justify-center">
              {["Help me now", "Call for help", "I need help", "Emergency", "Code Red"].map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => setFormData({ ...formData, emergencyKeyword: phrase })}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors",
                    formData.emergencyKeyword === phrase
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary"
                  )}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        );

      case "location":
        return (
          <button
            onClick={requestLocationPermission}
            className={cn(
              "w-full p-6 rounded-xl border-2 transition-all text-left",
              formData.locationEnabled
                ? "border-safe bg-safe/10"
                : "border-border bg-secondary/30 hover:border-primary"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                formData.locationEnabled ? "bg-safe/20" : "bg-primary/10"
              )}>
                {formData.locationEnabled ? (
                  <Check className="h-6 w-6 text-safe" />
                ) : (
                  <MapPin className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {formData.locationEnabled ? "Location Enabled" : "Enable Location"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formData.locationEnabled
                    ? "Your location will be shared during emergencies"
                    : "Tap to enable location sharing"}
                </p>
              </div>
            </div>
          </button>
        );

      case "contacts":
        return (
          <div className="space-y-4">
            {formData.contacts.length > 0 && (
              <div className="space-y-2">
                {formData.contacts.map((contact, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                      {contact.relationship || "Contact"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/30">
              <Input
                placeholder="Contact name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="bg-background"
              />
              <Input
                type="tel"
                placeholder="Phone number"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="bg-background"
              />
              <Input
                placeholder="Relationship (e.g., Parent, Friend)"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                className="bg-background"
              />
              <Button
                onClick={addContact}
                variant="outline"
                className="w-full"
                disabled={!newContact.name || !newContact.phone}
              >
                Add Contact
              </Button>
            </div>
          </div>
        );

      case "sensitivity":
        return (
          <div className="space-y-3">
            {[
              { id: "low", label: "Low Sensitivity", desc: "Fewer alerts, higher threshold" },
              { id: "balanced", label: "Balanced", desc: "Recommended for most users" },
              { id: "high", label: "High Sensitivity", desc: "More alerts, lower threshold" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setFormData({ ...formData, sensitivity: option.id })}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all text-left",
                  formData.sensitivity === option.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/30 hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={cn(
                    "h-5 w-5",
                    formData.sensitivity === option.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div>
                    <h3 className="font-medium text-foreground">{option.label}</h3>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </div>
                  {formData.sensitivity === option.id && <Check className="h-5 w-5 text-primary ml-auto" />}
                </div>
              </button>
            ))}
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-3">
            <button
              onClick={() => setFormData({ ...formData, notificationsEnabled: true })}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all text-left",
                formData.notificationsEnabled
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium text-foreground">All Notifications</h3>
                  <p className="text-sm text-muted-foreground">Get alerted about everything</p>
                </div>
                {formData.notificationsEnabled && <Check className="h-5 w-5 text-primary ml-auto" />}
              </div>
            </button>
            <button
              onClick={() => setFormData({ ...formData, notificationsEnabled: false })}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all text-left",
                !formData.notificationsEnabled
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-foreground">Emergency Only</h3>
                  <p className="text-sm text-muted-foreground">Only critical alerts</p>
                </div>
                {!formData.notificationsEnabled && <Check className="h-5 w-5 text-primary ml-auto" />}
              </div>
            </button>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-3">
            <button
              onClick={() => setFormData({ ...formData, communityAlerts: !formData.communityAlerts })}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all text-left",
                formData.communityAlerts
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">Community Alerts</h3>
                  <p className="text-sm text-muted-foreground">Help others nearby in emergencies</p>
                </div>
                {formData.communityAlerts && <Check className="h-5 w-5 text-primary" />}
              </div>
            </button>
            <button
              onClick={() => setFormData({ ...formData, stealthMode: !formData.stealthMode })}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all text-left",
                formData.stealthMode
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">Stealth Mode Ready</h3>
                  <p className="text-sm text-muted-foreground">Enable disguised app interface</p>
                </div>
                {formData.stealthMode && <Check className="h-5 w-5 text-primary" />}
              </div>
            </button>
          </div>
        );

      case "complete":
        return (
          <div className="text-center space-y-6">
            <div className="h-20 w-20 rounded-2xl bg-safe/20 flex items-center justify-center mx-auto">
              <Check className="h-10 w-10 text-safe" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                Your safety guardian is now active
              </p>
              <p className="text-muted-foreground">
                SafePulse will monitor and protect you 24/7
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-secondary z-50">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <button
          onClick={handleBack}
          className={cn(
            "flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors",
            currentStep === 0 && "invisible"
          )}
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in" key={currentStep}>
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {step.title}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {step.description}
          </p>

          <div className="space-y-4">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6">
        <Button
          onClick={handleNext}
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </span>
          ) : currentStep === STEPS.length - 1 ? (
            <span className="flex items-center gap-2">
              Get Started
              <Check className="h-4 w-4" />
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Continue
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
