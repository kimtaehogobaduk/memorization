async function apiPost<T = unknown>(path: string, body: unknown): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      return { data: null, error: new Error(json?.error || `Request failed: ${response.status}`) };
    }
    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export const api = {
  getWordMeaning: (body: { word: string }) => apiPost("/get-word-meaning", body),
  generateAiQuiz: (body: unknown) => apiPost("/generate-ai-quiz", body),
  validateMeaning: (body: unknown) => apiPost("/validate-meaning", body),
  extractVocabulary: (body: unknown) => apiPost("/extract-vocabulary", body),
  generateVocabularies: (body: unknown) => apiPost("/generate-vocabularies", body),
};
