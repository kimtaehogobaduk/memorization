import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const themes = [
  "TOEIC Essential Business Vocabulary",
  "TOEFL Academic Words",
  "IELTS Speaking Topics",
  "Daily Conversation Basics",
  "Travel English - Airport",
  "Travel English - Hotel",
  "Travel English - Restaurant",
  "Business Email Writing",
  "Job Interview Expressions",
  "Presentation Skills",
  "Meeting Vocabulary",
  "Negotiation Terms",
  "Marketing & Advertising",
  "Finance & Accounting",
  "IT & Technology",
  "Medical Terms",
  "Legal English",
  "Academic Writing",
  "Scientific Research",
  "Engineering Terms",
  "Food & Cooking",
  "Sports & Fitness",
  "Fashion & Beauty",
  "Art & Culture",
  "Music Terminology",
  "Movie & Entertainment",
  "Social Media English",
  "News & Current Affairs",
  "Environmental Issues",
  "Politics & Government",
  "Education System",
  "Housing & Real Estate",
  "Banking & Investment",
  "Shopping & Retail",
  "Transportation",
  "Weather & Climate",
  "Health & Wellness",
  "Emotions & Feelings",
  "Personality Traits",
  "Family & Relationships",
  "Hobbies & Interests",
  "Nature & Wildlife",
  "Geography Terms",
  "History Vocabulary",
  "Philosophy Concepts",
  "Psychology Terms",
  "Sociology Basics",
  "Economics Fundamentals",
  "Mathematics Terms",
  "Physics Concepts",
  "Chemistry Vocabulary",
  "Biology Terms",
  "Astronomy & Space",
  "Computer Science",
  "Software Development",
  "Web Design Terms",
  "Digital Marketing",
  "Photography",
  "Architecture",
  "Interior Design",
  "Gardening & Plants",
  "Pet Care",
  "Automotive Terms",
  "Aviation English",
  "Maritime Vocabulary",
  "Agriculture",
  "Construction",
  "Manufacturing",
  "Retail Management",
  "Customer Service",
  "Human Resources",
  "Project Management",
  "Quality Assurance",
  "Supply Chain",
  "Logistics",
  "Insurance Terms",
  "Tax & Accounting",
  "Startup Vocabulary",
  "E-commerce",
  "Freelancing",
  "Remote Work",
  "Time Management",
  "Productivity Tips",
  "Goal Setting",
  "Problem Solving",
  "Critical Thinking",
  "Communication Skills",
  "Public Speaking",
  "Writing Skills",
  "Reading Comprehension",
  "Listening Skills",
  "Pronunciation Guide",
  "Idioms & Phrases",
  "Phrasal Verbs",
  "Slang & Colloquialisms",
  "Formal vs Informal",
  "British vs American",
  "Common Mistakes",
  "False Friends",
  "Confusing Words",
  "Synonyms & Antonyms",
];

const MODELS = ["llama3.1-8b"];
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
    .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\t" ? ch : "")
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

async function generateWordsWithCerebras(theme: string, apiKey: string): Promise<any[]> {
  const systemPrompt = `You are an expert English teacher creating vocabulary lists. Generate EXACTLY 100 words with Korean meanings, examples, and parts of speech. Return ONLY valid JSON array without any markdown formatting or code blocks.`;
  const userPrompt = `Create a vocabulary list for "${theme}" with exactly 100 words. Each word should include:
- word (English word)
- meaning (Korean translation)
- example (English example sentence)
- part_of_speech (noun, verb, adjective, adverb, etc.)

Return ONLY a JSON array in this exact format:
[{"word":"example","meaning":"예시","example":"This is an example.","part_of_speech":"noun"}]`;

  let lastError: Error | null = null;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[${model}] generating words for "${theme}", attempt ${attempt + 1}`);
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 8192,
          }),
        });

        if (response.status === 429) {
          await response.text();
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (response.status >= 500) {
          await response.text();
          await sleep(1500 * (attempt + 1));
          continue;
        }
        if (!response.ok) {
          const t = await response.text();
          throw new Error(`[${model}] ${response.status}: ${t}`);
        }

        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty response");

        const parsed = repairAndParseJSON(content);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("Invalid words format");
        }

        console.log(`[${model}] successfully generated ${parsed.length} words for "${theme}"`);
        return parsed;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[${model}] attempt ${attempt + 1}: ${lastError.message}`);
      }
    }
  }

  throw lastError ?? new Error("All models failed");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!CEREBRAS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { count = 10, startIndex = 0 } = await req.json();
    const themesToGenerate = themes.slice(startIndex, startIndex + count);

    console.log(`Generating ${themesToGenerate.length} vocabularies starting from index ${startIndex}`);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (!profiles || profiles.length === 0) {
      throw new Error("No user profile found");
    }

    const systemUserId = profiles[0].id;
    const results = [];

    for (const theme of themesToGenerate) {
      try {
        console.log(`Generating vocabulary for: ${theme}`);
        const words = await generateWordsWithCerebras(theme, CEREBRAS_API_KEY);

        const { data: vocab, error: vocabError } = await supabase
          .from('vocabularies')
          .insert({
            name: theme,
            description: `A comprehensive list of ${theme.toLowerCase()} vocabulary with 100 essential words`,
            language: 'english',
            user_id: systemUserId,
            is_public: true,
          })
          .select()
          .single();

        if (vocabError) {
          console.error(`Error creating vocabulary ${theme}:`, vocabError);
          continue;
        }

        const wordsToInsert = words.slice(0, 100).map((word: any, index: number) => ({
          vocabulary_id: vocab.id,
          word: word.word || '',
          meaning: word.meaning || '',
          example: word.example || null,
          part_of_speech: word.part_of_speech || null,
          order_index: index,
        }));

        const { error: wordsError } = await supabase
          .from('words')
          .insert(wordsToInsert);

        if (wordsError) {
          console.error(`Error inserting words for ${theme}:`, wordsError);
          await supabase.from('vocabularies').delete().eq('id', vocab.id);
          continue;
        }

        console.log(`Successfully created vocabulary: ${theme} with ${wordsToInsert.length} words`);
        results.push({ theme, vocabularyId: vocab.id, wordCount: wordsToInsert.length, success: true });
      } catch (error) {
        console.error(`Error processing ${theme}:`, error);
        results.push({ theme, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Error in generate-vocabularies:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
