import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle image generation
    if (type === "generate_image") {
      console.log("SafePulse AI generating image:", data.prompt);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            { role: "user", content: `Generate a safety-themed image: ${data.prompt}. Make it helpful, professional, and related to personal safety.` }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Image generation error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error(`Image generation error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const message = aiResponse.choices?.[0]?.message;
      const imageUrl = message?.images?.[0]?.image_url?.url;
      const textContent = message?.content || "Here's your generated image:";

      console.log("Image generated successfully");

      return new Response(JSON.stringify({ 
        success: true, 
        message: textContent,
        imageUrl: imageUrl 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "analyze_situation":
        systemPrompt = `You are SafePulse AI, an intelligent safety analysis system. Analyze the provided sensor data and context to determine the risk level and provide recommendations.
        
        You must respond with a JSON object containing:
        - riskLevel: "safe" | "low" | "medium" | "high" | "critical"
        - confidence: number between 0-100
        - analysis: string describing your analysis
        - recommendations: array of strings with safety recommendations
        - shouldEscalate: boolean indicating if emergency contacts should be notified
        - triggerType: string describing what type of event was detected (if any)`;
        
        userPrompt = `Analyze this safety situation:
        Motion Data: ${JSON.stringify(data.motionData || {})}
        Inactivity Duration: ${data.inactivityMinutes || 0} minutes
        Time of Day: ${data.timeOfDay || "unknown"}
        Location Type: ${data.locationType || "unknown"}
        Voice Stress Score: ${data.voiceStressScore || 0}/100
        Recent Activity: ${data.recentActivity || "normal"}
        User Context: ${data.userContext || "none provided"}`;
        break;

      case "voice_stress":
        systemPrompt = `You are SafePulse AI's voice stress analyzer. Analyze the voice characteristics to detect signs of distress, panic, or danger.
        
        Respond with JSON:
        - stressLevel: "calm" | "slight" | "moderate" | "high" | "severe"
        - stressScore: number 0-100
        - detectedEmotions: array of emotions detected
        - urgencyLevel: "none" | "low" | "medium" | "high"
        - recommendation: string with suggested action`;
        
        userPrompt = `Analyze voice characteristics:
        Speech Rate: ${data.speechRate || "normal"}
        Volume Variation: ${data.volumeVariation || "normal"}
        Tremor Detected: ${data.tremorDetected || false}
        Keywords Detected: ${JSON.stringify(data.keywords || [])}
        Duration: ${data.duration || 0} seconds`;
        break;

      case "image_analysis":
        systemPrompt = `You are SafePulse AI's image analyzer for emergency situations. Analyze the described image to assess urgency and provide guidance.
        
        Respond with JSON:
        - urgencyLevel: "none" | "low" | "medium" | "high" | "critical"
        - detectedIssues: array of detected concerns
        - immediateActions: array of recommended immediate actions
        - shouldCallEmergency: boolean
        - additionalNotes: string with any other observations`;
        
        userPrompt = `Image description for analysis: ${data.imageDescription || "No description provided"}
        User reported concern: ${data.userConcern || "None specified"}
        Context: ${data.context || "None"}`;
        break;

      case "generate_incident_summary":
        systemPrompt = `You are SafePulse AI generating a comprehensive incident report. Create a clear, professional summary suitable for emergency responders or family members.`;
        
        userPrompt = `Generate an incident summary for:
        Incident Type: ${data.incidentType || "Unknown"}
        Time: ${data.timestamp || "Unknown"}
        Location: ${data.location || "Unknown"}
        Events Timeline: ${JSON.stringify(data.events || [])}
        AI Risk Assessment: ${data.riskScore || 0}/100
        Resolution Status: ${data.status || "pending"}`;
        break;

      case "chat":
        systemPrompt = `You are SafePulse AI, a compassionate and helpful safety assistant. You help users with personal safety concerns, provide guidance during stressful situations, and offer emotional support. 

Key guidelines:
- Keep responses concise, warm, and actionable
- If someone is in immediate danger, always recommend calling emergency services
- Provide practical safety tips when asked
- Be empathetic and supportive
- You can help generate safety-related images when asked

Respond with JSON:
- response: your helpful message to the user`;
        userPrompt = data.message || "Hello";
        break;

      default:
        throw new Error("Unknown analysis type");
    }

    console.log(`SafePulse AI analyzing: ${type}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("SafePulse AI response received");

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      parsedContent = { raw: content };
    }

    return new Response(JSON.stringify({ success: true, analysis: parsedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SafePulse AI error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
