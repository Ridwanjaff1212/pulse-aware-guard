import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contact {
  phone: string;
  name: string;
}

interface EmergencyRequest {
  contacts: Contact[];
  message: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, message, location }: EmergencyRequest = await req.json();
    
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    // If Twilio is not configured, log and return success (for demo purposes)
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.log("Twilio not configured - SMS simulation mode");
      console.log("Would send to contacts:", contacts.map(c => c.name).join(", "));
      console.log("Message:", message);
      
      // Simulate sending for demo
      return new Response(
        JSON.stringify({ 
          success: true, 
          mode: "simulation",
          sentTo: contacts.length,
          message: "SMS simulated (Twilio not configured)" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    
    // Build emergency message with location
    let fullMessage = `🚨 SAFEPULSE EMERGENCY ALERT 🚨\n\n${message}`;
    
    if (location) {
      const mapsUrl = `https://maps.google.com/maps?q=${location.lat},${location.lng}`;
      fullMessage += `\n\n📍 Location: ${location.address || "Unknown"}\n🗺️ Map: ${mapsUrl}`;
    }
    
    fullMessage += "\n\n⚠️ This is an automated emergency alert from SafePulse.";

    for (const contact of contacts) {
      try {
        // Format phone number
        let phone = contact.phone.replace(/\D/g, "");
        if (!phone.startsWith("+")) {
          phone = phone.startsWith("1") ? `+${phone}` : `+1${phone}`;
        }

        console.log(`Sending SMS to ${contact.name} at ${phone}`);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            },
            body: new URLSearchParams({
              To: phone,
              From: TWILIO_PHONE_NUMBER,
              Body: fullMessage,
            }),
          }
        );

        const result = await response.json();
        
        if (response.ok) {
          console.log(`✅ SMS sent to ${contact.name}`);
          results.push({ contact: contact.name, success: true, sid: result.sid });
        } else {
          console.error(`❌ Failed to send to ${contact.name}:`, result);
          results.push({ contact: contact.name, success: false, error: result.message });
        }
      } catch (err) {
        console.error(`Error sending to ${contact.name}:`, err);
        results.push({ contact: contact.name, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        mode: "live",
        sentTo: successCount,
        total: contacts.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Emergency SMS error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
