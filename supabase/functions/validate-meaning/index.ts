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

    const prompt = `You are a vocabulary quiz grader for Korean learners studying English.

English word: "${word}"
Stored meaning (Korean): "${correctMeaning}"
User's answer (Korean): "${userAnswer}"

Judge if the user's answer is an acceptable Korean meaning for "${word}".

ACCEPT if:
- The answer captures the core meaning of the word, even if worded differently
- The answer is a valid Korean synonym or paraphrase of the correct meaning
- The answer matches ANY valid meaning of the word (not just the stored one)
- Example: for "run", accept "달리다", "뛰다", "실행하다", "운영하다" — all are valid
- Example: for "book", accept "책", "서적", "예약하다" — all are valid meanings
- Minor typos, spacing differences, or particle differences (e.g. "하다" vs "함") are OK
- Partial but correct meaning (e.g. "빠른" for "swift" even if stored as "빠른, 신속한")

REJECT only if:
- The answer is clearly wrong or refers to a completely different concept
- The answer is too vague to be meaningful (e.g. single particle like "을")

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
