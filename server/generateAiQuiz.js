const MODELS = ["llama3.1-8b"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getDifficultyPrompt(difficulty) {
  switch (difficulty) {
    case "하": return "Easy: straightforward questions, clearly different distractors.";
    case "중": return "Medium: somewhat plausible distractors.";
    case "상": return "Hard: very plausible distractors, subtle differences.";
    case "극상": return "EXTREME: native speakers would struggle. Near-synonyms, rare meanings, idiomatic traps.";
    default: return "Medium difficulty.";
  }
}

function repairAndParseJSON(raw) {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\[{]/);
  if (start === -1) throw new Error("No JSON found");
  const isArray = cleaned[start] === "[";
  const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (end === -1 || end <= start) {
    cleaned = cleaned.substring(start);
  } else {
    cleaned = cleaned.substring(start, end + 1);
  }
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, (ch) => (ch === "\n" || ch === "\t" ? ch : ""))
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  try { return JSON.parse(cleaned); } catch { }
  let braces = 0, brackets = 0;
  for (const c of cleaned) {
    if (c === "{") braces++;
    if (c === "}") braces--;
    if (c === "[") brackets++;
    if (c === "]") brackets--;
  }
  const inString = (cleaned.split('"').length - 1) % 2 === 1;
  if (inString) cleaned += '"';
  while (braces > 0) { cleaned += "}"; braces--; }
  while (brackets > 0) { cleaned += "]"; brackets--; }
  cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  try { return JSON.parse(cleaned); } catch { }
  const objects = [];
  const objRegex = /\{[^{}]*"wordId"[^{}]*"question"[^{}]*"choices"[^{}]*\}/g;
  let match;
  while ((match = objRegex.exec(raw)) !== null) {
    try { objects.push(JSON.parse(match[0])); } catch { }
  }
  if (objects.length > 0) return objects;
  throw new Error("Could not parse JSON after all repair attempts");
}

function extractQuestions(parsed) {
  let arr;
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    const values = Object.values(parsed);
    const found = values.find((v) => Array.isArray(v));
    if (found && found.length > 0) {
      arr = found;
    } else {
      throw new Error("No questions array found in response");
    }
  } else {
    throw new Error("Unexpected response type");
  }
  if (arr.length === 0) throw new Error("Empty questions array");

  return arr.map((q, i) => ({
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

async function callCerebras(words, difficulty, customRequest, apiKey) {
  const batchSize = Math.min(words.length, 10);
  const batch = words.slice(0, batchSize);

  const systemPrompt = `You are an expert English vocabulary quiz generator for Korean learners.
Generate exactly ${batchSize} quiz questions as a JSON array.

Each element must be:
{"wordId":"<copy the exact id provided>","type":"<one of: fill_blank, best_fit, synonym_trap, context_meaning, multiple_choice>","question":"<English question text>","choices":["<option1>","<option2>","<option3>","<option4>"],"correctIndex":<0-3>,"explanation":"<Korean explanation of why the answer is correct and why others are wrong>"}

CRITICAL RULES:
- "choices" must contain 4 REAL English words or phrases as answer options, NOT "A","B","C","D"
- One choice must be the correct answer, matching correctIndex
- For fill_blank: write a sentence with _____ blank, choices are words that could fill it
- For best_fit: give context, choices are words that might fit
- For synonym_trap: ask which word is closest/farthest in meaning, choices are real words
- Mix question types across the batch
- "explanation" must be written in Korean (2-3 sentences)
${getDifficultyPrompt(difficulty)}
${customRequest ? `Additional request: ${customRequest}` : ""}

Return ONLY the JSON array. No markdown fences, no extra text.`;

  const userMsg = `Words:\n${batch.map((w, i) => `${i + 1}. id="${w.id}" word="${w.word}" meaning="${w.meaning}"`).join("\n")}`;

  let lastError = null;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[${model}] attempt ${attempt + 1}, ${batchSize} words`);
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

        if (response.status === 429) { await response.text(); await sleep(2000 * (attempt + 1)); continue; }
        if (response.status >= 500) { await response.text(); await sleep(1500 * (attempt + 1)); continue; }
        if (response.status === 404) { await response.text(); break; }
        if (!response.ok) { const t = await response.text(); throw new Error(`[${model}] ${response.status}: ${t}`); }

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

export async function generateAiQuizHandler(req, res) {
  try {
    const { words, difficulty, customRequest } = req.body;

    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "단어가 없습니다." });
    }

    const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
    if (!CEREBRAS_API_KEY) throw new Error("CEREBRAS_API_KEY is not configured");

    const limitedWords = words.slice(0, 20);
    const questions = await callCerebras(limitedWords, difficulty || "중", customRequest || "", CEREBRAS_API_KEY);

    return res.json({ questions });
  } catch (error) {
    console.error("generate-ai-quiz error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
