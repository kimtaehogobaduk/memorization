import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { word, meaning, sentence } = await req.json();
    if (!word || !sentence) {
      return new Response(JSON.stringify({ correct: false, reason: "단어와 문장이 필요합니다." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");
    if (!CEREBRAS_API_KEY) {
      return new Response(JSON.stringify({ correct: true, reason: "AI 채점을 사용할 수 없어 정답으로 처리합니다.", fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `당신은 영어 학습자를 위한 엄격하지만 공정한 영작 채점관입니다.

주어진 단어: "${word}"
${meaning ? `단어의 뜻: "${meaning}"` : ""}
사용자가 작성한 문장: "${sentence}"

기준:
1. 문장에 주어진 단어("${word}")가 사용되었는가? (활용형 허용: run → ran, running)
2. 영어 문법이 올바른가? (시제, 주어-동사 일치, 관사, 전치사 등)
3. 단어가 의미적으로 자연스럽게 쓰였는가?
4. 너무 짧거나 의미 없는 문장(예: "I word.")은 오답.

엄격하지만 공정하게. 작은 철자 오타는 허용.

반드시 다음 JSON 형식으로만 응답:
{"correct": true, "reason": "정답인 이유 또는 칭찬 (한국어 1-2문장)"}
또는
{"correct": false, "reason": "왜 틀렸는지 한국어로 명확히 설명 (1-3문장)"}`;

    const MODELS = ["gpt-oss-120b", "llama3.1-8b"];
    let response: Response | null = null;
    let lastErrText = "";
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "당신은 영어 작문 채점 AI입니다. 반드시 유효한 JSON 객체로만 응답하세요." },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 400,
            response_format: { type: "json_object" },
            stream: false,
          }),
        });
        if (r.ok) { response = r; break; }
        lastErrText = await r.text();
        console.error(`Cerebras ${model} attempt ${attempt + 1} failed:`, r.status, lastErrText);
        if (r.status === 404) break; // try next model
        if (r.status === 429 || r.status >= 500) {
          await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
          continue;
        }
        break;
      }
      if (response) break;
    }

    if (!response) {
      console.error("grade-sentence Cerebras error:", lastErrText);
      return new Response(JSON.stringify({ correct: false, reason: "AI 채점에 실패했습니다. 잠시 후 다시 시도해주세요.", error: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || "";
    let parsed: { correct?: boolean; reason?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }

    return new Response(JSON.stringify({
      correct: !!parsed.correct,
      reason: parsed.reason || (parsed.correct ? "잘 작성했습니다!" : "문장에 문제가 있습니다."),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("grade-sentence error:", error);
    return new Response(JSON.stringify({ correct: false, reason: "채점 중 오류가 발생했습니다. 다시 시도해주세요.", error: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
