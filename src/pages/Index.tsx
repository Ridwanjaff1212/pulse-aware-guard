import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Brain, Bell, Lock, MessageCircle, 
  Mic, Activity, Users, ChevronRight, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MODULES = [
  { 
    id: "detection", 
    title: "Smart Detection", 
    description: "Voice keywords & motion sensing",
    icon: Mic, 
    path: "/detection",
    color: "bg-primary/10 text-primary"
  },
  { 
    id: "ai-engine", 
    title: "AI Risk Engine", 
    description: "Context-aware safety analysis",
    icon: Brain, 
    path: "/ai-engine",
    color: "bg-accent/10 text-accent"
  },
  { 
    id: "response", 
    title: "Response Network", 
    description: "Emergency contacts & alerts",
    icon: Users, 
    path: "/response",
    color: "bg-destructive/10 text-destructive"
  },
  { 
    id: "privacy", 
    title: "Privacy & Stealth", 
    description: "Data protection & incident packs",
    icon: Lock, 
    path: "/privacy",
    color: "bg-safe/10 text-safe"
  },
];

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user!.id)
      .maybeSingle();
    
    if (data?.full_name) setUserName(data.full_name);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
          <Shield className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">SafePulse</h1>
              <p className="text-xs text-muted-foreground">AI Guardian</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold text-foreground">
            {userName ? `Welcome, ${userName.split(" ")[0]}` : "Welcome"}
          </h2>
          <p className="text-muted-foreground">Your safety dashboard</p>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl border border-safe/30 bg-safe/5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-safe/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-safe" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-safe animate-pulse" />
                <h3 className="font-semibold text-foreground">All Clear</h3>
              </div>
              <p className="text-sm text-muted-foreground">You're protected by SafePulse AI</p>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-2 gap-4">
          {MODULES.map((module) => (
            <button
              key={module.id}
              onClick={() => navigate(module.path)}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-secondary/50 transition-all text-left group"
            >
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-3", module.color)}>
                <module.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{module.title}</h3>
              <p className="text-xs text-muted-foreground">{module.description}</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>

        {/* AI Assistant */}
        <button
          onClick={() => navigate("/assistant")}
          className="w-full p-4 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-foreground">AI Safety Assistant</h3>
            <p className="text-sm text-muted-foreground">Chat with your AI guardian</p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => navigate("/detection")}>
            <Mic className="h-5 w-5 mb-1" />
            <span className="text-xs">Voice</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => navigate("/response")}>
            <Bell className="h-5 w-5 mb-1" />
            <span className="text-xs">SOS</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col" onClick={() => navigate("/ai-engine")}>
            <Activity className="h-5 w-5 mb-1" />
            <span className="text-xs">Analyze</span>
          </Button>
        </div>

        {/* Privacy Notice */}
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            <Lock className="h-3 w-3 inline mr-1" />
            Your data is encrypted and protected. No continuous tracking.
          </p>
        </div>
      </main>
    </div>
  );
}