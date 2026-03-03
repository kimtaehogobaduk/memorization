import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

// Warm-instance cache + in-flight dedupe
const cache = new Map<string, { data: WordInfo; expiresAt: number }>();
const inFlight = new Map<string, Promise<WordInfo>>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 h

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callAIWithRetry(
  word: string,
  apiKey: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(
      "https://ai-gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a Korean-English dictionary. Given an English word, return JSON with keys: meaning (한국어 뜻, 쉼표로 구분), example (짧은 영어 예문), part_of_speech (한국어 품사: 명사/동사/형용사/부사/전치사/접속사/감탄사/대명사), pronunciation (IPA 발음기호 /.../ 형식). meaning은 반드시 한국어로 작성하세요.",
            },
            { role: "user", content: `Word: "${word}"` },
          ],
          temperature: 0.2,
          max_tokens: 200,
        }),
      }
    );

    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < maxRetries
    ) {
      await response.text(); // consume body
      const waitMs =
        Math.min(8000, 1000 * Math.pow(2, attempt)) +
        Math.floor(Math.random() * 500);
      console.log(
        `Transient error (${response.status}), retry in ${waitMs}ms (${attempt + 1}/${maxRetries})`
      );
      await sleep(waitMs);
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

function parseWordInfo(payload: any): WordInfo {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") return EMPTY_RESULT;

  try {
    const parsed = JSON.parse(content);
    return {
      meaning: parsed?.meaning || "",
      example: parsed?.example || "",
      part_of_speech: parsed?.part_of_speech || "",
      pronunciation: parsed?.pronunciation || "",
    };
  } catch {
    return EMPTY_RESULT;
  }
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

    // Cache hit
    const cached = cache.get(normalizedWord);
    if (cached && cached.expiresAt > now) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // In-flight dedupe
    if (inFlight.has(normalizedWord)) {
      const shared = await inFlight.get(normalizedWord)!;
      return new Response(JSON.stringify(shared), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const requestPromise = (async (): Promise<WordInfo> => {
      const response = await callAIWithRetry(normalizedWord, LOVABLE_API_KEY);

      if (!response.ok) {
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        return EMPTY_RESULT;
      }

      const payload = await response.json();
      return parseWordInfo(payload);
    })();

    inFlight.set(normalizedWord, requestPromise);

    try {
      const result = await requestPromise;
      if (result.meaning) {
        cache.set(normalizedWord, {
          data: result,
          expiresAt: now + CACHE_TTL_MS,
        });
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      inFlight.delete(normalizedWord);
    }
  } catch (error) {
    console.error("Error in get-word-meaning:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, ...EMPTY_RESULT }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
