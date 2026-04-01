import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, userAnswer, correctMeaning } = await req.json();

    if (!word || !userAnswer) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");
    if (!CEREBRAS_API_KEY) {
      // Fallback: simple text match
      return new Response(JSON.stringify({ valid: false, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a strict vocabulary quiz grader for Korean learners studying English words.

Word: "${word}"
Stored correct meaning: "${correctMeaning}"
User's answer: "${userAnswer}"

Determine if the user's answer is an acceptable meaning for the word "${word}".
Rules:
- Accept if the answer matches any valid Korean meaning of the word, even if different from the stored meaning
- Accept partial matches if the core meaning is correct (e.g., "달리다" for "run" even if stored as "실행하다, 달리다")
- Accept synonyms in Korean
- Reject if the meaning is for a completely different word
- Be lenient with minor typos or spacing differences

Respond with ONLY a JSON object: {"valid": true} or {"valid": false}`;

    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b",
        messages: [
          { role: "system", content: "You are a quiz grading assistant. Respond only with JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error("Cerebras error:", response.status);
      return new Response(JSON.stringify({ valid: false, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || "";

    // Extract valid field from response
    const match = content.match(/"valid"\s*:\s*(true|false)/);
    const valid = match ? match[1] === "true" : false;

    return new Response(JSON.stringify({ valid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("validate-meaning error:", error);
    return new Response(JSON.stringify({ valid: false, error: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
