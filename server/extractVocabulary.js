import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = new URL("../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function extractTextFromPDF(base64Data) {
  const binary = Buffer.from(base64Data, "base64");
  const uint8Array = new Uint8Array(binary);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true, disableWorker: true });
  const pdf = await loadingTask.promise;
  const texts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ").replace(/-\s+\n/g, "").replace(/\s+\n\s+/g, " ");
    texts.push(pageText);
  }
  return texts.join("\n\n");
}

function parseAIResponse(content) {
  let jsonStr = content.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonStart = jsonStr.indexOf("{");
  if (jsonStart === -1) throw new Error("No JSON object found");
  jsonStr = jsonStr.substring(jsonStart);
  const lastBrace = jsonStr.lastIndexOf("}");
  if (lastBrace !== -1) jsonStr = jsonStr.substring(0, lastBrace + 1);
  try { return JSON.parse(jsonStr); } catch {
    const repaired = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, (ch) => (ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""));
    return JSON.parse(repaired);
  }
}

function buildPromptParts(includeDetails) {
  const detailsPrompt = includeDetails ? `For each word, also extract or generate:\n- "meaning": Korean meaning/definition (한국어 뜻)\n- "example": example sentence if available\n- "part_of_speech": part of speech (품사, in Korean like 명사, 동사, 형용사)\n- "pronunciation": pronunciation guide\n- "synonyms": comma-separated synonyms if available\n- "antonyms": comma-separated antonyms if available\n- "derivatives": array of {word, meaning} for derivative words if available\n- Normalize OCR noise: fix split syllables, remove stray hyphens, ignore line-break fragments, and merge words broken across lines.` : `Only extract the word itself. Do NOT include meanings, examples, or other details. Normalize OCR noise, fix split lines and hyphens, and keep only real vocabulary words.`;
  const wordShape = includeDetails ? `{"word": "example", "meaning": "예시", "example": "This is an example.", "part_of_speech": "명사", "pronunciation": "ɪɡˈzæmpəl", "synonyms": "instance, sample", "antonyms": "original", "derivatives": [{"word": "exemplary", "meaning": "모범적인"}]}` : `{"word": "example"}`;
  return `You are a vocabulary extraction expert. Extract structured vocabulary data.
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
}

async function callGeminiWithText(text, includeDetails, apiKey) {
  const systemPrompt = buildPromptParts(includeDetails);
  const truncatedText = text.slice(0, 22000);
  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n다음은 단어장/문서의 텍스트입니다. 모든 영어 단어를 추출해주세요.\n\n${truncatedText}` }] }], generationConfig: { temperature: 0.1, maxOutputTokens: includeDetails ? 8192 : 4096 } }) });
        if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
        if (!res.ok) { if (res.status >= 500) { await sleep(1000 * (attempt + 1)); continue; } break; }
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!content) continue;
        return parseAIResponse(content);
      } catch { await sleep(1000); }
    }
  }
  throw new Error("모든 AI 모델에서 텍스트 추출에 실패했습니다.");
}

async function callGeminiWithImage(base64Data, mimeType, includeDetails, apiKey) {
  const systemPrompt = buildPromptParts(includeDetails);
  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + "\n\n이미지에서 모든 영어 단어를 추출해주세요." }, { inline_data: { mime_type: mimeType, data: base64Data } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: includeDetails ? 8192 : 4096 } }) });
        if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
        if (!res.ok) { if (res.status >= 500) { await sleep(1000 * (attempt + 1)); continue; } break; }
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!content) continue;
        return parseAIResponse(content);
      } catch { await sleep(1000); }
    }
  }
  throw new Error("이미지에서 단어 추출에 실패했습니다.");
}

export async function extractVocabularyHandler(req, res) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY가 설정되어 있지 않습니다." });
    const { file_base64, file_type, include_details } = req.body;
    if (!file_base64 || !file_type) return res.status(400).json({ error: "file_base64와 file_type이 필요합니다." });
    let result;
    if (file_type === "application/pdf") {
      let extractedText = "";
      try { extractedText = await extractTextFromPDF(file_base64); } catch {}
      if (extractedText && extractedText.trim().length > 30) result = await callGeminiWithText(extractedText, include_details !== false, GEMINI_API_KEY); else result = await callGeminiWithImage(file_base64, "application/pdf", include_details !== false, GEMINI_API_KEY);
    } else {
      result = await callGeminiWithImage(file_base64, file_type, include_details !== false, GEMINI_API_KEY);
    }
    const totalWords = result.chapters.reduce((sum, ch) => sum + ch.words.length, 0);
    return res.json({ ...result, total_words: totalWords });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "알 수 없는 오류" });
  }
}
