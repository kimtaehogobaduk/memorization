import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Point to the worker file for Node.js
const workerPath = new URL(
  "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url
).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Extract text from base64 PDF using pdfjs-dist ──────────────────────────
async function extractTextFromPDF(base64Data) {
  const binary = Buffer.from(base64Data, "base64");
  const uint8Array = new Uint8Array(binary);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;
  const texts = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    texts.push(pageText);
  }

  return texts.join("\n\n");
}

// ── Parse AI JSON response ──────────────────────────────────────────────────
function parseAIResponse(content) {
  let jsonStr = content.trim();
  jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const jsonStart = jsonStr.indexOf("{");
  if (jsonStart === -1) throw new Error("No JSON object found");
  jsonStr = jsonStr.substring(jsonStart);

  const lastBrace = jsonStr.lastIndexOf("}");
  if (lastBrace !== -1) jsonStr = jsonStr.substring(0, lastBrace + 1);

  let parsed;
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
      let openBraces = 0,
        openBrackets = 0;
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
    .map((ch) => ({
      name: ch.name || "전체 단어",
      words: (ch.words || [])
        .filter((w) => w.word && typeof w.word === "string" && w.word.trim().length > 0)
        .map((w) => ({
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
    .filter((ch) => ch.words.length > 0);

  return {
    vocabulary_name: parsed.vocabulary_name || "",
    chapters: parsed.chapters,
  };
}

// ── Build extraction prompt ────────────────────────────────────────────────
function buildPromptParts(includeDetails) {
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

  const wordShape = includeDetails
    ? `{"word": "example", "meaning": "예시", "example": "This is an example.", "part_of_speech": "명사", "pronunciation": "ɪɡˈzæmpəl", "synonyms": "instance, sample", "antonyms": "original", "derivatives": [{"word": "exemplary", "meaning": "모범적인"}]}`
    : `{"word": "example"}`;

  return `You are a vocabulary extraction expert. Extract structured vocabulary data.

CRITICAL RULES:
1. Extract ALL English words.
2. Group into chapters if sections like "Day 1", "Unit 1", "Chapter 1" exist.
3. If no sections, use a single chapter called "전체 단어".
4. Infer vocabulary name from document title if visible, otherwise use "".
5. ${detailsPrompt}

Return ONLY valid JSON:
{"vocabulary_name": "","chapters": [{"name": "Day 1","words": [${wordShape}]}]}

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no explanation.`;
}

// ── Call Gemini with text ──────────────────────────────────────────────────
async function callGeminiWithText(text, includeDetails, apiKey) {
  const systemPrompt = buildPromptParts(includeDetails);
  const chunks = [];
  const maxChunkSize = 22000;
  for (let i = 0; i < text.length; i += maxChunkSize) {
    chunks.push(text.slice(i, i + maxChunkSize));
  }

  // Models ordered by preference — gemini-2.5-flash is the latest and most capable
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

  if (chunks.length > 1) {
    const combined = [];
    for (const chunk of chunks) {
      const partial = await callGeminiWithText(chunk, includeDetails, apiKey);
      combined.push(...(partial.chapters || []));
    }
    return {
      vocabulary_name: "",
      chapters: combined,
    };
  }

  const truncatedText = chunks[0] || "";

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemPrompt}\n\n다음은 단어장/문서의 텍스트입니다. 모든 영어 단어를 추출해주세요.\n\n${truncatedText}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: includeDetails ? 8192 : 4096,
            },
          }),
        });

        if (res.status === 429) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (!res.ok) {
          const errText = await res.text();
          console.error(`Gemini ${model} text attempt ${attempt + 1} failed:`, res.status, errText);
          if (res.status >= 500) {
            await sleep(1000 * (attempt + 1));
            continue;
          }
          break;
        }

        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!content) continue;

        return parseAIResponse(content);
      } catch (err) {
        console.error(`Gemini ${model} text attempt ${attempt + 1} error:`, err);
        await sleep(1000);
      }
    }
  }

  throw new Error("모든 AI 모델에서 텍스트 추출에 실패했습니다.");
}

// ── Call Gemini with image (base64) ────────────────────────────────────────
async function callGeminiWithImage(base64Data, mimeType, includeDetails, apiKey) {
  const systemPrompt = buildPromptParts(includeDetails);

  // Vision-capable models
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt + "\n\n이미지에서 모든 영어 단어를 추출해주세요." },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: includeDetails ? 8192 : 4096,
            },
          }),
        });

        if (res.status === 429) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (!res.ok) {
          const errText = await res.text();
          console.error(`Gemini ${model} image attempt ${attempt + 1} failed:`, res.status, errText);
          if (res.status >= 500) {
            await sleep(1000 * (attempt + 1));
            continue;
          }
          break;
        }

        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!content) continue;

        return parseAIResponse(content);
      } catch (err) {
        console.error(`Gemini ${model} image attempt ${attempt + 1} error:`, err);
        await sleep(1000);
      }
    }
  }

  throw new Error("이미지에서 단어 추출에 실패했습니다.");
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function extractVocabularyHandler(req, res) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY가 설정되어 있지 않습니다." });
    }

    const { file_base64, file_type, include_details } = req.body;

    if (!file_base64 || !file_type) {
      return res.status(400).json({ error: "file_base64와 file_type이 필요합니다." });
    }

    let result;

    if (file_type === "application/pdf") {
      // Try to extract text from PDF first, then send to Gemini
      console.log("Extracting text from PDF with pdfjs...");
      let extractedText = "";
      try {
        extractedText = await extractTextFromPDF(file_base64);
      } catch (pdfErr) {
        console.error("PDF text extraction failed:", pdfErr.message);
      }

      if (extractedText && extractedText.trim().length > 30) {
        console.log(`Extracted ${extractedText.length} chars, sending to Gemini text model...`);
        result = await callGeminiWithText(extractedText, include_details !== false, GEMINI_API_KEY);
      } else {
        // Scanned PDF — fall back to Gemini Vision with image
        console.log("No text found in PDF, trying Gemini Vision...");
        result = await callGeminiWithImage(file_base64, "application/pdf", include_details !== false, GEMINI_API_KEY);
      }
    } else {
      // Image: send directly to Gemini Vision
      console.log(`Processing image (${file_type}) with Gemini Vision...`);
      result = await callGeminiWithImage(file_base64, file_type, include_details !== false, GEMINI_API_KEY);
    }

    const totalWords = result.chapters.reduce((sum, ch) => sum + ch.words.length, 0);
    console.log(`Extraction complete: ${totalWords} words in ${result.chapters.length} chapters`);
    return res.json({ ...result, total_words: totalWords });
  } catch (error) {
    console.error("extract-vocabulary error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return res.status(500).json({ error: message });
  }
}
