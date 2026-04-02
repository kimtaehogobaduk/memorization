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
      return new Response(JSON.stringify({ valid: false, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a strict but fair vocabulary quiz grader for Korean learners studying English.

English word: "${word}"
Stored meaning (Korean): "${correctMeaning}"
User's answer (Korean): "${userAnswer}"

Judge if the user's answer is an acceptable Korean meaning for "${word}".

ACCEPT if:
- The answer is a recognized Korean translation of this English word
- The answer is a close synonym of the stored meaning (e.g. "빠른" for "신속한")
- The answer captures the same core concept, even with slightly different wording
- Minor particle or conjugation differences (e.g. "하다" vs "하는 것") are OK

REJECT if:
- The answer is vague, overly broad, or too general (e.g. "것" for "book", "좋은" for "excellent")
- The answer refers to a different concept or a different meaning of the word that doesn't relate to the stored meaning's context
- The answer is a related but clearly different word (e.g. "걷다" for "run")
- The answer is too short or meaningless (single particles, single common words with no specificity)

Be moderately strict: accept valid synonyms and natural Korean expressions, but reject lazy or vague answers.

Respond with ONLY: {"valid": true} or {"valid": false}`;

    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [
          { role: "system", content: "You are a quiz grading assistant. Respond ONLY with a JSON object. No extra text." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 20,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Cerebras error:", response.status, errText);
      return new Response(JSON.stringify({ valid: false, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || "";

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
