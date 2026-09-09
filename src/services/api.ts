import { supabase } from "@/integrations/supabase/client";

export const apiGetWordMeaning = async (word: string, partOfSpeech?: string) => {
  const { data, error } = await supabase.functions.invoke("get-word-meaning", {
    body: { word, part_of_speech: partOfSpeech || "" },
  });
  if (error) throw new Error(error.message || "AI 뜻 가져오기 실패");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export const apiValidateMeaning = async (
  word: string,
  userAnswer: string,
  correctMeaning: string,
) => {
  const { data, error } = await supabase.functions.invoke("validate-meaning", {
    body: { word, userAnswer, correctMeaning },
  });
  if (error) throw new Error(error.message || "채점 실패");
  return data;
};

export const apiGradeSentence = async (word: string, meaning: string, sentence: string) => {
  const { data, error } = await supabase.functions.invoke("grade-sentence", {
    body: { word, meaning, sentence },
  });
  if (error) throw new Error(error.message || "채점 실패");
  return data as { correct: boolean; reason: string; fallback?: boolean; error?: boolean };
};

export const apiGenerateAIQuiz = async (
  words: unknown[],
  difficulty: string,
  customRequest: string,
) => {
  const { data, error } = await supabase.functions.invoke("generate-ai-quiz", {
    body: { words, difficulty, customRequest },
  });
  if (error) throw new Error(error.message || "AI 퀴즈 생성 실패");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export const apiExtractVocabulary = async (
  file_base64: string,
  file_type: string,
  include_details: boolean,
) => {
  const { data, error } = await supabase.functions.invoke("extract-vocabulary", {
    body: { file_base64, file_type, include_details },
  });
  if (error) throw new Error(error.message || "파일 추출 실패");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export const apiGenerateVocabularies = async (count: number, startIndex: number) => {
  const { data, error } = await supabase.functions.invoke("generate-vocabularies", {
    body: { count, startIndex },
  });
  if (error) throw new Error(error.message || "단어장 생성 실패");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { success: boolean; processed?: number; error?: string };
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
