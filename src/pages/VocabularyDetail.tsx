import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, FileText, Brain, Play, Volume2, Search, X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalVocab, loadLocalWords, loadLocalVocabulary } from "@/utils/localVocabHelper";
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

  useEffect(() => {
    if (id) loadVocabulary();
  }, [id]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center">로딩 중...</div></div>;
  if (!vocabulary) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p>단어장을 찾을 수 없습니다.</p></div></div>;

  const filteredWords = selectedChapter ? words.filter(w => w.chapter_id === selectedChapter) : words;
  const isOwner = vocabulary?.user_id === user?.id;
  const speak = (text: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; window.speechSynthesis.speak(utterance); } };
  const openDictionary = (word: string) => setDictionaryWord(word);

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
        <div className="grid grid-cols-1 gap-3 mb-6">
          <Button variant="outline" onClick={() => navigate("/statistics")}><Star className="w-4 h-4 mr-2" />학습 통계</Button>
        </div>
        <div id="word-list-section" className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-muted-foreground">{selectedChapter ? "챕터 단어" : "전체 단어"} ({filteredWords.length})</h3></div>
          {filteredWords.map((word, index) => (
            <motion.div key={word.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
              <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => { setFlashcardIndex(index); setFlashcardFlipped(false); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{word.word}</h3>
                        <button type="button" onClick={(e) => { e.stopPropagation(); studyNotes.toggleFavorite({ id: word.id, word: word.word, meaning: word.meaning, vocabularyId: id || null }); toast.success("즐겨찾기에 저장했습니다."); }} className="text-muted-foreground hover:text-yellow-500"><Star className="w-4 h-4" /></button>
                      </div>
                      <p className="text-muted-foreground mt-1">{word.meaning}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      <Dialog open={!!dictionaryWord} onOpenChange={() => setDictionaryWord(null)}><DialogContent><DialogHeader><DialogTitle>{dictionaryWord}</DialogTitle></DialogHeader></DialogContent></Dialog>
    </div>
  );
};

export default VocabularyDetail;
