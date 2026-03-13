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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!OPENROUTER_API_KEY && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY 또는 GEMINI_API_KEY가 설정되어 있지 않습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { file_base64, file_type, include_details } = await req.json();

    if (!file_base64 || !file_type) {
      return new Response(
        JSON.stringify({ error: "file_base64 and file_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mediaType = file_type.startsWith("image/")
      ? file_type
      : file_type === "application/pdf"
      ? "application/pdf"
      : "image/png";

    const detailsPrompt = include_details
      ? `For each word, also extract or generate:
- "meaning": Korean meaning/definition (한국어 뜻)
- "example": example sentence if available
- "part_of_speech": part of speech (품사, in Korean like 명사, 동사, 형용사)
- "pronunciation": pronunciation guide
- "synonyms": comma-separated synonyms if available
- "antonyms": comma-separated antonyms if available  
- "derivatives": array of {word, meaning} for derivative words if available`
      : `Only extract the word itself. Do NOT include meanings, examples, or other details.`;

    const systemPrompt = `You are a vocabulary extraction expert. You analyze images and documents of vocabulary lists/word books and extract structured data.

CRITICAL RULES:
1. Extract ALL English words from the document.
2. If the document has sections like "Day 1", "Day 2", "Unit 1", "Chapter 1", "Part 1", etc., group words into chapters accordingly.
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
          "word": "example"${include_details ? `,
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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://memorization.lovable.app",
        "X-Title": "Memorization App",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${file_base64}`,
                },
              },
              {
                type: "text",
                text: "이 단어장/문서에서 모든 영어 단어를 추출해주세요. Day나 Unit 등의 구분이 있으면 챕터로 나눠주세요.",
              },
            ],
          },
        ],
        max_tokens: 65000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API 크레딧이 부족합니다. OpenRouter 계정을 확인해주세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI 처리 실패 (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response with robust extraction
    let result: ExtractionResult;
    try {
      let jsonStr = content.trim();
      
      // Remove markdown fences
      jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      
      // Find JSON object boundaries
      const jsonStart = jsonStr.indexOf("{");
      if (jsonStart === -1) throw new Error("No JSON object found");
      const jsonEnd = jsonStr.lastIndexOf("}");
      if (jsonEnd === -1) throw new Error("Incomplete JSON");
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      
      try {
        result = JSON.parse(jsonStr);
      } catch (_e) {
        // Fix common issues: trailing commas, control characters
        jsonStr = jsonStr
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]")
          .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : "");
        
        try {
          result = JSON.parse(jsonStr);
        } catch (_e2) {
          // Try to balance unclosed brackets (truncated response)
          let openBraces = 0, openBrackets = 0;
          for (const c of jsonStr) {
            if (c === '{') openBraces++;
            else if (c === '}') openBraces--;
            else if (c === '[') openBrackets++;
            else if (c === ']') openBrackets--;
          }
          // Remove trailing comma before closing
          jsonStr = jsonStr.replace(/,\s*$/, "");
          jsonStr += "]".repeat(Math.max(0, openBrackets)) + "}".repeat(Math.max(0, openBraces));
          result = JSON.parse(jsonStr);
        }
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "AI 응답을 파싱할 수 없습니다. 다시 시도해주세요." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and clean the result
    if (!result.chapters || !Array.isArray(result.chapters)) {
      result = { vocabulary_name: "", chapters: [{ name: "전체 단어", words: [] }] };
    }

    // Ensure all chapters have valid words
    result.chapters = result.chapters.map((ch) => ({
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
    }));

    // Remove empty chapters
    result.chapters = result.chapters.filter((ch) => ch.words.length > 0);

    const totalWords = result.chapters.reduce((sum, ch) => sum + ch.words.length, 0);

    return new Response(
      JSON.stringify({ ...result, total_words: totalWords }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-vocabulary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
