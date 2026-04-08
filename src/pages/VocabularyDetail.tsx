import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, FileText, Brain, Play, Volume2, Star, Plus, Trash2, ArrowRightLeft, CheckSquare, X, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalVocab, loadLocalWords, loadLocalVocabulary } from "@/utils/localVocabHelper";
import { localStorageService } from "@/services/localStorageService";
import { studyNotes } from "@/lib/studyNotes";
import { WordManager } from "@/components/WordManager";

interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  note: string | null;
  part_of_speech: string | null;
  chapter_id: string | null;
  synonyms: string | null;
  antonyms: string | null;
  frequency: number | null;
  difficulty: number | null;
  derivatives: any | null;
  image_url?: string | null;
}

interface Chapter {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
}

interface Vocabulary {
  id: string;
  name: string;
  description: string | null;
  language: string;
  user_id: string;
}

const VocabularyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [dictionaryWord, setDictionaryWord] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [chapterActionOpen, setChapterActionOpen] = useState(false);
  const [chapterActionMode, setChapterActionMode] = useState<"copy" | "move">("copy");
  const [chapterActionTarget, setChapterActionTarget] = useState<string>("");
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterDescription, setNewChapterDescription] = useState("");
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterName, setEditingChapterName] = useState("");

  useEffect(() => {
    if (id) loadVocabulary();
  }, [id]);

  useEffect(() => {
    setFavoriteIds(new Set(studyNotes.getFavorites().map(f => f.id)));
  }, []);

  const isOwner = isLocalVocab(id) || vocabulary?.user_id === user?.id;
  const filteredWords = useMemo(() => selectedChapter ? words.filter(w => w.chapter_id === selectedChapter) : words, [selectedChapter, words]);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      if (isLocalVocab(id)) {
        const vocab = loadLocalVocabulary(id!);
        if (!vocab) { setVocabulary(null); return; }
        setVocabulary({ id: vocab.id, name: vocab.name, description: vocab.description, language: vocab.language, user_id: vocab.user_id } as any);
        setChapters([]);
        setWords(loadLocalWords(id!) as any);
        return;
      }
      const { data: vocabData } = await supabase.from("vocabularies").select("*").eq("id", id).maybeSingle();
      if (!vocabData) { setVocabulary(null); return; }
      const { data: chaptersData } = await supabase.from("chapters").select("*").eq("vocabulary_id", id).order("order_index", { ascending: true });
      const { data: wordsData } = await supabase.from("words").select("*").eq("vocabulary_id", id).order("order_index", { ascending: true });
      setVocabulary(vocabData);
      
      let loadedChapters = chaptersData || [];
      let loadedWords = wordsData || [];

      // Auto-assign orphan words to "Chapter 1" if owner
      if (vocabData.user_id === user?.id) {
        const orphanWords = loadedWords.filter(w => !w.chapter_id);
        if (orphanWords.length > 0) {
          let defaultChapter = loadedChapters.find(c => c.name === "Chapter 1");
          if (!defaultChapter) {
            const { data: newCh } = await supabase.from("chapters").insert({
              vocabulary_id: id,
              name: "Chapter 1",
              description: null,
              order_index: loadedChapters.length,
            }).select().single();
            if (newCh) {
              defaultChapter = newCh;
              loadedChapters = [...loadedChapters, newCh];
            }
          }
          if (defaultChapter) {
            await Promise.all(orphanWords.map(w =>
              supabase.from("words").update({ chapter_id: defaultChapter!.id } as any).eq("id", w.id)
            ));
            loadedWords = loadedWords.map(w => w.chapter_id ? w : { ...w, chapter_id: defaultChapter!.id });
          }
        }
      }

      setChapters(loadedChapters);
      setWords(loadedWords);
    } catch {
      toast.error("단어장을 불러오는데 실패했습니다.");
      setVocabulary(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (word: Word) => {
    const added = studyNotes.toggleFavorite({ id: word.id, word: word.word, meaning: word.meaning, vocabularyId: id || null });
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (added) next.add(word.id); else next.delete(word.id);
      return next;
    });
  };

  const handleDeleteWord = async (wordId: string) => {
    if (isLocalVocab(id)) {
      localStorageService.deleteWord(wordId);
      setWords(loadLocalWords(id!) as any);
    } else {
      await supabase.from("words").delete().eq("id", wordId);
      setWords(prev => prev.filter(w => w.id !== wordId));
    }
    setSelectedWordIds(prev => prev.filter(v => v !== wordId));
  };

  const handleSaveWord = async (wordId: string, payload: Partial<Word>) => {
    if (isLocalVocab(id)) {
      localStorageService.updateWord(wordId, payload as any);
      setWords(loadLocalWords(id!) as any);
    } else {
      await supabase.from("words").update(payload as any).eq("id", wordId);
      await loadVocabulary();
    }
    setEditingWordId(null);
    toast.success("단어가 수정되었습니다");
  };

  const handleMoveCopy = async () => {
    if (selectedWordIds.length === 0) return;
    if (chapterActionMode === "move") {
      if (isLocalVocab(id)) {
        localStorageService.bulkUpdateWords(selectedWordIds, { chapter_id: chapterActionTarget || null } as any);
        setWords(loadLocalWords(id!) as any);
      } else {
        await Promise.all(selectedWordIds.map(wordId => supabase.from("words").update({ chapter_id: chapterActionTarget || null } as any).eq("id", wordId)));
        await loadVocabulary();
      }
    } else {
      const selected = words.filter(w => selectedWordIds.includes(w.id));
      if (isLocalVocab(id)) {
        localStorageService.saveWords(selected.map(w => ({
          vocabulary_id: id!,
          chapter_id: chapterActionTarget || null,
          word: w.word,
          meaning: w.meaning,
          example: w.example,
          note: w.note,
          part_of_speech: w.part_of_speech,
          order_index: words.length,
        } as any)));
        setWords(loadLocalWords(id!) as any);
      } else {
        await supabase.from("words").insert(selected.map(w => ({
          vocabulary_id: id,
          chapter_id: chapterActionTarget || null,
          word: w.word,
          meaning: w.meaning,
          example: w.example,
          note: w.note,
          part_of_speech: w.part_of_speech,
          synonyms: w.synonyms,
          antonyms: w.antonyms,
          frequency: w.frequency,
          difficulty: w.difficulty,
          derivatives: w.derivatives,
          image_url: w.image_url,
          order_index: words.length,
        })) as any);
        await loadVocabulary();
      }
    }
    setSelectedWordIds([]);
    setSelectionMode(false);
    setChapterActionOpen(false);
    setChapterActionTarget("");
    toast.success(chapterActionMode === "copy" ? "단어를 복사했습니다" : "단어를 이동했습니다");
  };

  const addChapter = async () => {
    if (!newChapterName.trim()) return;
    if (isLocalVocab(id)) return;
    const { data } = await supabase.from("chapters").insert({ vocabulary_id: id, name: newChapterName.trim(), description: newChapterDescription.trim() || null, order_index: chapters.length }).select().single();
    if (data) {
      setChapters([...chapters, data]);
      setShowAddChapter(false);
      setNewChapterName("");
      setNewChapterDescription("");
    }
  };

  const renameChapter = async (chapterId: string) => {
    if (!editingChapterName.trim()) return;
    if (isLocalVocab(id)) return;
    await supabase.from("chapters").update({ name: editingChapterName.trim() }).eq("id", chapterId);
    setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, name: editingChapterName.trim() } : c));
    setEditingChapterId(null);
    setEditingChapterName("");
    toast.success("챕터 이름이 수정되었습니다");
  };

  const deleteChapter = async (chapterId: string) => {
    if (isLocalVocab(id)) return;
    // Move words to null chapter before deleting
    await supabase.from("words").update({ chapter_id: null } as any).eq("chapter_id", chapterId);
    await supabase.from("chapters").delete().eq("id", chapterId);
    if (selectedChapter === chapterId) setSelectedChapter(null);
    await loadVocabulary();
    toast.success("챕터가 삭제되었습니다");
  };

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedWordIds([]);
    } else {
      setSelectionMode(true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center">로딩 중...</div></div>;
  if (!vocabulary) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p>단어장을 찾을 수 없습니다.</p></div></div>;

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header title={vocabulary.name} showBack onBack={() => navigate("/vocabularies")} action={isOwner ? <Button variant="ghost" size="icon" onClick={() => navigate(`/vocabularies/${id}/edit`)}><Edit className="w-5 h-5" /></Button> : undefined} />
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {vocabulary.description && <Card className="mb-6"><CardContent className="p-4"><p className="text-muted-foreground">{vocabulary.description}</p></CardContent></Card>}
        <div className="flex gap-3 mb-4">
          <Button variant={!selectedChapter ? "default" : "outline"} className="flex-1" onClick={() => setSelectedChapter(null)}><FileText className="w-4 h-4 mr-2" />All List</Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/quiz/${id}`)}><Brain className="w-4 h-4 mr-2" />All Quiz</Button>
          <Button className="flex-1 bg-primary" onClick={() => navigate(`/study/${id}`)}><Play className="w-4 h-4 mr-2" />All Play</Button>
        </div>

        {/* Chapter tabs with edit capability */}
        {chapters.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {chapters.map(ch => (
              <div key={ch.id} className="flex items-center gap-1 shrink-0">
                {editingChapterId === ch.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingChapterName}
                      onChange={e => setEditingChapterName(e.target.value)}
                      className="h-8 w-32 text-sm"
                      onKeyDown={e => { if (e.key === "Enter") renameChapter(ch.id); if (e.key === "Escape") setEditingChapterId(null); }}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => renameChapter(ch.id)}>
                      <CheckSquare className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingChapterId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Button
                      size="sm"
                      variant={selectedChapter === ch.id ? "default" : "outline"}
                      onClick={() => setSelectedChapter(ch.id)}
                      className="whitespace-nowrap"
                    >
                      {ch.name}
                    </Button>
                    {isOwner && selectedChapter === ch.id && (
                      <div className="flex ml-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingChapterId(ch.id); setEditingChapterName(ch.name); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("이 챕터를 삭제하시겠습니까?")) deleteChapter(ch.id); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowAddChapter(true)}>
              <Plus className="w-4 h-4 mr-1" />챕터 추가
            </Button>
            <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
              <CheckSquare className="w-4 h-4 mr-1" />{selectionMode ? "선택 취소" : "단어 선택"}
            </Button>
            {selectionMode && selectedWordIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setChapterActionOpen(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-1" />복사/이동 ({selectedWordIds.length})
              </Button>
            )}
          </div>
        )}

        {/* Word list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {selectedChapter ? chapters.find(c => c.id === selectedChapter)?.name || "챕터 단어" : "전체 단어"} ({filteredWords.length})
            </h3>
            {isOwner && <Button size="sm" variant="outline" onClick={() => setShowAddWord(true)}><Plus className="w-4 h-4 mr-1" />추가</Button>}
          </div>

          {selectionMode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={selectedWordIds.length > 0 && selectedWordIds.length === filteredWords.length}
                onCheckedChange={(checked) => setSelectedWordIds(checked ? filteredWords.map(w => w.id) : [])}
              />
              <span>현재 목록 전체 선택</span>
            </div>
          )}

          {filteredWords.map((word) => (
            <motion.div key={word.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  {editingWordId === word.id ? (
                    <WordManager word={word} vocabularyId={id || ""} onDelete={() => handleDeleteWord(word.id)} onUpdate={() => { loadVocabulary(); setEditingWordId(null); }} />
                  ) : (
                    <div className="flex items-start gap-3">
                      {selectionMode && (
                        <Checkbox
                          checked={selectedWordIds.includes(word.id)}
                          onCheckedChange={(checked) => setSelectedWordIds(prev => checked ? [...prev, word.id] : prev.filter(v => v !== word.id))}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{word.word}</h3>
                          <button type="button" onClick={() => speak(word.word)} className="text-muted-foreground hover:text-primary"><Volume2 className="w-4 h-4" /></button>
                          <button type="button" onClick={() => toggleFavorite(word)} className={favoriteIds.has(word.id) ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}>
                            <Star className={`w-4 h-4 ${favoriteIds.has(word.id) ? "fill-yellow-500" : ""}`} />
                          </button>
                        </div>
                        <p className="text-muted-foreground mt-1">{word.meaning}</p>
                      </div>
                      {isOwner && !selectionMode && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingWordId(word.id)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteWord(word.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add word dialog */}
      <Dialog open={showAddWord} onOpenChange={setShowAddWord}>
        <DialogContent>
          <DialogHeader><DialogTitle>단어 추가</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="단어" />
            <Input value={newMeaning} onChange={e => setNewMeaning(e.target.value)} placeholder="뜻" />
            <Button onClick={async () => {
              if (!newWord.trim() || !newMeaning.trim()) return;
              const targetChapter = selectedChapter || (chapters.length > 0 ? chapters[0].id : null);
              if (isLocalVocab(id)) {
                localStorageService.saveWords([{ vocabulary_id: id!, chapter_id: targetChapter, word: newWord.trim(), meaning: newMeaning.trim(), example: "", note: "", part_of_speech: "", order_index: words.length } as any]);
                setWords(loadLocalWords(id!) as any);
              } else {
                await supabase.from("words").insert({ vocabulary_id: id, chapter_id: targetChapter, word: newWord.trim(), meaning: newMeaning.trim(), order_index: words.length } as any);
                await loadVocabulary();
              }
              setShowAddWord(false); setNewWord(""); setNewMeaning("");
            }} className="w-full">추가</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add chapter dialog */}
      <Dialog open={showAddChapter} onOpenChange={setShowAddChapter}>
        <DialogContent>
          <DialogHeader><DialogTitle>챕터 추가</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newChapterName} onChange={e => setNewChapterName(e.target.value)} placeholder="챕터 이름" />
            <Input value={newChapterDescription} onChange={e => setNewChapterDescription(e.target.value)} placeholder="설명" />
            <Button onClick={addChapter} className="w-full">추가</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move/Copy dialog */}
      <Dialog open={chapterActionOpen} onOpenChange={setChapterActionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>단어 복사/이동</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={chapterActionMode === "copy" ? "default" : "outline"} onClick={() => setChapterActionMode("copy")} className="flex-1">복사</Button>
              <Button variant={chapterActionMode === "move" ? "default" : "outline"} onClick={() => setChapterActionMode("move")} className="flex-1">이동</Button>
            </div>
            <div className="grid gap-2 max-h-64 overflow-auto">
              {chapters.map(ch => (
                <Button key={ch.id} variant={chapterActionTarget === ch.id ? "default" : "outline"} onClick={() => setChapterActionTarget(ch.id)}>{ch.name}</Button>
              ))}
            </div>
            <Button className="w-full" onClick={handleMoveCopy} disabled={!chapterActionTarget}>적용</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dictionaryWord} onOpenChange={() => setDictionaryWord(null)}>
        <DialogContent><DialogHeader><DialogTitle>{dictionaryWord}</DialogTitle></DialogHeader></DialogContent>
      </Dialog>
    </div>
  );
};

export default VocabularyDetail;
