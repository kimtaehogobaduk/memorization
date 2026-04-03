import { supabase } from "@/integrations/supabase/client";
import { localStorageService } from "@/services/localStorageService";
import { getLocalSettings } from "@/utils/localVocabHelper";

export const syncLocalDataToSupabase = async (userId: string) => {
  const localVocabs = localStorageService.getVocabularies();
  if (localVocabs.length === 0) return;

  let syncedCount = 0;

  for (const vocab of localVocabs) {
    try {
      // Create vocabulary in Supabase
      const { data: newVocab, error: vocabError } = await supabase
        .from("vocabularies")
        .insert({
          name: vocab.name,
          description: vocab.description,
          language: vocab.language,
          user_id: userId,
        })
        .select()
        .single();

      if (vocabError || !newVocab) continue;

      // Get local words for this vocabulary
      const localWords = localStorageService.getWordsByVocabulary(vocab.id);
      
      if (localWords.length > 0) {
        const wordsToInsert = localWords.map((w, index) => ({
          vocabulary_id: newVocab.id,
          word: w.word,
          meaning: w.meaning,
          example: w.example,
          note: w.note,
          part_of_speech: w.part_of_speech,
          order_index: w.order_index ?? index,
        }));

        await supabase.from("words").insert(wordsToInsert);
      }

      // Delete local vocab after successful sync
      localStorageService.deleteVocabulary(vocab.id);
      syncedCount++;
    } catch (error) {
      console.error("Error syncing vocabulary:", vocab.name, error);
    }
  }

  // Sync settings
  try {
    const localSettings = getLocalSettings();
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_settings").insert({
        user_id: userId,
        answer_reveal_delay: localSettings.answer_reveal_delay,
        auto_play_audio: localSettings.auto_play_audio,
        quiz_font_size: localSettings.quiz_font_size,
      });
    }
  } catch (error) {
    console.error("Error syncing settings:", error);
  }

  return syncedCount;
};
