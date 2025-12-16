import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmergencyEmailRequest {
  contacts: { email: string; name: string }[];
  userName: string;
  location: { lat: number; lng: number; address?: string } | null;
  incidentSummary?: string;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, userName, location, incidentSummary, timestamp }: EmergencyEmailRequest = await req.json();

    console.log(`📧 Sending emergency emails to ${contacts.length} contacts`);

    const locationLink = location 
      ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
      : null;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Emergency Alert</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🚨 EMERGENCY ALERT</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">SafePulse Safety System</p>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px;">
    <p style="font-size: 18px; color: #333; margin-top: 0;"><strong>${userName || "Your contact"}</strong> may need immediate help.</p>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">⚠️ This is an automated emergency alert</p>
    </div>
    <h2 style="color: #333; font-size: 16px;">📍 Location</h2>
    ${location ? `
      <p style="color: #666;">${location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}</p>
      <a href="${locationLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">📍 View Live Location</a>
    ` : `<p style="color: #666;">Location unavailable</p>`}
    <h2 style="color: #333; font-size: 16px; margin-top: 30px;">⏰ Time</h2>
    <p style="color: #666;">${new Date(timestamp).toLocaleString()}</p>
    ${incidentSummary ? `<h2 style="color: #333; font-size: 16px; margin-top: 30px;">📋 Summary</h2><p style="color: #666; background: #f9fafb; padding: 15px; border-radius: 8px;">${incidentSummary}</p>` : ''}
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin-top: 30px;">
      <h3 style="color: #166534; margin: 0 0 10px 0;">🆘 What to do:</h3>
      <ol style="color: #166534; margin: 0; padding-left: 20px;">
        <li>Try to contact ${userName || "them"} immediately</li>
        <li>If no response, consider calling emergency services</li>
        <li>Check the live location link above</li>
      </ol>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">Sent by SafePulse - AI-powered personal safety</p>
  </div>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const results: { email: string; success: boolean }[] = [];

    if (!RESEND_API_KEY) {
      console.log("⚠️ RESEND_API_KEY not configured - simulation mode");
      contacts.forEach(c => {
        console.log(`Would send email to: ${c.email}`);
        results.push({ email: c.email, success: false });
      });
      return new Response(
        JSON.stringify({ success: true, mode: "simulation", results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const contact of contacts) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SafePulse <onboarding@resend.dev>",
            to: [contact.email],
            subject: `🚨 EMERGENCY: ${userName || "Your contact"} may need help`,
            html: emailHtml,
          }),
        });

        if (response.ok) {
          console.log(`✅ Email sent to ${contact.email}`);
          results.push({ email: contact.email, success: true });
        } else {
          const error = await response.text();
          console.error(`❌ Failed: ${contact.email}:`, error);
          results.push({ email: contact.email, success: false });
        }
      } catch (emailError) {
        console.error(`❌ Error: ${contact.email}:`, emailError);
        results.push({ email: contact.email, success: false });
      }
    }

    return new Response(
      JSON.stringify({ success: true, mode: "live", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Emergency email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
