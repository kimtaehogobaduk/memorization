import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.SERVER_PORT || 3001;

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const PDF_CO_API_KEY = process.env.PDF_CO_API_KEY!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function repairAndParseJSON(raw: string): unknown {
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
  try { return JSON.parse(cleaned); } catch { /* continue */ }
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
  return JSON.parse(cleaned);
}

// ─── GET /api/get-word-meaning ────────────────────────────────────────────────

const wordCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const EMPTY_WORD_RESULT = {
  meaning: "", example: "", part_of_speech: "", pronunciation: "",
  frequency: 0, difficulty: 0, synonyms: "", antonyms: "", derivatives: [],
};

async function callCerebrasForWord(word: string): Promise<unknown> {
  const MODELS = ["llama3.1-8b"];
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `You are a Korean-English dictionary. Given an English word, return ONLY a JSON object (no markdown, no extra text) with these keys:
- meaning (한국어 뜻, 쉼표로 구분)
- example (짧은 영어 예문)
- part_of_speech (한국어 품사: 명사/동사/형용사/부사/전치사/접속사/감탄사/대명사)
- pronunciation (IPA 발음기호 /.../ 형식)
- frequency (1~5 정수)
- difficulty (1~5 정수)
- synonyms (영어 유의어 2~3개, 쉼표 구분)
- antonyms (영어 반의어 1~2개, 쉼표 구분. 없으면 빈 문자열)
- derivatives (파생어 배열, 각 항목은 {"word":"파생어","meaning":"한국어 뜻"} 형식, 최대 5개)
meaning은 반드시 한국어로 작성하세요.`,
            },
            { role: "user", content: `Word: "${word}"` },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });

      if (response.status === 429) {
        await sleep(1500 * (attempt + 1) + Math.floor(Math.random() * 500));
        continue;
      }
      if (response.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 404 || errText.includes("model_not_found")) {
          throw new Error(`[${model}] model unavailable`);
        }
        throw new Error(`[${model}] request failed (${response.status}): ${errText}`);
      }
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from Cerebras");

      const parsed: any = repairAndParseJSON(content);
      const derivatives: { word: string; meaning: string }[] = [];
      if (Array.isArray(parsed?.derivatives)) {
        for (const d of parsed.derivatives) {
          if (d && typeof d === "object" && d.word) {
            derivatives.push({ word: String(d.word), meaning: String(d.meaning || "") });
          }
        }
      }
      const result = {
        meaning: String(parsed?.meaning || ""),
        example: String(parsed?.example || ""),
        part_of_speech: String(parsed?.part_of_speech || ""),
        pronunciation: String(parsed?.pronunciation || ""),
        frequency: Math.min(5, Math.max(0, Number(parsed?.frequency) || 0)),
        difficulty: Math.min(5, Math.max(0, Number(parsed?.difficulty) || 0)),
        synonyms: String(parsed?.synonyms || ""),
        antonyms: String(parsed?.antonyms || ""),
        derivatives,
      };
      if (!result.meaning) throw new Error("meaning field is empty");
      return result;
    }
  }
  throw new Error("All models failed");
}

app.post("/api/get-word-meaning", async (req, res) => {
  try {
    const { word } = req.body;
    const trimmedWord = typeof word === "string" ? word.trim() : "";
    if (!trimmedWord) return res.json(EMPTY_WORD_RESULT);

    const normalizedWord = trimmedWord.toLowerCase();
    const now = Date.now();
    const cached = wordCache.get(normalizedWord);
    if (cached && cached.expiresAt > now) {
      return res.json(cached.data);
    }

    if (!CEREBRAS_API_KEY) throw new Error("CEREBRAS_API_KEY is not configured");
    const result = await callCerebrasForWord(normalizedWord);
    wordCache.set(normalizedWord, { data: result, expiresAt: now + CACHE_TTL_MS });
    res.json(result);
  } catch (error) {
    console.error("get-word-meaning error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error", ...EMPTY_WORD_RESULT });
  }
});

// ─── POST /api/validate-meaning ───────────────────────────────────────────────

