import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedWord {
  word: string;
  meaning?: string;
  example?: string;
  part_of_speech?: string;
  pronunciation?: string;
  synonyms?: string;
  antonyms?: string;
  derivatives?: { word: string; meaning: string }[];
}

interface ExtractedChapter {
  name: string;
  words: ExtractedWord[];
}

interface ExtractionResult {
  vocabulary_name?: string;
  chapters: ExtractedChapter[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── PDF.co: extract text from uploaded file ──────────────────────────
async function extractTextViaPdfCo(
  fileBase64: string,
  fileType: string,
  apiKey: string
): Promise<string> {
  // Step 1: Upload to PDF.co
  const uploadRes = await fetch("https://api.pdf.co/v1/file/upload/base64", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: fileBase64 }),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`PDF.co upload failed (${uploadRes.status}): ${err}`);
  }

  const uploadData = await uploadRes.json();
  if (uploadData.error) throw new Error(`PDF.co upload error: ${uploadData.message || uploadData.error}`);
  const fileUrl = uploadData.url;
  if (!fileUrl) throw new Error("PDF.co did not return a file URL");

  // Step 2: Choose extraction endpoint based on file type
  const isPdf = fileType === "application/pdf";

  const actualEndpoint = isPdf
    ? "https://api.pdf.co/v1/pdf/convert/to/text"
    : "https://api.pdf.co/v1/pdf/ocr";

  const convertBody: Record<string, unknown> = {
    url: fileUrl,
    inline: true,
    ...(isPdf ? {} : { lang: "eng" }),
  };

  const convertRes = await fetch(actualEndpoint, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(convertBody),
  });

  if (!convertRes.ok) {
    const err = await convertRes.text();
    throw new Error(`PDF.co conversion failed (${convertRes.status}): ${err}`);
  }

  const convertData = await convertRes.json();
  if (convertData.error) throw new Error(`PDF.co conversion error: ${convertData.message || convertData.error}`);

  // The text is returned in the 'body' field when inline=true
  let extractedText = convertData.body || convertData.text || "";

  // If body is a URL, fetch the text
  if (!extractedText && convertData.url) {
    const textRes = await fetch(convertData.url);
    extractedText = await textRes.text();
  }

  return extractedText;
}

// ── Gemini: generate structured vocabulary from text ───────────────
async function callGemini(
  text: string,
  includeDetails: boolean,
  apiKey: string
): Promise<ExtractionResult> {
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
2. If the text has sections like "Day 1", "Day 2", "Unit 1", "Chapter 1", "Part 1", etc., group words into chapters accordingly.
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

  // Truncate text to stay within token limits
  const truncatedText = text.slice(0, 60000);

  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n다음은 단어장/문서의 텍스트입니다. 모든 영어 단어를 추출해주세요.\n\n${truncatedText}`,
              }],
            }],
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
          console.error(`Gemini ${model} attempt ${attempt + 1} failed:`, res.status, errText);
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
        console.error(`Gemini ${model} attempt ${attempt + 1} error:`, err);
        await sleep(1000);
      }
    }
  }

  throw new Error("모든 AI 모델에서 추출에 실패했습니다.");
}

// ── JSON parsing with repair ─────────────────────────────────────────
function parseAIResponse(content: string): ExtractionResult {
  let jsonStr = content.trim();
  jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const jsonStart = jsonStr.indexOf("{");
  if (jsonStart === -1) throw new Error("No JSON object found");
  jsonStr = jsonStr.substring(jsonStart);

  const lastBrace = jsonStr.lastIndexOf("}");
  if (lastBrace !== -1) jsonStr = jsonStr.substring(0, lastBrace + 1);

  const tryParse = (v: string) => JSON.parse(v);

  let parsed: any;
  try {
    parsed = tryParse(jsonStr);
  } catch {
    let repaired = jsonStr
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, (ch) =>
        ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
      );

    try {
      parsed = tryParse(repaired);
    } catch {
      let openBraces = 0, openBrackets = 0;
      for (const char of repaired) {
        if (char === "{") openBraces++;
        else if (char === "}") openBraces--;
        else if (char === "[") openBrackets++;
        else if (char === "]") openBrackets--;
      }
      repaired = repaired.replace(/,\s*$/, "");
      repaired += "]".repeat(Math.max(0, openBrackets));
      repaired += "}".repeat(Math.max(0, openBraces));
      parsed = tryParse(repaired);
    }
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

  return {
    vocabulary_name: parsed.vocabulary_name || "",
    chapters: parsed.chapters,
  };
}

// ── Main handler ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PDF_CO_API_KEY = Deno.env.get("PDF_CO_API_KEY");
    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");

    if (!PDF_CO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PDF_CO_API_KEY가 설정되어 있지 않습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!CEREBRAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CEREBRAS_API_KEY가 설정되어 있지 않습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { file_base64, file_type, include_details } = await req.json();

    if (!file_base64 || !file_type) {
      return new Response(
        JSON.stringify({ error: "file_base64와 file_type이 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Extract text via PDF.co
    console.log("Extracting text via PDF.co...");
    const extractedText = await extractTextViaPdfCo(file_base64, file_type, PDF_CO_API_KEY);

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "파일에서 텍스트를 추출할 수 없습니다. 다른 파일을 시도해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${extractedText.length} chars, sending to Cerebras...`);

    // Step 2: Structure vocabulary via Cerebras
    const result = await callCerebras(extractedText, include_details !== false, CEREBRAS_API_KEY);

    const totalWords = result.chapters.reduce((sum, ch) => sum + ch.words.length, 0);

    return new Response(
      JSON.stringify({ ...result, total_words: totalWords }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-vocabulary error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
