import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word } = await req.json();
    
    if (!word || word.trim().length === 0) {
      return new Response(
        JSON.stringify({ meaning: '', example: '', part_of_speech: '', pronunciation: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a dictionary assistant. Given a word (usually English), provide comprehensive information about it in Korean.`
          },
          {
            role: 'user',
            content: `Provide detailed dictionary information for: "${word.trim()}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_word_info",
              description: "Provide comprehensive dictionary information for a word",
              parameters: {
                type: "object",
                properties: {
                  meaning: {
                    type: "string",
                    description: "Korean meaning(s) of the word. Include all common meanings separated by comma. Example: '사과, 사과나무' or '달리다, 운영하다, 작동하다'"
                  },
                  example: {
                    type: "string",
                    description: "A natural English example sentence using the word. Keep it short and educational."
                  },
                  part_of_speech: {
                    type: "string",
                    description: "Part of speech in Korean. Options: 명사, 동사, 형용사, 부사, 전치사, 접속사, 감탄사, 대명사"
                  },
                  pronunciation: {
                    type: "string",
                    description: "IPA phonetic pronunciation in dictionary format. Example: 'happy' → '/ˈhæp.i/', 'beautiful' → '/ˈbjuː.tɪ.fəl/', 'apple' → '/ˈæp.əl/'. Use standard IPA symbols."
                  }
                },
                required: ["meaning", "example", "part_of_speech", "pronunciation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_word_info" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', meaning: '', example: '', part_of_speech: '', pronunciation: '' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const wordInfo = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({
            meaning: wordInfo.meaning || '',
            example: wordInfo.example || '',
            part_of_speech: wordInfo.part_of_speech || '',
            pronunciation: wordInfo.pronunciation || ''
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('Error parsing tool call response:', parseError);
      }
    }

    // Fallback to regular content if tool call parsing fails
    return new Response(
      JSON.stringify({ meaning: '', example: '', part_of_speech: '', pronunciation: '' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-word-meaning:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, meaning: '', example: '', part_of_speech: '', pronunciation: '' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
