// Local storage service for vocabularies when user is not logged in

export interface LocalVocabulary {
  id: string;
  name: string;
  description: string | null;
  language: string;
  created_at: string;
  user_id: "local";
}

export interface LocalWord {
  id: string;
  vocabulary_id: string;
  word: string;
  meaning: string;
  example: string | null;
  note: string | null;
  part_of_speech: string | null;
  order_index: number;
  created_at: string;
}

const VOCABULARIES_KEY = "local_vocabularies";
const WORDS_KEY = "local_words";

export const localStorageService = {
  // Vocabularies
  getVocabularies(): LocalVocabulary[] {
    const data = localStorage.getItem(VOCABULARIES_KEY);
    return data ? JSON.parse(data) : [];
  },

  getVocabulary(id: string): LocalVocabulary | null {
    const vocabs = this.getVocabularies();
    return vocabs.find(v => v.id === id) || null;
  },

  saveVocabulary(vocab: Omit<LocalVocabulary, "id" | "created_at" | "user_id">): LocalVocabulary {
    const vocabs = this.getVocabularies();
    const newVocab: LocalVocabulary = {
      ...vocab,
      id: `local_${Date.now()}`,
      created_at: new Date().toISOString(),
      user_id: "local",
    };
    vocabs.push(newVocab);
    localStorage.setItem(VOCABULARIES_KEY, JSON.stringify(vocabs));
    return newVocab;
  },

  updateVocabulary(id: string, updates: Partial<LocalVocabulary>): void {
    const vocabs = this.getVocabularies();
    const index = vocabs.findIndex(v => v.id === id);
    if (index !== -1) {
      vocabs[index] = { ...vocabs[index], ...updates };
      localStorage.setItem(VOCABULARIES_KEY, JSON.stringify(vocabs));
    }
  },

  deleteVocabulary(id: string): void {
    const vocabs = this.getVocabularies();
    const filtered = vocabs.filter(v => v.id !== id);
    localStorage.setItem(VOCABULARIES_KEY, JSON.stringify(filtered));
    
    // Also delete associated words
    const words = this.getWords();
    const filteredWords = words.filter(w => w.vocabulary_id !== id);
    localStorage.setItem(WORDS_KEY, JSON.stringify(filteredWords));
  },

  // Words
  getWords(): LocalWord[] {
    const data = localStorage.getItem(WORDS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getWordsByVocabulary(vocabularyId: string): LocalWord[] {
    const words = this.getWords();
    return words.filter(w => w.vocabulary_id === vocabularyId);
  },

  saveWords(words: Omit<LocalWord, "id" | "created_at">[]): LocalWord[] {
    const existingWords = this.getWords();
    const newWords: LocalWord[] = words.map(w => ({
      ...w,
      id: `local_word_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString(),
    }));
    const allWords = [...existingWords, ...newWords];
    localStorage.setItem(WORDS_KEY, JSON.stringify(allWords));
    return newWords;
  },

  updateWord(id: string, updates: Partial<LocalWord>): void {
    const words = this.getWords();
    const index = words.findIndex(w => w.id === id);
    if (index !== -1) {
      words[index] = { ...words[index], ...updates };
      localStorage.setItem(WORDS_KEY, JSON.stringify(words));
    }
  },

  deleteWord(id: string): void {
    const words = this.getWords();
    const filtered = words.filter(w => w.id !== id);
    localStorage.setItem(WORDS_KEY, JSON.stringify(filtered));
  },
};