app.post("/api/validate-meaning", async (req, res) => {
  try {
    const { word, userAnswer, correctMeaning } = req.body;
    if (!word || !userAnswer) return res.json({ valid: false });
    if (!CEREBRAS_API_KEY) return res.json({ valid: false, fallback: true });

    const prompt = `You are a strict but fair vocabulary quiz grader for Korean learners studying English.

English word: "${word}"
Stored meaning (Korean): "${correctMeaning}"
User's answer (Korean): "${userAnswer}"

Judge if the user's answer is an acceptable Korean meaning for "${word}".

ACCEPT if:
- The answer is a recognized Korean translation of this English word
- The answer is a close synonym of the stored meaning (e.g. "빠른" for "신속한")
- The answer captures the same core concept, even with slightly different wording
- Minor particle or conjugation differences are OK

REJECT if:
- The answer is vague, overly broad, or too general
- The answer refers to a different concept
- The answer is too short or meaningless

Respond with ONLY: {"valid": true} or {"valid": false}`;

    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
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
      console.error("Cerebras error:", response.status);
      return res.json({ valid: false, fallback: true });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || "";
    const match = content.match(/"valid"\s*:\s*(true|false)/);
    const valid = match ? match[1] === "true" : false;
    res.json({ valid });
  } catch (error) {
    console.error("validate-meaning error:", error);
    res.json({ valid: false, error: true });
  }
});

// ─── POST /api/generate-ai-quiz ──────────────────────────────────────────────

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

app.post("/api/generate-ai-quiz", async (req, res) => {
  try {
    const { words, difficulty, customRequest } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "단어가 없습니다." });
    }
    if (!CEREBRAS_API_KEY) throw new Error("CEREBRAS_API_KEY is not configured");

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

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3.1-8b",
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
    throw lastError ?? new Error("All attempts failed");
  } catch (error) {
    console.error("generate-ai-quiz error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// ─── POST /api/extract-vocabulary ────────────────────────────────────────────

async function extractTextViaPdfCo(fileBase64: string, _fileType: string): Promise<string> {
  const uploadRes = await fetch("https://api.pdf.co/v1/file/upload/base64", {
    method: "POST",
    headers: { "x-api-key": PDF_CO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ file: fileBase64 }),
  });
  if (!uploadRes.ok) throw new Error(`PDF.co upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  const uploadData = await uploadRes.json();
  if (uploadData.error) throw new Error(`PDF.co upload error: ${uploadData.message || uploadData.error}`);
  const fileUrl = uploadData.url;
  if (!fileUrl) throw new Error("PDF.co did not return a file URL");

  const convertRes = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
    method: "POST",
    headers: { "x-api-key": PDF_CO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ url: fileUrl, inline: true }),
  });
  if (!convertRes.ok) throw new Error(`PDF.co conversion failed (${convertRes.status}): ${await convertRes.text()}`);
  const convertData = await convertRes.json();
  if (convertData.error) throw new Error(`PDF.co conversion error: ${convertData.message || convertData.error}`);

  let extractedText = convertData.body || convertData.text || "";
  if (!extractedText && convertData.url) {
    const textRes = await fetch(convertData.url);
    extractedText = await textRes.text();
  }
  return extractedText;
}

async function callGeminiForVocabulary(text: string, includeDetails: boolean): Promise<unknown> {
  const detailsPrompt = includeDetails
    ? `For each word, also extract or generate:
- "meaning": Korean meaning/definition (한국어 뜻)
- "example": example sentence if available
- "part_of_speech": part of speech (품사, in Korean like 명사, 동사, 형용사)
- "pronunciation": pronunciation guide
- "synonyms": comma-separated synonyms if available
- "antonyms": comma-separated antonyms if available
- "derivatives": array of {word, meaning} for derivative words if available`
    : `Only extract the word itself. Do NOT include meanings, examples, or other details.`;

  const systemPrompt = `You are a vocabulary extraction expert. You analyze text from vocabulary lists/word books and extract structured data.

CRITICAL RULES:
1. Extract ALL English words from the text.
2. If the text has sections like "Day 1", "Day 2", "Unit 1", "Chapter 1", etc., group words into chapters accordingly.
3. If there are no clear sections, put all words in a single chapter called "전체 단어".
4. The vocabulary name should be inferred from the document title if visible, otherwise use "".
5. ${detailsPrompt}

Return ONLY valid JSON in this exact format:
{
  "vocabulary_name": "string or empty",
  "chapters": [
    {
      "name": "Day 1",
      "words": [
        {
          "word": "example"${includeDetails ? `,
          "meaning": "예시",
          "example": "This is an example.",
          "part_of_speech": "명사",
          "pronunciation": "ɪɡˈzæmpəl",
          "synonyms": "instance, sample",
          "antonyms": "original",
          "derivatives": [{"word": "exemplary", "meaning": "모범적인"}]` : ""}
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no explanation.`;

  const truncatedText = text.slice(0, 60000);
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n다음은 단어장/문서의 텍스트입니다. 모든 영어 단어를 추출해주세요.\n\n${truncatedText}` }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: includeDetails ? 8192 : 4096 },
          }),
        });

        if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
        if (!res.ok) {
          const errText = await res.text();
          console.error(`Gemini ${model} attempt ${attempt + 1} failed:`, res.status, errText);
          if (res.status >= 500) { await sleep(1000 * (attempt + 1)); continue; }
          break;
        }

        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!content) continue;

        let jsonStr = content.trim();
        jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonStart = jsonStr.indexOf("{");
        if (jsonStart === -1) throw new Error("No JSON object found");
        jsonStr = jsonStr.substring(jsonStart);
        const lastBrace = jsonStr.lastIndexOf("}");
        if (lastBrace !== -1) jsonStr = jsonStr.substring(0, lastBrace + 1);

        let parsed: any;
        try { parsed = JSON.parse(jsonStr); } catch {
          parsed = { vocabulary_name: "", chapters: [{ name: "전체 단어", words: [] }] };
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

        return { vocabulary_name: parsed.vocabulary_name || "", chapters: parsed.chapters };
      } catch (err) {
        console.error(`Gemini ${model} attempt ${attempt + 1} error:`, err);
        await sleep(1000);
      }
    }
  }
  throw new Error("모든 AI 모델에서 추출에 실패했습니다.");
}

