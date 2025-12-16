import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, phone?: string, emergencyKeyword?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const ensureProfile = async (u: User) => {
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", u.id)
          .maybeSingle();

        if (!existingProfile) {
          const metadata = u.user_metadata as any;
          await supabase.from("profiles").insert({
            user_id: u.id,
            full_name: metadata?.full_name || null,
            phone: metadata?.phone || null,
            emergency_keyword: metadata?.emergency_keyword || "Help me now",
            location_sharing_enabled: false,
            keyword_enabled: true,
            community_alerts_enabled: true,
          });
        }
      } catch {
        // Avoid blocking auth on profile issues
      }
    };

    // Set up auth state listener FIRST (sync only)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && session?.user) {
        // Defer any Supabase calls to avoid deadlocks
        setTimeout(() => {
          void ensureProfile(session.user);
        }, 0);
      }
    });

    // Then initialize session (and force re-auth on every fresh load)
    (async () => {
      try {
        const forceReauth = localStorage.getItem("safepulse_force_reauth") !== "false";
        if (forceReauth) {
          await supabase.auth.signOut();
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, phone?: string, emergencyKeyword?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
          emergency_keyword: emergencyKeyword || "Help me now",
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}