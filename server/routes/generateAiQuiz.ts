// AI-generated quiz question endpoint.
import type { Request, Response } from "express";
import { CEREBRAS_API_KEY, GEMINI_API_KEY } from "../config";
import { repairAndParseJSON, sleep } from "../utils/json";

function getDifficultyPrompt(difficulty: string): string {
  switch (difficulty) {
    case "하": return "Easy: straightforward questions, clearly different distractors.";
    case "중": return "Medium: somewhat plausible distractors.";
    case "상": return "Hard: very plausible distractors, subtle differences.";
    case "극상": return "EXTREME: native speakers would struggle. Near-synonyms, rare meanings, idiomatic traps.";
    default: return "Medium difficulty.";
  }
}

function extractQuestions(parsed: unknown): unknown[] {
  let arr: any[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    const values = Object.values(parsed as Record<string, unknown>);
    const found = values.find(v => Array.isArray(v)) as any[] | undefined;
    if (found && found.length > 0) arr = found;
    else throw new Error("No questions array found");
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

export async function handleGenerateAiQuiz(req: Request, res: Response) {
  try {
    const { words, difficulty, customRequest } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "단어가 없습니다." });
    }
    if (!CEREBRAS_API_KEY && !GEMINI_API_KEY) throw new Error("API key is not configured (CEREBRAS_API_KEY or GEMINI_API_KEY)");

    const limitedWords = words.slice(0, 20);
    const batchSize = Math.min(limitedWords.length, 10);
    const batch = limitedWords.slice(0, batchSize);

    const systemPrompt = `You are an expert English vocabulary quiz generator for Korean learners.
Generate exactly ${batchSize} quiz questions as a JSON array.

Each element must be:
{"wordId":"<copy the exact id provided>","type":"<one of: fill_blank, best_fit, synonym_trap, context_meaning, multiple_choice>","question":"<English question text>","choices":["<option1>","<option2>","<option3>","<option4>"],"correctIndex":<0-3>,"explanation":"<Korean explanation>"}

CRITICAL RULES:
- "choices" must contain 4 REAL English words or phrases as answer options, NOT "A","B","C","D"
- One choice must be the correct answer, matching correctIndex
- Mix question types across the batch
- "explanation" must be written in Korean (2-3 sentences)
${getDifficultyPrompt(difficulty || "중")}
${customRequest ? `Additional request: ${customRequest}` : ""}

Return ONLY the JSON array. No markdown fences, no extra text.`;

    const userMsg = `Words:\n${batch.map((w: any, i: number) => `${i + 1}. id="${w.id}" word="${w.word}" meaning="${w.meaning}"`).join("\n")}`;

    if (CEREBRAS_API_KEY) {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-oss-120b",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMsg },
              ],
              temperature: 0.3,
              max_tokens: 4096,
            }),
          });

          if (response.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
          if (response.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
          if (!response.ok) {
            const t = await response.text();
            throw new Error(`Cerebras ${response.status}: ${t}`);
          }

          const payload = await response.json();
          const content = payload?.choices?.[0]?.message?.content;
          if (!content) throw new Error("Empty response content");

          const parsed = repairAndParseJSON(content);
          const questions = extractQuestions(parsed);
          return res.json({ questions });
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.error(`generate-ai-quiz attempt ${attempt + 1}:`, lastError.message);
        }
      }
      if (!GEMINI_API_KEY) {
        throw lastError ?? new Error("All Cerebras attempts failed");
      }
    }

    if (GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMsg}` }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini generate-ai-quiz failed: ${errText}`);
      }

      const payload = await response.json();
      const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Empty response from Gemini");

      const parsed = repairAndParseJSON(content);
      const questions = extractQuestions(parsed);
      return res.json({ questions });
    }
  } catch (error) {
    console.error("generate-ai-quiz error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
