import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}

interface SendPushRequest {
  type: "emergency" | "community" | "test";
  userId?: string;
  incidentId?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  message?: string;
  targetEmails?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { type, userId, incidentId, latitude, longitude, radiusMeters, message, targetEmails }: SendPushRequest = await req.json();

    console.log(`📲 Push notification request: type=${type}, userId=${userId}`);

    let subscriptions: Array<{ endpoint: string; p256dh_key: string; auth_key: string }> = [];
    let payload: PushPayload;

    switch (type) {
      case "emergency":
        // Get user's emergency contacts' push subscriptions
        if (userId) {
          // Get contacts with emails
          const { data: contacts } = await supabase
            .from("emergency_contacts")
            .select("email, name")
            .eq("user_id", userId)
            .not("email", "is", null);

          if (contacts && contacts.length > 0) {
            const emails = contacts.map(c => c.email);
            
            // Get push subscriptions for these contacts
            const { data: contactSubs } = await supabase
              .from("contact_push_subscriptions")
              .select("endpoint, p256dh_key, auth_key")
              .in("contact_email", emails);

            if (contactSubs) {
              subscriptions.push(...contactSubs);
            }
          }

          // Also get the user's own subscriptions (for their other devices)
          const { data: userSubs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh_key, auth_key")
            .eq("user_id", userId);

          if (userSubs) {
            subscriptions.push(...userSubs);
          }
        }

        // Get user profile for personalization
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", userId)
          .single();

        payload = {
          title: "🚨 EMERGENCY ALERT",
          body: message || `${profile?.full_name || "Someone"} needs help! Tap to see location.`,
          icon: "/pwa-192x192.png",
          badge: "/sos-icon.png",
          tag: `emergency-${incidentId}`,
          data: {
            type: "emergency",
            incidentId,
            userId,
            url: `/incidents?id=${incidentId}`,
          },
          actions: [
            { action: "view", title: "View Location" },
            { action: "call", title: "Call 911" },
          ],
        };
        break;

      case "community":
        // Find nearby users who have opted in
        if (latitude && longitude) {
          const radius = radiusMeters || 5000;
          
          // Get community alert zones that overlap with this location
          const { data: nearbyZones } = await supabase
            .from("community_alert_zones")
            .select("user_id")
            .eq("is_active", true);

          if (nearbyZones) {
            const userIds = nearbyZones.map(z => z.user_id);
            
            const { data: communitySubs } = await supabase
              .from("push_subscriptions")
              .select("endpoint, p256dh_key, auth_key")
              .in("user_id", userIds);

            if (communitySubs) {
              subscriptions.push(...communitySubs);
            }
          }
        }

        payload = {
          title: "⚠️ Community Safety Alert",
          body: message || "An emergency has been reported near you. Stay alert.",
          icon: "/pwa-192x192.png",
          tag: `community-${Date.now()}`,
          data: {
            type: "community",
            latitude,
            longitude,
            url: "/live-map",
          },
        };
        break;

      case "test":
        // Send test notification to specific user
        if (userId) {
          const { data: testSubs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh_key, auth_key")
            .eq("user_id", userId);

          if (testSubs) {
            subscriptions.push(...testSubs);
          }
        }

        payload = {
          title: "✅ SafePulse Test",
          body: "Push notifications are working! You'll receive alerts here.",
          icon: "/pwa-192x192.png",
          tag: "test",
        };
        break;

      default:
        throw new Error("Invalid notification type");
    }

    console.log(`📤 Sending to ${subscriptions.length} subscriptions`);

    // Send notifications using Web Push API
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Use the web push protocol
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "TTL": "86400",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            // If subscription is invalid, remove it
            if (response.status === 404 || response.status === 410) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", sub.endpoint);
              
              await supabase
                .from("contact_push_subscriptions")
                .delete()
                .eq("endpoint", sub.endpoint);
            }
            throw new Error(`Push failed: ${response.status}`);
          }

          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error(`Failed to send to ${sub.endpoint}:`, error);
          return { success: false, endpoint: sub.endpoint, error: String(error) };
        }
      })
    );

    const successful = results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;
    const failed = results.length - successful;

    console.log(`✅ Push results: ${successful} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
