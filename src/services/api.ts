import { supabase } from "@/integrations/supabase/client";

const API_BASE = "/api";

async function apiPost<T = unknown>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPostAuth<T = unknown>(endpoint: string, body: unknown, authToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGetAuth<T = unknown>(endpoint: string, authToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const apiGetWordMeaning = async (word: string, partOfSpeech?: string) => {
  const { data, error } = await supabase.functions.invoke("get-word-meaning", {
    body: { word, part_of_speech: partOfSpeech || "" },
  });
  if (error) throw new Error(error.message || "AI 뜻 가져오기 실패");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export const apiValidateMeaning = async (word: string, userAnswer: string, correctMeaning: string) => {
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

export const apiGenerateAIQuiz = async (words: unknown[], difficulty: string, customRequest: string) => {
  const { data, error } = await supabase.functions.invoke("generate-ai-quiz", {
    body: { words, difficulty, customRequest },
  });
  if (error) throw new Error(error.message || "AI 퀴즈 생성 실패");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export const apiExtractVocabulary = async (file_base64: string, file_type: string, include_details: boolean) => {
  const { data, error } = await supabase.functions.invoke("extract-vocabulary", {
    body: { file_base64, file_type, include_details },
  });
  if (error) throw new Error(error.message || "파일 추출 실패");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export const apiGenerateVocabularies = (count: number, startIndex: number, authToken: string) =>
  apiPostAuth<{ success: boolean; processed?: number; error?: string }>("/generate-vocabularies", { count, startIndex }, authToken);

export const apiDeleteUser = (userId: string, authToken: string) =>
  apiPostAuth("/delete-user", { userId }, authToken);

export const apiGetAdminUsers = (authToken: string) =>
  apiGetAuth<{ users: AdminUser[] }>("/admin/users", authToken);

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