app.post("/api/extract-vocabulary", async (req, res) => {
  try {
    if (!PDF_CO_API_KEY) return res.status(500).json({ error: "PDF_CO_API_KEY가 설정되어 있지 않습니다." });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY가 설정되어 있지 않습니다." });

    const { file_base64, file_type, include_details } = req.body;
    if (!file_base64 || !file_type) {
      return res.status(400).json({ error: "file_base64와 file_type이 필요합니다." });
    }

    console.log("Extracting text via PDF.co...");
    const extractedText = await extractTextViaPdfCo(file_base64, file_type);

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: "파일에서 텍스트를 추출할 수 없습니다. 다른 파일을 시도해주세요." });
    }

    console.log(`Extracted ${extractedText.length} chars, sending to Gemini...`);
    const result: any = await callGeminiForVocabulary(extractedText, include_details !== false);
    const totalWords = result.chapters.reduce((sum: number, ch: any) => sum + ch.words.length, 0);

    res.json({ ...result, total_words: totalWords });
  } catch (error) {
    console.error("extract-vocabulary error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "알 수 없는 오류" });
  }
});

// ─── POST /api/generate-vocabularies ─────────────────────────────────────────

const themes = [
  "TOEIC Essential Business Vocabulary","TOEFL Academic Words","IELTS Speaking Topics",
  "Daily Conversation Basics","Travel English - Airport","Travel English - Hotel",
  "Travel English - Restaurant","Business Email Writing","Job Interview Expressions",
  "Presentation Skills","Meeting Vocabulary","Negotiation Terms","Marketing & Advertising",
  "Finance & Accounting","IT & Technology","Medical Terms","Legal English","Academic Writing",
  "Scientific Research","Engineering Terms","Food & Cooking","Sports & Fitness","Fashion & Beauty",
  "Art & Culture","Music Terminology","Movie & Entertainment","Social Media English",
  "News & Current Affairs","Environmental Issues","Politics & Government","Education System",
  "Housing & Real Estate","Banking & Investment","Shopping & Retail","Transportation",
  "Weather & Climate","Health & Wellness","Emotions & Feelings","Personality Traits",
  "Family & Relationships","Hobbies & Interests","Nature & Wildlife","Geography Terms",
  "History Vocabulary","Philosophy Concepts","Psychology Terms","Sociology Basics",
  "Economics Fundamentals","Mathematics Terms","Physics Concepts","Chemistry Vocabulary",
  "Biology Terms","Astronomy & Space","Computer Science","Software Development",
  "Web Design Terms","Digital Marketing","Photography","Architecture","Interior Design",
  "Gardening & Plants","Pet Care","Automotive Terms","Aviation English","Maritime Vocabulary",
  "Agriculture","Construction","Manufacturing","Retail Management","Customer Service",
  "Human Resources","Project Management","Quality Assurance","Supply Chain","Logistics",
  "Insurance Terms","Tax & Accounting","Startup Vocabulary","E-commerce","Freelancing",
  "Remote Work","Time Management","Productivity Tips","Goal Setting","Problem Solving",
  "Critical Thinking","Communication Skills","Public Speaking","Writing Skills",
  "Reading Comprehension","Listening Skills","Pronunciation Guide","Idioms & Phrases",
  "Phrasal Verbs","Slang & Colloquialisms","Formal vs Informal","British vs American",
  "Common Mistakes","False Friends","Confusing Words","Synonyms & Antonyms",
];

