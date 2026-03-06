import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type WordInfo = {
  meaning: string;
  example: string;
  part_of_speech: string;
  pronunciation: string;
};

const EMPTY_RESULT: WordInfo = {
  meaning: "",
  example: "",
  part_of_speech: "",
  pronunciation: "",
};

const cache = new Map<string, { data: WordInfo; expiresAt: number }>();
const inFlight = new Map<string, Promise<WordInfo>>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const MODELS = ["llama3.1-8b", "llama-3.3-70b", "gpt-oss-120b"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseWordInfo(payload: any): WordInfo {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Cerebras 응답 포맷이 올바르지 않습니다.");
  }

  try {
    const parsed = JSON.parse(content);
    const result: WordInfo = {
      meaning: parsed?.meaning || "",
      example: parsed?.example || "",
      part_of_speech: parsed?.part_of_speech || "",
      pronunciation: parsed?.pronunciation || "",
    };

    if (!result.meaning) {
      throw new Error("뜻(meaning) 필드가 비어 있습니다.");
    }

    return result;
  } catch {
    throw new Error("Cerebras JSON 파싱에 실패했습니다.");
  }
}

async function requestCerebrasModel(
  model: string,
  word: string,
  apiKey: string,
): Promise<WordInfo> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a Korean-English dictionary. Given an English word, return JSON with keys: meaning (한국어 뜻, 쉼표로 구분), example (짧은 영어 예문), part_of_speech (한국어 품사: 명사/동사/형용사/부사/전치사/접속사/감탄사/대명사), pronunciation (IPA 발음기호 /.../ 형식). meaning은 반드시 한국어로 작성하세요.",
          },
          { role: "user", content: `Word: \"${word}\"` },
        ],
        temperature: 0.2,
        max_tokens: 220,
      }),
    });

    if (response.status === 429) {
      const waitMs = 1500 * (attempt + 1) + Math.floor(Math.random() * 500);
      console.log(`[${model}] rate limited, retrying in ${waitMs}ms`);
      await response.text();
      await sleep(waitMs);
      continue;
    }

    if (response.status >= 500) {
      const waitMs = 1000 * (attempt + 1) + Math.floor(Math.random() * 400);
      console.log(`[${model}] server error ${response.status}, retrying in ${waitMs}ms`);
      await response.text();
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();

      // 모델 접근 불가/모델 없음이면 다음 모델로 넘어가기 위해 에러 throw
      if (response.status === 404 || errorText.includes("model_not_found")) {
        throw new Error(`[${model}] model unavailable: ${errorText}`);
      }

      throw new Error(`[${model}] request failed (${response.status}): ${errorText}`);
    }

    const payload = await response.json();
    return parseWordInfo(payload);
  }

  throw new Error(`[${model}] rate limit or server error after retries`);
}

async function callCerebrasWithFallback(word: string, apiKey: string): Promise<WordInfo> {
  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const result = await requestCerebrasModel(model, word, apiKey);
      console.log(`Success with model: ${model}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Model ${model} failed:`, message);
      lastError = err instanceof Error ? err : new Error(message);
      continue;
    }
  }

  throw lastError ?? new Error("Cerebras fallback failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word } = await req.json();
    const trimmedWord = typeof word === "string" ? word.trim() : "";

    if (!trimmedWord) {
      return new Response(JSON.stringify(EMPTY_RESULT), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedWord = trimmedWord.toLowerCase();
    const now = Date.now();

    const cached = cache.get(normalizedWord);
    if (cached && cached.expiresAt > now) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inFlight.has(normalizedWord)) {
      const shared = await inFlight.get(normalizedWord)!;
      return new Response(JSON.stringify(shared), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");
    if (!CEREBRAS_API_KEY) {
      throw new Error("CEREBRAS_API_KEY is not configured");
    }

    const requestPromise = callCerebrasWithFallback(normalizedWord, CEREBRAS_API_KEY);
    inFlight.set(normalizedWord, requestPromise);

    try {
      const result = await requestPromise;
      cache.set(normalizedWord, {
        data: result,
        expiresAt: now + CACHE_TTL_MS,
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      inFlight.delete(normalizedWord);
    }
  } catch (error) {
    console.error("Error in get-word-meaning:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage, ...EMPTY_RESULT }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
