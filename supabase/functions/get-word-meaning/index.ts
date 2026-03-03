import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfterToMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;

  const seconds = Number.parseInt(retryAfter, 10);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const dateMs = new Date(retryAfter).getTime() - Date.now();
  if (!Number.isNaN(dateMs) && dateMs > 0) {
    return dateMs;
  }

  return null;
}

function mapPartOfSpeechToKorean(pos?: string): string {
  const normalized = (pos || "").toLowerCase();
  if (normalized.includes("noun")) return "명사";
  if (normalized.includes("verb")) return "동사";
  if (normalized.includes("adjective")) return "형용사";
  if (normalized.includes("adverb")) return "부사";
  if (normalized.includes("pronoun")) return "대명사";
  if (normalized.includes("preposition")) return "전치사";
  if (normalized.includes("conjunction")) return "접속사";
  if (normalized.includes("interjection")) return "감탄사";
  return "";
}

async function callGeminiWithRetry(word: string, apiKey: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a Korean-English dictionary. Given an English word, return JSON with keys: meaning (한국어 뜻, 쉼표로 구분), example (짧은 영어 예문), part_of_speech (한국어 품사: 명사/동사/형용사/부사/전치사/접속사/감탄사/대명사), pronunciation (IPA 발음기호 /.../ 형식). meaning은 반드시 한국어로 작성하세요.",
          },
          {
            role: "user",
            content: `Word: "${word}"`,
          },
        ],
        temperature: 0.2,
        max_tokens: 180,
      }),
    });

    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
      const retryAfterMs = parseRetryAfterToMs(response.headers.get("retry-after"));
      const exponentialMs = Math.min(8000, 1000 * Math.pow(2, attempt));
      const jitterMs = Math.floor(Math.random() * 500);
      const waitMs = (retryAfterMs ?? exponentialMs) + jitterMs;

      await response.text(); // consume body
      console.log(`Rate limited/transient error (${response.status}), retry in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(waitMs);
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

function parseGeminiWordInfo(payload: any): WordInfo {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    return EMPTY_RESULT;
  }

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

async function fetchDictionaryFallback(word: string): Promise<WordInfo> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) return EMPTY_RESULT;

    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : null;
    const meaningEntry = entry?.meanings?.[0];
    const definition = meaningEntry?.definitions?.[0];

    const pronunciation =
      entry?.phonetic ||
      entry?.phonetics?.find((p: any) => typeof p?.text === "string")?.text ||
      "";

    return {
      meaning: definition?.definition || "",
      example: definition?.example || "",
      part_of_speech: mapPartOfSpeechToKorean(meaningEntry?.partOfSpeech),
      pronunciation,
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const requestPromise = (async (): Promise<WordInfo> => {
      const geminiResponse = await callGeminiWithRetry(normalizedWord, GEMINI_API_KEY);

      if (!geminiResponse.ok) {
        const status = geminiResponse.status;
        const text = await geminiResponse.text();
        console.error("AI gateway error:", status, text);

        // Do not bubble up 429 to client; provide graceful fallback instead
        if (status === 429) {
          const fallback = await fetchDictionaryFallback(normalizedWord);
          return fallback;
        }

        throw new Error(`AI gateway error: ${status}`);
      }

      const payload = await geminiResponse.json();
      const result = parseGeminiWordInfo(payload);
      return result;
    })();

    inFlight.set(normalizedWord, requestPromise);

    try {
      const result = await requestPromise;
      cache.set(normalizedWord, { data: result, expiresAt: now + CACHE_TTL_MS });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      inFlight.delete(normalizedWord);
    }
  } catch (error) {
    console.error("Error in get-word-meaning:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, ...EMPTY_RESULT }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
