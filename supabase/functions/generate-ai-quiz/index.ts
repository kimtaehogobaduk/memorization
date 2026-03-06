import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS = ["llama-3.3-70b", "llama3.1-8b"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface WordInput {
  id: string;
  word: string;
  meaning: string;
  part_of_speech?: string | null;
  example?: string | null;
}

interface QuizQuestion {
  id: string;
  wordId: string;
  type: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

function getDifficultyPrompt(difficulty: string): string {
  switch (difficulty) {
    case "하": return "Easy: straightforward questions, clearly different distractors.";
    case "중": return "Medium: somewhat plausible distractors.";
    case "상": return "Hard: very plausible distractors, subtle differences.";
    case "극상": return "EXTREME: native speakers would struggle. Near-synonyms, rare meanings, idiomatic traps.";
    default: return "Medium difficulty.";
  }
}

function repairAndParseJSON(raw: string): unknown {
  // Strip markdown fences
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Find JSON boundaries
  const start = cleaned.search(/[\[{]/);
  if (start === -1) throw new Error("No JSON found");

  const isArray = cleaned[start] === "[";
  const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");

  if (end === -1 || end <= start) {
    cleaned = cleaned.substring(start);
  } else {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Fix common issues
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\t" ? ch : "")
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Balance braces/brackets
  let braces = 0, brackets = 0;
  for (const c of cleaned) {
    if (c === "{") braces++;
    if (c === "}") braces--;
    if (c === "[") brackets++;
    if (c === "]") brackets--;
  }

  // If truncated mid-string, close it
  const inString = (cleaned.split('"').length - 1) % 2 === 1;
  if (inString) cleaned += '"';

  while (braces > 0) { cleaned += "}"; braces--; }
  while (brackets > 0) { cleaned += "]"; brackets--; }

  // Remove trailing comma before closing
  cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Last resort: extract individual objects with regex
  const objects: unknown[] = [];
  const objRegex = /\{[^{}]*"wordId"[^{}]*"question"[^{}]*"choices"[^{}]*\}/g;
  let match;
  while ((match = objRegex.exec(raw)) !== null) {
    try { objects.push(JSON.parse(match[0])); } catch { /* skip */ }
  }
  if (objects.length > 0) return objects;

  throw new Error("Could not parse JSON after all repair attempts");
}

function extractQuestions(parsed: unknown): QuizQuestion[] {
  let arr: any[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    // Find first array value
    const values = Object.values(parsed as Record<string, unknown>);
    const found = values.find(v => Array.isArray(v)) as any[] | undefined;
    if (found && found.length > 0) {
      arr = found;
    } else {
      throw new Error("No questions array found in response");
    }
  } else {
    throw new Error("Unexpected response type");
  }

  if (arr.length === 0) throw new Error("Empty questions array");

  return arr.map((q: any, i: number) => ({
    id: `q-${i}`,
    wordId: q.wordId || q.word_id || `unknown-${i}`,
    type: q.type || "multiple_choice",
    question: q.question || "",
    choices: Array.isArray(q.choices) ? q.choices.slice(0, 4) : ["A", "B", "C", "D"],
    correctIndex: typeof q.correctIndex === "number" ? Math.min(q.correctIndex, 3) :
                  typeof q.correct_index === "number" ? Math.min(q.correct_index, 3) : 0,
    explanation: q.explanation || "해설이 제공되지 않았습니다.",
  }));
}

async function callCerebras(
  words: WordInput[],
  difficulty: string,
  customRequest: string,
  apiKey: string,
): Promise<QuizQuestion[]> {
  // Batch words: max 10 per request to keep output short and parseable
  const batchSize = Math.min(words.length, 10);
  const batch = words.slice(0, batchSize);

  const wordList = batch.map((w, i) =>
    `${i + 1}. "${w.word}" (meaning: ${w.meaning})`
  ).join("\n");

  const systemPrompt = `You are a quiz generator. Generate exactly ${batchSize} quiz questions as a JSON array.
Each element: {"wordId":"<id>","type":"<fill_blank|best_fit|synonym_trap|context_meaning|multiple_choice>","question":"<English question>","choices":["A","B","C","D"],"correctIndex":<0-3>,"explanation":"<Korean explanation>"}
${getDifficultyPrompt(difficulty)}
${customRequest ? `User request: ${customRequest}` : ""}
IMPORTANT: Return ONLY valid JSON array. No markdown, no extra text.`;

  const userMsg = `Words:\n${batch.map((w, i) => `${i + 1}. id="${w.id}" word="${w.word}" meaning="${w.meaning}"`).join("\n")}`;

  let lastError: Error | null = null;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[${model}] attempt ${attempt + 1}, ${batchSize} words`);
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMsg },
            ],
            temperature: 0.3,
            max_tokens: 4096,
          }),
        });

        if (response.status === 429) {
          await response.text();
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (response.status >= 500) {
          await response.text();
          await sleep(1500 * (attempt + 1));
          continue;
        }
        if (response.status === 404) {
          await response.text();
          break; // next model
        }
        if (!response.ok) {
          const t = await response.text();
          throw new Error(`[${model}] ${response.status}: ${t}`);
        }

        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty response content");

        console.log(`[${model}] raw response length: ${content.length}`);

        const parsed = repairAndParseJSON(content);
        const questions = extractQuestions(parsed);

        console.log(`[${model}] successfully parsed ${questions.length} questions`);
        return questions;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[${model}] attempt ${attempt + 1}: ${lastError.message}`);
      }
    }
  }

  throw lastError ?? new Error("All models failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { words, difficulty, customRequest } = await req.json();

    if (!Array.isArray(words) || words.length === 0) {
      return new Response(JSON.stringify({ error: "단어가 없습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");
    if (!CEREBRAS_API_KEY) {
      throw new Error("CEREBRAS_API_KEY is not configured");
    }

    const limitedWords = words.slice(0, 20);
    const questions = await callCerebras(limitedWords, difficulty || "중", customRequest || "", CEREBRAS_API_KEY);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-ai-quiz error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
