import { useState } from "react";
import { Header } from "@/components/Header";
import { SafetyStatus } from "@/components/SafetyStatus";
import { EmergencyButton } from "@/components/EmergencyButton";
import { EmergencyContacts } from "@/components/EmergencyContacts";
import { SafetyIncidents } from "@/components/SafetyIncidents";
import { QuickActions } from "@/components/QuickActions";
import { LocationStatus } from "@/components/LocationStatus";
import { KeywordSetupDialog } from "@/components/KeywordSetupDialog";
import { AddContactDialog } from "@/components/AddContactDialog";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [safetyLevel, setSafetyLevel] = useState<"safe" | "monitoring" | "emergency">("safe");
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [emergencyKeyword, setEmergencyKeyword] = useState("Help me now");

  const [contacts, setContacts] = useState([
    { id: "1", name: "Sarah Johnson", phone: "+1 555-0123", relationship: "Family" },
    { id: "2", name: "Mike Chen", phone: "+1 555-0456", relationship: "Partner" },
  ]);

  const [incidents] = useState([
    {
      id: "1",
      type: "Fall Detected",
      description: "Motion sensors detected a potential fall. User confirmed safe.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      location: "123 Main St, Downtown",
      status: "resolved" as const,
    },
    {
      id: "2",
      type: "Inactivity Alert",
      description: "Unusual inactivity detected after rapid movement.",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: "resolved" as const,
    },
  ]);

  const handleEmergencyTrigger = () => {
    setSafetyLevel("emergency");
    toast({
      title: "🚨 Emergency Mode Activated",
      description: "Alerting your emergency contacts and sharing your location.",
      variant: "destructive",
    });
  };

  const handleAddContact = (contact: { name: string; phone: string; relationship: string }) => {
    setContacts([...contacts, { ...contact, id: Date.now().toString() }]);
    toast({
      title: "Contact Added",
      description: `${contact.name} has been added to your emergency contacts.`,
    });
  };

  const handleSaveKeyword = (keyword: string) => {
    setEmergencyKeyword(keyword);
    toast({
      title: "Keyword Updated",
      description: "Your emergency voice keyword has been saved.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-6">
        {/* Hero Section with Status */}
        <section className="mb-8">
          <SafetyStatus level={safetyLevel} className="mb-6" />

          {/* Emergency Button - Center Stage */}
          <div className="flex flex-col items-center justify-center py-8">
            <EmergencyButton onTrigger={handleEmergencyTrigger} />
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <QuickActions
              onKeywordSetup={() => setKeywordDialogOpen(true)}
              onLocationShare={() => setIsLocationSharing(!isLocationSharing)}
              onCommunityAlert={() => {
                toast({
                  title: "Community Alert",
                  description: "This feature alerts nearby SafePulse users.",
                });
              }}
              onCaptureEvidence={() => {
                toast({
                  title: "Evidence Capture",
                  description: "Camera and audio recording for emergencies.",
                });
              }}
            />

            <LocationStatus
              isSharing={isLocationSharing}
              lastUpdate={new Date()}
              address="123 Main Street, Downtown District"
              onToggleSharing={() => setIsLocationSharing(!isLocationSharing)}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <EmergencyContacts
              contacts={contacts}
              onAddContact={() => setAddContactDialogOpen(true)}
            />

            <SafetyIncidents incidents={incidents} />
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 rounded-xl border border-border/50 bg-card/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            🔒 Your privacy matters. SafePulse only activates sensors during risk events.
            No continuous tracking. No always-on listening.
          </p>
        </div>
      </main>

      {/* Dialogs */}
      <KeywordSetupDialog
        open={keywordDialogOpen}
        onOpenChange={setKeywordDialogOpen}
        currentKeyword={emergencyKeyword}
        onSaveKeyword={handleSaveKeyword}
      />

      <AddContactDialog
        open={addContactDialogOpen}
        onOpenChange={setAddContactDialogOpen}
        onAddContact={handleAddContact}
      />
    </div>
  );
};

export default Index;
