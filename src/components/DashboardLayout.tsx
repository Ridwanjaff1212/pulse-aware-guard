import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield, Brain, Bell, Lock, MessageCircle, Mic,
  Activity, Users, ChevronRight, LogOut, Menu, X,
  Home, Settings, Map, Eye, MapPin, History, Radio,
  Smartphone, AlertTriangle, Zap, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const SIDEBAR_ITEMS = [
  { id: "dashboard", title: "Dashboard", icon: Home, path: "/" },
  { id: "detection", title: "Smart Detection", icon: Mic, path: "/detection", badge: "LIVE" },
  { id: "ai-engine", title: "AI Risk Engine", icon: Brain, path: "/ai-engine" },
  { id: "response", title: "Response Network", icon: Users, path: "/response" },
  { id: "privacy", title: "Privacy & Stealth", icon: Lock, path: "/privacy" },
  { id: "assistant", title: "AI Assistant", icon: MessageCircle, path: "/assistant", badge: "AI" },
];

const SECONDARY_ITEMS = [
  { id: "live-map", title: "Live Map", icon: MapPin, path: "/live-map" },
  { id: "incidents", title: "Incident History", icon: History, path: "/incidents" },
  { id: "community", title: "Community Alerts", icon: Radio, path: "/community" },
  { id: "vitals", title: "Vitals Monitor", icon: Heart, path: "/vitals", badge: "PPG" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border",
          "transform transition-transform duration-300 ease-in-out lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">SafePulse</h1>
                <p className="text-xs text-muted-foreground">AI Safety Guardian</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-4 mb-2">Main</p>
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                    "hover:bg-secondary/80 group",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span className={cn(
                    "font-medium text-sm flex-1 text-left",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {item.title}
                  </span>
                  {(item as any).badge && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                      (item as any).badge === "LIVE" 
                        ? "bg-safe/20 text-safe animate-pulse" 
                        : "bg-accent/20 text-accent"
                    )}>
                      {(item as any).badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}

            <div className="pt-4 pb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-4 mb-2">Tools</p>
            </div>
            {SECONDARY_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                    "hover:bg-secondary/80 group",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span className={cn(
                    "font-medium text-sm",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {item.title}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              {title && (
                <h2 className="font-semibold text-foreground">{title}</h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
