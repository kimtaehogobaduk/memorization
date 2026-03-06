import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS = ["llama3.1-8b", "llama-3.3-70b"];
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
  type: "fill_blank" | "best_fit" | "synonym_trap" | "context_meaning" | "multiple_choice";
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

function getDifficultyPrompt(difficulty: string): string {
  switch (difficulty) {
    case "하":
      return "Easy difficulty: straightforward questions. Distractors should be clearly different from the correct answer. Use simple sentence structures.";
    case "중":
      return "Medium difficulty: questions require some thinking. Distractors should be somewhat plausible but distinguishable with knowledge.";
    case "상":
      return "Hard difficulty: questions should be tricky. Distractors must be very plausible - use words with similar meanings, common confusions, or subtle differences. Include context-dependent questions.";
    case "극상":
      return "EXTREME difficulty: Questions must be so hard that even native English speakers would struggle. Use: (1) near-synonyms with extremely subtle nuance differences, (2) rare secondary meanings of common words, (3) words that are commonly confused even by educated speakers, (4) contextual traps where multiple answers seem correct but only one fits perfectly, (5) idiomatic or collocational traps. Every distractor must be highly plausible. This is graduate-level vocabulary testing.";
    default:
      return "Medium difficulty.";
  }
}

async function callCerebras(
  words: WordInput[],
  difficulty: string,
  customRequest: string,
  apiKey: string,
): Promise<QuizQuestion[]> {
  const wordList = words.map((w, i) => `${i + 1}. "${w.word}" (뜻: ${w.meaning}${w.part_of_speech ? `, 품사: ${w.part_of_speech}` : ""})`).join("\n");

  const difficultyGuide = getDifficultyPrompt(difficulty);

  const systemPrompt = `You are an expert English vocabulary quiz generator for Korean learners. Generate diverse, creative quiz questions.

RULES:
- Generate exactly one question per word provided.
- Mix question types: fill_blank (fill in the blank in a sentence), best_fit (choose the best word for context), synonym_trap (find the word closest/farthest in meaning), context_meaning (what does the word mean in this context), multiple_choice (standard word-meaning matching but with tricky distractors).
- Each question MUST have exactly 4 choices.
- correctIndex is 0-based.
- explanation must be in Korean, explaining WHY the answer is correct and why others are wrong. Be detailed (2-3 sentences).
- All question text should be in English (since it's an English vocabulary quiz), but explanations in Korean.
- ${difficultyGuide}
${customRequest ? `\nAdditional user request: ${customRequest}` : ""}

Return a JSON array of objects with these fields:
{ "wordId": string, "type": string, "question": string, "choices": string[4], "correctIndex": number (0-3), "explanation": string }`;

  let lastError: Error | null = null;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
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
              { role: "system", content: systemPrompt },
              { role: "user", content: `Generate quiz questions for these ${words.length} words:\n${wordList}` },
            ],
            temperature: difficulty === "극상" ? 0.7 : 0.5,
            max_tokens: Math.min(words.length * 350, 8000),
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
          break; // try next model
        }
        if (!response.ok) {
          const t = await response.text();
          throw new Error(`[${model}] ${response.status}: ${t}`);
        }

        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty response");

        const parsed = JSON.parse(content);
        const questions: any[] = Array.isArray(parsed) ? parsed : parsed.questions || parsed.quiz || Object.values(parsed)[0];

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("Invalid quiz format");
        }

        return questions.map((q: any, i: number) => ({
          id: `q-${i}`,
          wordId: q.wordId || words[i]?.id || `unknown-${i}`,
          type: q.type || "multiple_choice",
          question: q.question || "",
          choices: Array.isArray(q.choices) ? q.choices.slice(0, 4) : ["", "", "", ""],
          correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
          explanation: q.explanation || "해설 없음",
        }));
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[${model}] attempt ${attempt + 1}:`, lastError.message);
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

    // Limit to 30 words per request to stay within token limits
    const limitedWords = words.slice(0, 30);
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
