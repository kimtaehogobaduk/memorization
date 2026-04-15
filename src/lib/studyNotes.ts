const FAVORITES_KEY = "study_favorites";

export interface FavoriteWord {
  id: string;
  word: string;
  meaning: string;
  vocabularyId: string | null;
  addedAt: string;
}

const readFavorites = (): FavoriteWord[] => {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const writeFavorites = (favorites: FavoriteWord[]) => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

export const studyNotes = {
  getFavorites(): FavoriteWord[] {
    return readFavorites();
  },
  isFavorite(wordId: string): boolean {
    return readFavorites().some((item) => item.id === wordId);
  },
  toggleFavorite(word: Omit<FavoriteWord, "addedAt">): boolean {
    const favorites = readFavorites();
    const exists = favorites.some((item) => item.id === word.id);
    const next = exists
      ? favorites.filter((item) => item.id !== word.id)
      : [...favorites, { ...word, addedAt: new Date().toISOString() }];
    writeFavorites(next);
    return !exists;
  },
  removeFavorite(wordId: string) {
    writeFavorites(readFavorites().filter((item) => item.id !== wordId));
  },
  clearFavorites() {
    writeFavorites([]);
  },
};
