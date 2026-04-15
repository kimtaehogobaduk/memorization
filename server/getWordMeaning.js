const MODELS = ["llama3.1-8b"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cache = new Map();
const inFlight = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function extractJSON(raw) {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found in response");
  cleaned = cleaned.substring(start, end + 1);
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, (ch) => (ch === "\n" || ch === "\t" ? " " : ""));
  try { return JSON.parse(cleaned); } catch { }
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  try { return JSON.parse(cleaned); } catch { }
  const inStr = (cleaned.split('"').length - 1) % 2 === 1;
  if (inStr) cleaned += '"';
  let braces = 0;
  for (const c of cleaned) {
    if (c === "{") braces++;
    if (c === "}") braces--;
  }
  while (braces > 0) { cleaned += "}"; braces--; }
  cleaned = cleaned.replace(/,\s*}/g, "}");
  return JSON.parse(cleaned);
}

function parseWordInfo(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Empty response from Cerebras");
  const parsed = extractJSON(content);

  const derivatives = [];
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

async function requestCerebrasModel(model, word, apiKey) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
- frequency (1~5 정수, 영어에서의 사용빈도. 1=매우 드묾, 5=매우 자주 사용)
- difficulty (1~5 정수, 학습 난이도. 1=초등수준, 2=중학, 3=고등, 4=대학/토익, 5=전문가)
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
      await response.text();
      await sleep(1500 * (attempt + 1) + Math.floor(Math.random() * 500));
      continue;
    }
    if (response.status >= 500) {
      await response.text();
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404 || errorText.includes("model_not_found")) {
        throw new Error(`[${model}] model unavailable`);
      }
      throw new Error(`[${model}] request failed (${response.status}): ${errorText}`);
    }
    const payload = await response.json();
    return parseWordInfo(payload);
  }
  throw new Error(`[${model}] failed after retries`);
}

async function callCerebras(word, apiKey) {
  let lastError = null;
  for (const model of MODELS) {
    try {
      const result = await requestCerebrasModel(model, word, apiKey);
      console.log(`Success with model: ${model}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Model ${model} failed:`, message);
      lastError = err instanceof Error ? err : new Error(message);
    }
  }
  throw lastError ?? new Error("Cerebras fallback failed");
}

const EMPTY_RESULT = {
  meaning: "", example: "", part_of_speech: "", pronunciation: "",
  frequency: 0, difficulty: 0, synonyms: "", antonyms: "", derivatives: [],
};

export async function getWordMeaningHandler(req, res) {
  try {
    const { word } = req.body;
    const trimmedWord = typeof word === "string" ? word.trim() : "";
    if (!trimmedWord) {
      return res.json(EMPTY_RESULT);
    }

    const normalizedWord = trimmedWord.toLowerCase();
    const now = Date.now();
    const cached = cache.get(normalizedWord);
    if (cached && cached.expiresAt > now) {
      return res.json(cached.data);
    }

    if (inFlight.has(normalizedWord)) {
      const shared = await inFlight.get(normalizedWord);
      return res.json(shared);
    }

    const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
    if (!CEREBRAS_API_KEY) throw new Error("CEREBRAS_API_KEY is not configured");

    const requestPromise = callCerebras(normalizedWord, CEREBRAS_API_KEY);
    inFlight.set(normalizedWord, requestPromise);
    try {
      const result = await requestPromise;
      cache.set(normalizedWord, { data: result, expiresAt: now + CACHE_TTL_MS });
      return res.json(result);
    } finally {
      inFlight.delete(normalizedWord);
    }
  } catch (error) {
    console.error("Error in get-word-meaning:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: errorMessage, ...EMPTY_RESULT });
  }
}
