import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, User, Eye, EyeOff, ArrowRight, Phone, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyKeyword, setEmergencyKeyword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "🔐 Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "🔐 Login Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "👋 Welcome back!",
            description: "You've successfully logged in to SafePulse.",
          });
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, fullName, phone, emergencyKeyword || "Help me now");
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "📧 Account Exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "❌ Sign Up Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "🎉 Account Created!",
            description: "Welcome to SafePulse. Your AI guardian is now active.",
          });
          navigate("/");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/10 mb-4 animate-float">
            <Shield className="h-11 w-11 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">SafePulse</h1>
          <p className="text-muted-foreground mt-2 text-lg">🛡️ Your AI-Powered Guardian</p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card p-8 animate-scale-in shadow-xl">
          {/* Tabs */}
          <div className="flex mb-6 bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-2.5 rounded-md text-sm font-medium transition-all",
                isLogin
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              🔑 Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-2.5 rounded-md text-sm font-medium transition-all",
                !isLogin
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ✨ Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-foreground">👤 Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-foreground">📱 Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border"
                      required={!isLogin}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for emergency SMS alerts</p>
                </div>

                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-foreground">🎤 Emergency Keyword</label>
                  <div className="relative">
                    <Mic className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g., Help me now"
                      value={emergencyKeyword}
                      onChange={(e) => setEmergencyKeyword(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Say this phrase to trigger emergency mode (AI listens when enabled)</p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">📧 Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">🔒 Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-secondary/50 border-border"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? "🔓 Sign In" : "🚀 Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            🔐 By continuing, you agree to SafePulse's Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
          {[
            { icon: "🛡️", label: "24/7 Protection" },
            { icon: "🚨", label: "Instant SOS" },
            { icon: "🤖", label: "AI Guardian" },
            { icon: "🔒", label: "Privacy First" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="text-center rounded-xl border border-border/50 bg-card/50 p-3"
            >
              <span className="text-xl">{feature.icon}</span>
              <p className="text-[10px] text-muted-foreground mt-1">{feature.label}</p>
            </div>
          ))}
        </div>

        {/* Privacy Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-safe/10 border border-safe/30">
            <span className="text-safe text-sm">🔒</span>
            <span className="text-xs text-safe font-medium">End-to-End Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}