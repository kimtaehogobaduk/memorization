import { supabase } from "@/integrations/supabase/client";

async function postApi<T = unknown>(endpoint: string, body: unknown, supabaseFn?: string): Promise<T> {
  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data?.error) return data as T;
    }
  } catch (e) {
    console.warn(`Local /api/${endpoint} failed, checking fallback:`, e);
  }

  if (supabaseFn) {
    const { data, error } = await supabase.functions.invoke(supabaseFn, { body });
    if (error) throw new Error(error.message || `${supabaseFn} 실패`);
    const record = data as Record<string, unknown> | null;
    if (record?.error) throw new Error(String(record.error));
    return data as T;
  }
  throw new Error(`${endpoint} 실패`);
}

export const apiGetWordMeaning = async (word: string, partOfSpeech?: string) => {
  return postApi("get-word-meaning", { word, part_of_speech: partOfSpeech || "" }, "get-word-meaning");
};

export const apiValidateMeaning = async (
  word: string,
  userAnswer: string,
  correctMeaning: string,
) => {
  return postApi("validate-meaning", { word, userAnswer, correctMeaning }, "validate-meaning");
};

export const apiGradeSentence = async (word: string, meaning: string, sentence: string) => {
  return postApi<{ correct: boolean; reason: string; fallback?: boolean; error?: boolean }>(
    "grade-sentence",
    { word, meaning, sentence },
    "grade-sentence",
  );
};

export const apiGenerateAIQuiz = async (
  words: unknown[],
  difficulty: string,
  customRequest: string,
) => {
  return postApi("generate-ai-quiz", { words, difficulty, customRequest }, "generate-ai-quiz");
};

export const apiExtractVocabulary = async (
  file_base64: string,
  file_type: string,
  include_details: boolean,
) => {
  return postApi("extract-vocabulary", { file_base64, file_type, include_details }, "extract-vocabulary");
};

export const apiGenerateVocabularies = async (count: number, startIndex: number) => {
  return postApi<{ success: boolean; processed?: number; error?: string }>(
    "generate-vocabularies",
    { count, startIndex },
    "generate-vocabularies",
  );
};

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    full_name: string | null;
    username: string | null;
  };
  role: "admin" | "elder" | "user";
}
