import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit, FileText, Brain, Play, Volume2, Star, Plus, Trash2, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalVocab, loadLocalWords, loadLocalVocabulary } from "@/utils/localVocabHelper";
import { localStorageService } from "@/services/localStorageService";
import { studyNotes } from "@/lib/studyNotes";

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
  const [flashcardIndex, setFlashcardIndex] = useState<number | null>(null);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  
  // Add word dialog
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  
  // Edit word
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editMeaning, setEditMeaning] = useState("");

  useEffect(() => {
    if (id) loadVocabulary();
  }, [id]);

  useEffect(() => {
    // Initialize favorite IDs
    const favs = studyNotes.getFavorites();
    setFavoriteIds(new Set(favs.map(f => f.id)));
  }, []);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      if (isLocalVocab(id)) {
        const vocab = loadLocalVocabulary(id!);
        if (!vocab) { setVocabulary(null); setLoading(false); return; }
        setVocabulary({ id: vocab.id, name: vocab.name, description: vocab.description, language: vocab.language, user_id: vocab.user_id } as any);
        setChapters([]);
        setWords(loadLocalWords(id!) as any);
        setLoading(false);
        return;
      }
      const { data: vocabData, error: vocabError } = await supabase.from("vocabularies").select("*").eq("id", id).maybeSingle();
      if (vocabError) throw vocabError;
      if (!vocabData) { setVocabulary(null); setLoading(false); return; }
      const { data: chaptersData } = await supabase.from("chapters").select("*").eq("vocabulary_id", id).order("order_index", { ascending: true });
      const { data: wordsData, error: wordsError } = await supabase.from("words").select("*").eq("vocabulary_id", id).order("order_index", { ascending: true });
      if (wordsError) throw wordsError;
      setVocabulary(vocabData);
      setChapters(chaptersData || []);
      setWords(wordsData || []);
    } catch (error) {
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
      if (added) next.add(word.id);
      else next.delete(word.id);
      return next;
    });
    toast.success(added ? "즐겨찾기에 추가했습니다" : "즐겨찾기에서 제거했습니다");
  };

  const handleAddWord = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;
    try {
      if (isLocalVocab(id)) {
        localStorageService.saveWords([{ vocabulary_id: id!, word: newWord.trim(), meaning: newMeaning.trim(), example: "", note: "", part_of_speech: "", order_index: words.length, chapter_id: selectedChapter || undefined } as any]);
        setWords(loadLocalWords(id!) as any);
      } else {
        const { error } = await supabase.from("words").insert({ vocabulary_id: id!, word: newWord.trim(), meaning: newMeaning.trim(), order_index: words.length });
        if (error) throw error;
        await loadVocabulary();
      }
      setNewWord("");
      setNewMeaning("");
      setShowAddWord(false);
      toast.success("단어가 추가되었습니다");
    } catch (e) {
      toast.error("단어 추가에 실패했습니다");
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    try {
      if (isLocalVocab(id)) {
        localStorageService.deleteWord(wordId);
        setWords(loadLocalWords(id!) as any);
      } else {
        const { error } = await supabase.from("words").delete().eq("id", wordId);
        if (error) throw error;
        setWords(prev => prev.filter(w => w.id !== wordId));
      }
      toast.success("단어가 삭제되었습니다");
    } catch (e) {
      toast.error("단어 삭제에 실패했습니다");
    }
  };

  const handleSaveEdit = async (wordId: string) => {
    if (!editWord.trim() || !editMeaning.trim()) return;
    try {
      if (isLocalVocab(id)) {
        localStorageService.updateWord(wordId, { word: editWord.trim(), meaning: editMeaning.trim() });
        setWords(loadLocalWords(id!) as any);
      } else {
        const { error } = await supabase.from("words").update({ word: editWord.trim(), meaning: editMeaning.trim() }).eq("id", wordId);
        if (error) throw error;
        setWords(prev => prev.map(w => w.id === wordId ? { ...w, word: editWord.trim(), meaning: editMeaning.trim() } : w));
      }
      setEditingWordId(null);
      toast.success("단어가 수정되었습니다");
    } catch (e) {
      toast.error("단어 수정에 실패했습니다");
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center">로딩 중...</div></div>;
  if (!vocabulary) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p>단어장을 찾을 수 없습니다.</p></div></div>;

  const filteredWords = selectedChapter ? words.filter(w => w.chapter_id === selectedChapter) : words;
  const isOwner = isLocalVocab(id) || vocabulary?.user_id === user?.id;

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header title={vocabulary.name} showBack onBack={() => navigate("/vocabularies")} action={isOwner ? <Button variant="ghost" size="icon" onClick={() => navigate(`/vocabularies/${id}/edit`)}><Edit className="w-5 h-5" /></Button> : undefined} />
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {vocabulary.description && <Card className="mb-6"><CardContent className="p-4"><p className="text-muted-foreground">{vocabulary.description}</p></CardContent></Card>}
        
        {words.length > 0 && (
          <div className="flex gap-3 mb-6">
            <Button variant={!selectedChapter ? "default" : "outline"} className="flex-1" onClick={() => setSelectedChapter(null)}><FileText className="w-4 h-4 mr-2" />All List</Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/quiz/${id}`)}><Brain className="w-4 h-4 mr-2" />All Quiz</Button>
            <Button className="flex-1 bg-primary" onClick={() => navigate(`/study/${id}`)}><Play className="w-4 h-4 mr-2" />All Play</Button>
          </div>
        )}

        {/* Chapter filter tabs */}
        {chapters.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <Button size="sm" variant={!selectedChapter ? "default" : "outline"} onClick={() => setSelectedChapter(null)}>전체</Button>
            {chapters.map(ch => (
              <Button key={ch.id} size="sm" variant={selectedChapter === ch.id ? "default" : "outline"} onClick={() => setSelectedChapter(ch.id)} className="whitespace-nowrap">
                {ch.name}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 mb-6">
          <Button variant="outline" onClick={() => navigate("/statistics")}><Star className="w-4 h-4 mr-2" />학습 통계</Button>
        </div>

        <div id="word-list-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">{selectedChapter ? "챕터 단어" : "전체 단어"} ({filteredWords.length})</h3>
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => setShowAddWord(true)}>
                <Plus className="w-4 h-4 mr-1" />추가
              </Button>
            )}
          </div>
          
          {filteredWords.map((word, index) => (
            <motion.div key={word.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
              <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                <CardContent className="p-4">
                  {editingWordId === word.id ? (
                    <div className="space-y-2">
                      <Input value={editWord} onChange={e => setEditWord(e.target.value)} placeholder="단어" />
                      <Input value={editMeaning} onChange={e => setEditMeaning(e.target.value)} placeholder="뜻" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(word.id)}><Save className="w-4 h-4 mr-1" />저장</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingWordId(null)}><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1" onClick={() => { setFlashcardIndex(index); setFlashcardFlipped(false); }}>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{word.word}</h3>
                          <button type="button" onClick={(e) => { e.stopPropagation(); speak(word.word); }} className="text-muted-foreground hover:text-primary">
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(word); }} className={favoriteIds.has(word.id) ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}>
                            <Star className={`w-4 h-4 ${favoriteIds.has(word.id) ? "fill-yellow-500" : ""}`} />
                          </button>
                        </div>
                        <p className="text-muted-foreground mt-1">{word.meaning}</p>
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingWordId(word.id); setEditWord(word.word); setEditMeaning(word.meaning); }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteWord(word.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Add Word Dialog */}
      <Dialog open={showAddWord} onOpenChange={setShowAddWord}>
        <DialogContent>
          <DialogHeader><DialogTitle>단어 추가</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="단어" autoFocus />
            <Input value={newMeaning} onChange={e => setNewMeaning(e.target.value)} placeholder="뜻" onKeyDown={e => e.key === "Enter" && handleAddWord()} />
            <Button onClick={handleAddWord} className="w-full" disabled={!newWord.trim() || !newMeaning.trim()}>추가</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dictionaryWord} onOpenChange={() => setDictionaryWord(null)}><DialogContent><DialogHeader><DialogTitle>{dictionaryWord}</DialogTitle></DialogHeader></DialogContent></Dialog>
    </div>
  );
};

export default VocabularyDetail;
