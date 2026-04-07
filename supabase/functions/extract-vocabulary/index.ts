import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedWord {
  word: string;
  meaning?: string;
  example?: string;
  part_of_speech?: string;
  pronunciation?: string;
  synonyms?: string;
  antonyms?: string;
  derivatives?: { word: string; meaning: string }[];
}

interface ExtractedChapter {
  name: string;
  words: ExtractedWord[];
}

interface ExtractionResult {
  vocabulary_name?: string;
  chapters: ExtractedChapter[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Gemini API Key Rotation ─────────────────────────────────────────
function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const primary = Deno.env.get("GEMINI_API_KEY");
  if (primary) keys.push(primary);
  const key2 = Deno.env.get("GEMINI_API_KEY_2");
  if (key2) keys.push(key2);
  const key3 = Deno.env.get("GEMINI_API_KEY_3");
  if (key3) keys.push(key3);
  // Support up to 10 keys
  for (let i = 4; i <= 10; i++) {
    const k = Deno.env.get(`GEMINI_API_KEY_${i}`);
    if (k) keys.push(k);
  }
  return keys;
}

// ── Build extraction prompt ─────────────────────────────────────────
function buildSystemPrompt(includeDetails: boolean): string {
  const detailsPrompt = includeDetails
    ? `For each word, also extract or generate:
- "meaning": Korean meaning/definition (한국어 뜻). If the source doesn't have Korean meanings, YOU MUST generate accurate Korean translations.
- "example": example sentence if available
- "part_of_speech": part of speech (품사, in Korean like 명사, 동사, 형용사)
- "pronunciation": pronunciation guide
- "synonyms": comma-separated synonyms if available
- "antonyms": comma-separated antonyms if available
- "derivatives": array of {word, meaning} for derivative words if available`
    : `Only extract the word itself. Do NOT include meanings, examples, or other details.`;

  const wordShape = includeDetails
    ? `{"word": "example", "meaning": "예시", "example": "This is an example.", "part_of_speech": "명사", "pronunciation": "ɪɡˈzæmpəl", "synonyms": "instance, sample", "antonyms": "original", "derivatives": [{"word": "exemplary", "meaning": "모범적인"}]}`
    : `{"word": "example"}`;

  return `You are a vocabulary extraction expert. Extract structured vocabulary data from documents.

CRITICAL RULES:
1. Extract ALL English words from the content.
2. Group into chapters if sections like "Day 1", "Unit 1", "Chapter 1", "Lesson 1", "Week 1", "Part 1", "Section 1", "Level 1", "Module 1", "Stage 1", "Round 1", "Set 1" exist.
3. If no sections, use a single chapter called "전체 단어".
4. Infer vocabulary name from document title if visible, otherwise use "".
5. ${detailsPrompt}

OCR ERROR CORRECTION:
- Fix common OCR errors: "rn" → "m", "l" → "I" or "1" when contextually appropriate, "0" ↔ "O", etc.
- Fix broken words that were split across lines.
- If a word looks like gibberish or is clearly misspelled, correct it to the most likely intended English word.
- Remove page numbers, headers, footers, and non-vocabulary content.

KOREAN MEANING GENERATION:
- If the source material does NOT contain Korean meanings, you MUST generate accurate Korean translations for every word.
- Provide the most common/primary meaning first, then secondary meanings separated by commas.

Return ONLY valid JSON:
{"vocabulary_name": "","chapters": [{"name": "Day 1","words": [${wordShape}]}]}

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no explanation.`;
}

// ── JSON parsing with repair ─────────────────────────────────────────
function parseAIResponse(content: string): ExtractionResult {
  let jsonStr = content.trim();
  jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const jsonStart = jsonStr.indexOf("{");
  if (jsonStart === -1) throw new Error("No JSON object found");
  jsonStr = jsonStr.substring(jsonStart);

  const lastBrace = jsonStr.lastIndexOf("}");
  if (lastBrace !== -1) jsonStr = jsonStr.substring(0, lastBrace + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    let repaired = jsonStr
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, (ch) =>
        ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
      );
    try {
      parsed = JSON.parse(repaired);
    } catch {
      let openBraces = 0, openBrackets = 0;
      for (const char of repaired) {
        if (char === "{") openBraces++;
        else if (char === "}") openBraces--;
        else if (char === "[") openBrackets++;
        else if (char === "]") openBrackets--;
      }
      repaired = repaired.replace(/,\s*$/, "");
      repaired += "]".repeat(Math.max(0, openBrackets));
      repaired += "}".repeat(Math.max(0, openBraces));
      parsed = JSON.parse(repaired);
    }
  }

