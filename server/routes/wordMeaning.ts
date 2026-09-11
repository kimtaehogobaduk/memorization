// Word meaning lookup with a small in-memory cache.
import type { Request, Response } from "express";
import { CEREBRAS_API_KEY } from "../config";
import { repairAndParseJSON, sleep } from "../utils/json";

const wordCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const EMPTY_WORD_RESULT = {
  meaning: "", example: "", part_of_speech: "", pronunciation: "",
  frequency: 0, difficulty: 0, synonyms: "", antonyms: "", derivatives: [],
};

async function callCerebrasForWord(word: string): Promise<unknown> {
  const MODELS = ["gpt-oss-120b"];
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

export async function handleGetWordMeaning(req: Request, res: Response) {
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
}
