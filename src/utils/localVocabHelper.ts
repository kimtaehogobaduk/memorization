import { localStorageService } from "@/services/localStorageService";

export const isLocalVocab = (id: string | undefined): boolean => {
  return !!id && id.startsWith("local_");
};

export const loadLocalWords = (vocabId: string, fields?: string[]) => {
  const words = localStorageService.getWordsByVocabulary(vocabId);
  return words.map((w, index) => ({
    id: w.id,
    word: w.word,
    meaning: w.meaning,
    example: w.example || null,
    note: w.note || null,
    part_of_speech: w.part_of_speech || null,
    order_index: w.order_index ?? index,
    synonyms: null,
    antonyms: null,
    frequency: null,
    difficulty: null,
    derivatives: null,
    image_url: null,
    chapter_id: null,
  }));
};

export const loadLocalVocabulary = (id: string) => {
  return localStorageService.getVocabulary(id);
};

// Load settings from localStorage for non-logged-in users
const SETTINGS_KEY = "local_user_settings";

export interface LocalSettings {
  answer_reveal_delay: number;
  auto_play_audio: boolean;
  quiz_font_size: string;
  theme: string;
  ai_auto_meaning: boolean;
  smart_review: boolean;
}

const defaultSettings: LocalSettings = {
  answer_reveal_delay: 2.0,
  auto_play_audio: false,
  quiz_font_size: "medium",
  theme: "system",
  ai_auto_meaning: false,
  smart_review: false,
};

export const getLocalSettings = (): LocalSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export const saveLocalSettings = (settings: Partial<LocalSettings>) => {
  const current = getLocalSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
};
