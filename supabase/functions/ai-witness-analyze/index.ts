import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'transcribe':
        systemPrompt = `You are an emergency transcription AI. Analyze the audio transcript for:
1. Signs of distress, threats, or danger
2. Key phrases indicating emergency
3. Speaker identification if possible
4. Location mentions
5. Time-sensitive information

Output JSON: { "threats": [], "urgency": "low|medium|high|critical", "summary": "", "keyPhrases": [], "actionItems": [] }`;
        userPrompt = `Analyze this audio transcript from an emergency situation:\n\n${data.transcript}`;
        break;

      case 'scene_analysis':
        systemPrompt = `You are an emergency scene analysis AI. Analyze the described scene for:
1. Potential threats or dangerous individuals
2. Environmental hazards
3. Escape routes or safe areas
4. Evidence that should be preserved
5. Recommended immediate actions

Output JSON: { "threats": [], "hazards": [], "safetyScore": 0-100, "recommendations": [], "evidenceNotes": [] }`;
        userPrompt = `Analyze this emergency scene description:\n\n${data.description}\n\nLocation: ${data.location || 'Unknown'}\nTime: ${data.timestamp}`;
        break;

      case 'threat_detection':
        systemPrompt = `You are a threat detection AI. Analyze the provided data for immediate threats:
1. Aggressive language or behavior
2. Weapons mentions
3. Violence indicators
4. Pursuit or stalking patterns
5. Medical emergencies

Output JSON: { "threatLevel": "none|low|moderate|high|imminent", "threats": [], "confidence": 0-100, "immediateAction": "" }`;
        userPrompt = `Analyze for threats:\n\nTranscript: ${data.transcript || 'N/A'}\nMotion: ${data.motion || 'N/A'}\nContext: ${data.context || 'N/A'}`;
        break;

      case 'generate_summary':
        systemPrompt = `You are an emergency incident summarizer. Create a comprehensive incident report including:
1. Timeline of events
2. Threat assessment
3. Evidence collected
4. Key participants/witnesses
5. Recommended follow-up actions

Output a clear, professional incident summary suitable for law enforcement.`;
        userPrompt = `Generate incident summary:\n\n${JSON.stringify(data, null, 2)}`;
        break;

      default:
        throw new Error('Unknown analysis type');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Try to parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      analysis = { raw: content };
    }

    return new Response(JSON.stringify({ analysis, type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Witness analyze error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
