import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vocabulary themes for diversity
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { count = 10, startIndex = 0 } = await req.json();
    const themesToGenerate = themes.slice(startIndex, startIndex + count);

    console.log(`Generating ${themesToGenerate.length} vocabularies starting from index ${startIndex}`);

    // Create a system user for public vocabularies
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

        // Call Lovable AI to generate words
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are an expert English teacher creating vocabulary lists. Generate EXACTLY 100 words with Korean meanings, examples, and parts of speech. Return ONLY valid JSON array without any markdown formatting or code blocks."
              },
              {
                role: "user",
                content: `Create a vocabulary list for "${theme}" with exactly 100 words. Each word should include:
- word (English word)
- meaning (Korean translation)
- example (English example sentence)
- part_of_speech (noun, verb, adjective, adverb, etc.)

Return ONLY a JSON array in this exact format:
[{"word":"example","meaning":"예시","example":"This is an example.","part_of_speech":"noun"}]`
              }
            ],
          }),
        });

        if (!response.ok) {
          console.error(`AI API error for ${theme}:`, response.status);
          continue;
        }

        const aiData = await response.json();
        const content = aiData.choices[0].message.content;
        
        // Clean up the content to extract JSON
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.slice(7);
        }
        if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.slice(3);
        }
        if (cleanedContent.endsWith('```')) {
          cleanedContent = cleanedContent.slice(0, -3);
        }
        cleanedContent = cleanedContent.trim();

        const words = JSON.parse(cleanedContent);

        if (!Array.isArray(words) || words.length === 0) {
          console.error(`Invalid words format for ${theme}`);
          continue;
        }

        // Create vocabulary
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

        // Insert words in batches
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
        results.push({
          theme,
          vocabularyId: vocab.id,
          wordCount: wordsToInsert.length,
          success: true
        });

      } catch (error) {
        console.error(`Error processing ${theme}:`, error);
        results.push({
          theme,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in generate-vocabularies:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
