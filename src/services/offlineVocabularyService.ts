import { supabase } from "@/integrations/supabase/client";

export type OfflineTable = "vocabularies" | "words" | "chapters" | "study_progress";

export interface OfflineMutation {
  table: OfflineTable;
  operation: "insert" | "update" | "delete";
  payload: Record<string, any>;
  match?: Record<string, any>;
}

interface OfflineSnapshot {
  userId: string;
  vocabularies: Record<string, any>[];
  words: Record<string, any>[];
  chapters: Record<string, any>[];
  progress: Record<string, any>[];
  settings: Record<string, any> | null;
  pending: OfflineMutation[];
  syncedAt: string | null;
}

const DB_NAME = "amgijunsek-offline";
const STORE_NAME = "snapshots";
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;
const syncInFlight = new Map<string, Promise<void>>();

const emptySnapshot = (userId: string): OfflineSnapshot => ({
  userId,
  vocabularies: [],
  words: [],
  chapters: [],
  progress: [],
  settings: null,
  pending: [],
  syncedAt: null,
});

const openDatabase = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

const readSnapshot = async (userId: string): Promise<OfflineSnapshot> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => resolve(request.result || emptySnapshot(userId));
    request.onerror = () => reject(request.error);
  });
};

const writeSnapshot = async (snapshot: OfflineSnapshot) => {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(snapshot);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const updateSnapshot = async (userId: string, updater: (snapshot: OfflineSnapshot) => void) => {
  const snapshot = await readSnapshot(userId);
  updater(snapshot);
  await writeSnapshot(snapshot);
  return snapshot;
};

const isNetworkFailure = (error: any) => {
  if (!navigator.onLine) return true;
  const message = String(error?.message || error || "").toLowerCase();
  return error instanceof TypeError || message.includes("failed to fetch") || message.includes("network") || message.includes("load failed");
};

const runMutation = async ({ table, operation, payload, match }: OfflineMutation) => {
  const builder = supabase.from(table as any) as any;
  const response = operation === "insert"
    ? await builder.upsert(payload)
    : operation === "update"
      ? await builder.update(payload).match(match || {})
      : await builder.delete().match(match || {});
  if (response.error) throw response.error;
};

const applyToCache = (snapshot: OfflineSnapshot, mutation: OfflineMutation) => {
  const { table, operation, payload, match } = mutation;
  const collection = table === "vocabularies"
    ? snapshot.vocabularies
    : table === "words"
      ? snapshot.words
      : table === "chapters"
        ? snapshot.chapters
        : snapshot.progress;

  if (operation === "insert") {
    const index = collection.findIndex(item => item.id === payload.id);
    if (index >= 0) collection[index] = { ...collection[index], ...payload };
    else collection.push(payload);
    return;
  }

  const matches = (item: Record<string, any>) => Object.entries(match || {}).every(([key, value]) => item[key] === value);
  if (operation === "update") {
    for (let index = 0; index < collection.length; index++) {
      if (matches(collection[index])) collection[index] = { ...collection[index], ...payload };
    }
    return;
  }

  const remaining = collection.filter(item => !matches(item));
  if (table === "vocabularies") {
    const removedIds = collection.filter(matches).map(item => item.id);
    snapshot.vocabularies = remaining;
    snapshot.words = snapshot.words.filter(word => !removedIds.includes(word.vocabulary_id));
    snapshot.chapters = snapshot.chapters.filter(chapter => !removedIds.includes(chapter.vocabulary_id));
  } else if (table === "words") snapshot.words = remaining;
  else if (table === "chapters") snapshot.chapters = remaining;
  else snapshot.progress = remaining;
};

/** Applies a cloud write locally as well, or queues it when the network is unavailable. */
export const mutateVocabularyData = async (userId: string, mutation: OfflineMutation) => {
  if (navigator.onLine) {
    try {
      await runMutation(mutation);
      await updateSnapshot(userId, snapshot => applyToCache(snapshot, mutation));
      return { offline: false };
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
    }
  }

  await updateSnapshot(userId, snapshot => {
    applyToCache(snapshot, mutation);
    snapshot.pending.push(mutation);
  });
  return { offline: true };
};

export const flushPendingMutations = async (userId: string) => {
  const snapshot = await readSnapshot(userId);
  if (!snapshot.pending.length || !navigator.onLine) return;

  for (const mutation of snapshot.pending) {
    try {
      await runMutation(mutation);
      await updateSnapshot(userId, current => {
        const index = current.pending.indexOf(mutation);
        if (index >= 0) current.pending.splice(index, 1);
      });
    } catch (error) {
      if (!isNetworkFailure(error)) console.error("Offline change sync failed:", error);
      break;
    }
  }
};

export const getOfflineVocabularies = async (userId: string) => {
  const snapshot = await readSnapshot(userId);
  return [...snapshot.vocabularies]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map(vocab => ({
      ...vocab,
      words_count: snapshot.words.filter(word => word.vocabulary_id === vocab.id).length,
    }));
};

export const getOfflineVocabularyBundle = async (userId: string, vocabularyId: string) => {
  const snapshot = await readSnapshot(userId);
  const vocabulary = snapshot.vocabularies.find(vocab => vocab.id === vocabularyId);
  if (!vocabulary) return null;
  return {
    vocabulary,
    chapters: snapshot.chapters
      .filter(chapter => chapter.vocabulary_id === vocabularyId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
    words: snapshot.words
      .filter(word => word.vocabulary_id === vocabularyId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
  };
};

export const getOfflineWords = async (userId: string, vocabularyIds: string[]) => {
  const snapshot = await readSnapshot(userId);
  const ids = new Set(vocabularyIds.filter(Boolean));
  return snapshot.words
    .filter(word => ids.has(word.vocabulary_id))
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
};

export const getOfflineChapter = async (userId: string, chapterId: string) => {
  const snapshot = await readSnapshot(userId);
  return snapshot.chapters.find(chapter => chapter.id === chapterId) || null;
};

export const getOfflineProgress = async (userId: string) => {
  const snapshot = await readSnapshot(userId);
  return snapshot.progress;
};

export const getOfflineSettings = async (userId: string) => {
  const snapshot = await readSnapshot(userId);
  return snapshot.settings;
};

export const cacheUserSettings = async (userId: string, settings: Record<string, any>) => {
  await updateSnapshot(userId, snapshot => { snapshot.settings = settings; });
};

export const cacheVocabularyBundle = async (
  userId: string,
  vocabulary: Record<string, any>,
  chapters: Record<string, any>[],
  words: Record<string, any>[],
) => {
  if (vocabulary.user_id !== userId) return;
  await updateSnapshot(userId, snapshot => {
    snapshot.vocabularies = [...snapshot.vocabularies.filter(item => item.id !== vocabulary.id), vocabulary];
    snapshot.chapters = [...snapshot.chapters.filter(item => item.vocabulary_id !== vocabulary.id), ...chapters];
    snapshot.words = [...snapshot.words.filter(item => item.vocabulary_id !== vocabulary.id), ...words];
  });
};

const fetchByVocabularyChunks = async (table: "words" | "chapters", vocabularyIds: string[]) => {
  if (!vocabularyIds.length) return [];
  const rows: Record<string, any>[] = [];
  for (let index = 0; index < vocabularyIds.length; index += 100) {
    const ids = vocabularyIds.slice(index, index + 100);
    const { data, error } = await supabase.from(table).select("*").in("vocabulary_id", ids).limit(100000);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
};

/** Refreshes the complete on-device copy of a signed-in user's own study data. */
export const syncUserVocabularies = async (userId: string) => {
  const existing = syncInFlight.get(userId);
  if (existing) return existing;

  const task = (async () => {
    if (!navigator.onLine) return;
    await flushPendingMutations(userId);
    const pending = (await readSnapshot(userId)).pending;
    if (pending.length) return;

    const { data: vocabularies, error: vocabError } = await supabase
      .from("vocabularies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (vocabError) throw vocabError;

    const ids = (vocabularies || []).map(vocab => vocab.id);
    const [words, chapters, progressResult, settingsResult] = await Promise.all([
      fetchByVocabularyChunks("words", ids),
      fetchByVocabularyChunks("chapters", ids),
      supabase.from("study_progress").select("*").eq("user_id", userId).limit(100000),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (progressResult.error) throw progressResult.error;

    await writeSnapshot({
      userId,
      vocabularies: vocabularies || [],
      words,
      chapters,
      progress: progressResult.data || [],
      settings: settingsResult.data || null,
      pending: [],
      syncedAt: new Date().toISOString(),
    });
  })().finally(() => syncInFlight.delete(userId));

  syncInFlight.set(userId, task);
  return task;
};

export const scheduleOfflineSync = (userId: string) => {
  if (!navigator.onLine || syncInFlight.has(userId)) return;
  window.setTimeout(() => {
    syncUserVocabularies(userId).catch(error => console.error("Offline snapshot sync failed:", error));
  }, 0);
};