  if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
    parsed = { vocabulary_name: "", chapters: [{ name: "전체 단어", words: [] }] };
  }

  parsed.chapters = parsed.chapters
    .map((ch: any) => ({
      name: ch.name || "전체 단어",
      words: (ch.words || [])
        .filter((w: any) => w.word && typeof w.word === "string" && w.word.trim().length > 0)
        .map((w: any) => ({
          word: w.word.trim(),
          meaning: w.meaning || "",
          example: w.example || "",
          part_of_speech: w.part_of_speech || "",
          pronunciation: w.pronunciation || "",
          synonyms: w.synonyms || "",
          antonyms: w.antonyms || "",
          derivatives: Array.isArray(w.derivatives) ? w.derivatives : [],
        })),
    }))
    .filter((ch: any) => ch.words.length > 0);

  return {
    vocabulary_name: parsed.vocabulary_name || "",
    chapters: parsed.chapters,
  };
}

// ── Call Gemini with file (multimodal) using key rotation ────────────
async function callGeminiWithFile(
  fileBase64: string,
  mimeType: string,
  includeDetails: boolean,
  apiKeys: string[]
): Promise<ExtractionResult> {
  const systemPrompt = buildSystemPrompt(includeDetails);
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const apiKey of apiKeys) {
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: `${systemPrompt}\n\n이 파일에서 모든 영어 단어를 추출해주세요.` },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: fileBase64,
                    },
                  },
                ],
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: includeDetails ? 65536 : 8192,
              },
            }),
          });

          if (res.status === 429) {
            console.warn(`Key ${apiKey.slice(0, 8)}... rate limited on ${model}, attempt ${attempt + 1}`);
            await sleep(2000 * (attempt + 1));
            if (attempt === 2) break; // move to next model or key
            continue;
          }

          if (res.status === 403 || res.status === 401) {
            console.warn(`Key ${apiKey.slice(0, 8)}... auth error (${res.status}), skipping key`);
            break; // skip this key entirely
          }

          if (!res.ok) {
            const errText = await res.text();
            console.error(`Gemini ${model} attempt ${attempt + 1} failed:`, res.status, errText);
            if (res.status >= 500) {
              await sleep(1000 * (attempt + 1));
              continue;
            }
            break;
          }

          const data = await res.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (!content) {
            console.warn(`Empty response from ${model} with key ${apiKey.slice(0, 8)}...`);
            continue;
          }

          console.log(`Success with model ${model}, key ${apiKey.slice(0, 8)}...`);
          return parseAIResponse(content);
        } catch (err) {
          console.error(`Gemini ${model} attempt ${attempt + 1} error:`, err);
          await sleep(1000);
        }
      }
    }
  }

  throw new Error("모든 AI 모델과 API 키에서 추출에 실패했습니다. 잠시 후 다시 시도해주세요.");
}

// ── Main handler ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKeys = getGeminiApiKeys();
    if (apiKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY가 설정되어 있지 않습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Using ${apiKeys.length} Gemini API key(s)`);

    const { file_base64, file_type, include_details } = await req.json();

    if (!file_base64 || !file_type) {
      return new Response(
        JSON.stringify({ error: "file_base64와 file_type이 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing file type: ${file_type}, base64 length: ${file_base64.length}`);

    const result = await callGeminiWithFile(
      file_base64,
      file_type,
      include_details !== false,
      apiKeys
    );

    const totalWords = result.chapters.reduce((sum, ch) => sum + ch.words.length, 0);
    console.log(`Extraction complete: ${totalWords} words in ${result.chapters.length} chapters`);

    return new Response(
      JSON.stringify({ ...result, total_words: totalWords }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-vocabulary error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
