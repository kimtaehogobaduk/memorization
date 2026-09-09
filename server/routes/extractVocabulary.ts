// PDF/image vocabulary extraction endpoint.
import type { Request, Response } from "express";
import { GEMINI_API_KEY } from "../config";
import { sleep } from "../utils/json";

async function extractTextFromPDF(fileBase64: string): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const binary = Buffer.from(fileBase64, "base64");
  const uint8Array = new Uint8Array(binary);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const texts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(" ").replace(/-\s+\n/g, "").replace(/\s+\n\s+/g, " ");
    texts.push(pageText);
  }
  return texts.join("\n\n");
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

async function callGeminiWithImage(base64Data: string, mimeType: string, includeDetails: boolean): Promise<unknown> {
  const detailsPrompt = includeDetails
    ? `For each word, also extract or generate:
- "meaning": Korean meaning/definition (한국어 뜻)
- "example": example sentence if available
- "part_of_speech": part of speech (품사, in Korean like 명사, 동사, 형용사)
- "pronunciation": pronunciation guide
- "synonyms": comma-separated synonyms if available
- "antonyms": comma-separated antonyms if available
- "derivatives": array of {word, meaning} for derivative words if available
- Normalize OCR noise: fix split syllables, remove stray hyphens, ignore line-break fragments, and merge words broken across lines.`
    : `Only extract the word itself. Do NOT include meanings, examples, or other details. Normalize OCR noise, fix split lines and hyphens, and keep only real vocabulary words.`;

  const wordShape = includeDetails
    ? `{"word": "example", "meaning": "예시", "example": "This is an example.", "part_of_speech": "명사", "pronunciation": "ɪɡˈzæmpəl", "synonyms": "instance, sample", "antonyms": "original", "derivatives": [{"word": "exemplary", "meaning": "모범적인"}]}`
    : `{"word": "example"}`;

  const systemPrompt = `You are a vocabulary extraction expert. Extract structured vocabulary data.
CRITICAL RULES:
1. Extract ALL English words.
2. Group into chapters if sections like "Day 1", "Unit 1", "Chapter 1" exist.
3. If no sections, use a single chapter called "전체 단어".
4. Infer vocabulary name from document title if visible, otherwise use "".
5. Normalize OCR artifacts aggressively: remove mid-word hyphens, fix broken line wraps, ignore page footer/header noise, discard garbage symbols, and prefer canonical word forms.
6. ${detailsPrompt}
Return ONLY valid JSON:
{"vocabulary_name": "","chapters": [{"name": "Day 1","words": [${wordShape}]}]}
IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no explanation.`;

  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\n이미지에서 모든 영어 단어를 추출해주세요." }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: includeDetails ? 8192 : 4096 },
          }),
        });
        if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
        if (!res.ok) { if (res.status >= 500) { await sleep(1000 * (attempt + 1)); continue; } break; }
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
          const repaired = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, (ch) => (ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""));
          parsed = JSON.parse(repaired);
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
      } catch { await sleep(1000); }
    }
  }
  throw new Error("이미지에서 단어 추출에 실패했습니다.");
}

export async function handleExtractVocabulary(req: Request, res: Response) {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY가 설정되어 있지 않습니다." });

    const { file_base64, file_type, include_details } = req.body;
    if (!file_base64 || !file_type) {
      return res.status(400).json({ error: "file_base64와 file_type이 필요합니다." });
    }

    const isPDF = file_type === "application/pdf";
    let extractedText = "";

    if (isPDF) {
      try {
        console.log("Extracting text via pdfjs-dist...");
        extractedText = await extractTextFromPDF(file_base64);
        console.log(`PDF extracted ${extractedText.length} chars`);
      } catch (pdfErr) {
        console.error("PDF text extraction failed:", pdfErr);
      }
    }

    let result: any;
    if (extractedText && extractedText.trim().length > 30) {
      console.log(`Sending ${extractedText.length} chars to Gemini as text...`);
      result = await callGeminiForVocabulary(extractedText, include_details !== false);
    } else {
      console.log("Sending to Gemini as image...");
      const mimeType = isPDF ? "application/pdf" : file_type;
      result = await callGeminiWithImage(file_base64, mimeType, include_details !== false);
    }

    const totalWords = result.chapters.reduce((sum: number, ch: any) => sum + ch.words.length, 0);
    res.json({ ...result, total_words: totalWords });
  } catch (error) {
    console.error("extract-vocabulary error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "알 수 없는 오류" });
  }
}
