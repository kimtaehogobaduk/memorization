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

export const apiGetWordMeaning = (word: string) =>
  apiPost("/get-word-meaning", { word });

export const apiValidateMeaning = (word: string, userAnswer: string, correctMeaning: string) =>
  apiPost("/validate-meaning", { word, userAnswer, correctMeaning });

export const apiGenerateAIQuiz = (words: unknown[], difficulty: string, customRequest: string) =>
  apiPost("/generate-ai-quiz", { words, difficulty, customRequest });

export const apiExtractVocabulary = (file_base64: string, file_type: string, include_details: boolean) =>
  apiPost("/extract-vocabulary", { file_base64, file_type, include_details });

export const apiGenerateVocabularies = (count: number, startIndex: number) =>
  apiPost<{ success: boolean; processed?: number; error?: string }>("/generate-vocabularies", { count, startIndex });

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