async function generateWordsWithCerebras(theme: string): Promise<any[]> {
  const systemPrompt = `You are an expert English teacher creating vocabulary lists. Generate EXACTLY 100 words with Korean meanings, examples, and parts of speech. Return ONLY valid JSON array without any markdown formatting or code blocks.`;
  const userPrompt = `Create a vocabulary list for "${theme}" with exactly 100 words. Each word should include:
- word (English word)
- meaning (Korean translation)
- example (English example sentence)
- part_of_speech (noun, verb, adjective, adverb, etc.)

Return ONLY a JSON array in this exact format:
[{"word":"example","meaning":"예시","example":"This is an example.","part_of_speech":"noun"}]`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.1-8b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        }),
      });

      if (response.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (response.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      if (!response.ok) throw new Error(`Cerebras ${response.status}: ${await response.text()}`);

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response");

      const parsed = repairAndParseJSON(content);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid words format");
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`generate-vocabularies attempt ${attempt + 1}:`, lastError.message);
    }
  }
  throw lastError ?? new Error("All models failed");
}

app.post("/api/generate-vocabularies", async (req, res) => {
  try {
    if (!CEREBRAS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { count = 10, startIndex = 0 } = req.body;
    const themesToGenerate = themes.slice(startIndex, startIndex + count);

    const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
    if (!profiles || profiles.length === 0) throw new Error("No user profile found");
    const systemUserId = profiles[0].id;

    const results = [];
    for (const theme of themesToGenerate) {
      try {
        const words = await generateWordsWithCerebras(theme);
        const { data: vocab, error: vocabError } = await supabase
          .from("vocabularies")
          .insert({
            name: theme,
            description: `A comprehensive list of ${theme.toLowerCase()} vocabulary with 100 essential words`,
            language: "english",
            user_id: systemUserId,
            is_public: true,
          })
          .select()
          .single();

        if (vocabError) { results.push({ theme, success: false, error: vocabError.message }); continue; }

        const wordsToInsert = words.slice(0, 100).map((word: any, index: number) => ({
          vocabulary_id: vocab.id,
          word: word.word || "",
          meaning: word.meaning || "",
          example: word.example || null,
          part_of_speech: word.part_of_speech || null,
          order_index: index,
        }));

        const { error: wordsError } = await supabase.from("words").insert(wordsToInsert);
        if (wordsError) {
          await supabase.from("vocabularies").delete().eq("id", vocab.id);
          results.push({ theme, success: false, error: wordsError.message });
          continue;
        }

        results.push({ theme, vocabularyId: vocab.id, wordCount: wordsToInsert.length, success: true });
      } catch (error) {
        results.push({ theme, success: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    res.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error("generate-vocabularies error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// ─── POST /api/delete-user ────────────────────────────────────────────────────

app.post("/api/delete-user", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(400).json({ error: "No authorization header" });

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data: roleData } = await userSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return res.status(403).json({ error: "Admin access required" });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if (userId === user.id) return res.status(400).json({ error: "Cannot delete your own account" });

    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ error: errorMessage });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// 관리자 전용: profiles 테이블에서 직접 읽어 일반 데이터처럼 반환
// (auth.admin API 불필요 - email은 profiles.email 컬럼에서 읽음)

app.get("/api/admin/users", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    // 요청자가 관리자인지 확인
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data: roleData } = await userSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return res.status(403).json({ error: "Admin access required" });

    // 서비스 롤 키로 RLS 우회하여 profiles 전체 읽기
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [profilesResult, rolesResult] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("id, email, full_name, username, created_at")
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("user_roles")
        .select("user_id, role"),
    ]);

    if (profilesResult.error) throw profilesResult.error;

    const rolesMap = new Map((rolesResult.data || []).map(r => [r.user_id, r.role]));

    const users = (profilesResult.data || []).map(p => ({
      id: p.id,
      email: (p as any).email || "",
      created_at: p.created_at || "",
      last_sign_in_at: null,
      profile: {
        full_name: p.full_name || null,
        username: p.username || null,
      },
      role: (rolesMap.get(p.id) || "user") as "admin" | "elder" | "user",
    }));

    res.json({ users });
  } catch (error) {
    console.error("admin/users error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
