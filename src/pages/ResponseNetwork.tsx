import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, Users, MapPin, Phone, ArrowLeft, Settings, 
  Plus, Trash2, AlertCircle, Send, Radio, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

export default function ResponseNetwork() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadContacts();
      getCurrentLocation();
    }
  }, [user]);

  const loadContacts = async () => {
    const { data } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user!.id)
      .order("is_primary", { ascending: false });
    
    if (data) setContacts(data);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
            );
            const data = await response.json();
            setCurrentLocation({ lat, lng, address: data.display_name });
          } catch {
            setCurrentLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          }
        }
      );
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) return;

    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user!.id,
      name: newContact.name,
      phone: newContact.phone,
      relationship: newContact.relationship || "Contact",
      is_primary: contacts.length === 0,
    });

    if (!error) {
      loadContacts();
      setNewContact({ name: "", phone: "", relationship: "" });
      setShowAddContact(false);
      toast({ title: "Contact Added", description: `${newContact.name} added to emergency contacts.` });
    }
  };

  const deleteContact = async (id: string) => {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    loadContacts();
    toast({ title: "Contact Removed" });
  };

  const triggerEmergency = async () => {
    setIsEmergencyActive(true);

    // Create incident
    const { data: incident } = await supabase.from("safety_incidents").insert({
      user_id: user!.id,
      type: "Manual SOS",
      description: "Emergency triggered from Response Network module.",
      status: "active",
      location_lat: currentLocation?.lat,
      location_lng: currentLocation?.lng,
      location_address: currentLocation?.address,
    }).select().single();

    // Create alert
    if (currentLocation) {
      await supabase.from("emergency_alerts").insert({
        user_id: user!.id,
        incident_id: incident?.id,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        message: "Emergency SOS activated",
        status: "active",
        radius_meters: 1000,
      });
    }

    // Save location
    if (currentLocation) {
      await supabase.from("location_history").insert({
        user_id: user!.id,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        address: currentLocation.address,
        is_emergency: true,
      });
    }

    toast({
      title: "EMERGENCY ACTIVATED",
      description: "Alerting your emergency contacts...",
      variant: "destructive",
    });

    // Reset after 5 seconds for demo
    setTimeout(() => setIsEmergencyActive(false), 5000);
  };

  const cancelEmergency = () => {
    setIsEmergencyActive(false);
    toast({ title: "Emergency Cancelled", description: "All alerts have been cancelled." });
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
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <h1 className="font-semibold text-foreground">Response Network</h1>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Emergency Button */}
        <div className={cn(
          "rounded-2xl border p-6 text-center transition-all",
          isEmergencyActive 
            ? "bg-destructive/10 border-destructive/50 animate-pulse" 
            : "bg-card border-border"
        )}>
          <div className={cn(
            "mx-auto h-24 w-24 rounded-full flex items-center justify-center mb-4 transition-all",
            isEmergencyActive ? "bg-destructive" : "bg-destructive/10"
          )}>
            <Radio className={cn(
              "h-12 w-12",
              isEmergencyActive ? "text-destructive-foreground animate-pulse" : "text-destructive"
            )} />
          </div>
          
          {isEmergencyActive ? (
            <>
              <h2 className="text-xl font-bold text-destructive mb-2">EMERGENCY ACTIVE</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Alerting {contacts.length} emergency contacts...
              </p>
              <Button variant="outline" onClick={cancelEmergency}>
                Cancel Emergency
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">Emergency SOS</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Instantly alert all emergency contacts
              </p>
              <Button variant="destructive" size="lg" onClick={triggerEmergency}>
                <AlertCircle className="mr-2 h-5 w-5" />
                Trigger Emergency
              </Button>
            </>
          )}
        </div>

        {/* Location Status */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Current Location</p>
              <p className="text-xs text-muted-foreground truncate">
                {currentLocation?.address || "Fetching location..."}
              </p>
            </div>
            {currentLocation && <CheckCircle className="h-5 w-5 text-safe" />}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Emergency Contacts</h3>
                <p className="text-xs text-muted-foreground">{contacts.length} contacts</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddContact(!showAddContact)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {showAddContact && (
            <div className="mb-4 p-4 rounded-xl bg-secondary/50 border border-border space-y-3 animate-fade-in">
              <Input
                placeholder="Contact name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
              <Input
                type="tel"
                placeholder="Phone number"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
              <Input
                placeholder="Relationship (optional)"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={addContact} className="flex-1" disabled={!newContact.name || !newContact.phone}>
                  Add Contact
                </Button>
                <Button variant="outline" onClick={() => setShowAddContact(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No emergency contacts yet</p>
              <Button variant="link" onClick={() => setShowAddContact(true)}>
                Add your first contact
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  </div>
                  {contact.is_primary && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Primary</span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteContact(contact.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Alert */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Community Alert</h3>
              <p className="text-xs text-muted-foreground">Alert nearby SafePulse users</p>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Send Community Alert
          </Button>
        </div>
      </main>
    </div>
  );
}