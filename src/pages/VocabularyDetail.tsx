import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, FileText, Brain, Play, Volume2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  note: string | null;
  part_of_speech: string | null;
  chapter_id: string | null;
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

  useEffect(() => {
    if (id && user) {
      loadVocabulary();
    }
  }, [id, user]);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      
      console.log("[VocabularyDetail] Loading vocabulary with id:", id);

      const { data: vocabData, error: vocabError } = await supabase
        .from("vocabularies")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (vocabError) {
        console.error("[VocabularyDetail] Error loading vocabulary:", vocabError);
        throw vocabError;
      }

      if (!vocabData) {
        console.log("[VocabularyDetail] No vocabulary found with id:", id);
        setVocabulary(null);
        setLoading(false);
        return;
      }

      console.log("[VocabularyDetail] Vocabulary loaded:", vocabData);

      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("*")
        .eq("vocabulary_id", id)
        .order("order_index", { ascending: true });

      const { data: wordsData, error: wordsError } = await supabase
        .from("words")
        .select("*")
        .eq("vocabulary_id", id)
        .order("order_index", { ascending: true });

      if (wordsError) {
        console.error("[VocabularyDetail] Error loading words:", wordsError);
        throw wordsError;
      }

      console.log("[VocabularyDetail] Words loaded:", wordsData?.length || 0);

      setVocabulary(vocabData);
      setChapters(chaptersData || []);
      setWords(wordsData || []);
    } catch (error) {
      console.error("[VocabularyDetail] Error loading vocabulary:", error);
      toast.error("단어장을 불러오는데 실패했습니다.");
      setVocabulary(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img 
            src={new URL('@/assets/junsuk-08.png', import.meta.url).href} 
            alt="Junsuk surprised" 
            className="w-40 h-40 mx-auto mb-6 animate-bounce"
          />
          <p className="text-2xl font-semibold">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!vocabulary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img 
            src={new URL('@/assets/junsuk-16.png', import.meta.url).href} 
            alt="Junsuk shy" 
            className="w-24 h-24 mx-auto mb-4"
          />
          <p>단어장을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const filteredWords = selectedChapter
    ? words.filter(w => w.chapter_id === selectedChapter)
    : words;

  const isOwner = vocabulary?.user_id === user?.id;

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("음성 재생을 지원하지 않는 브라우저입니다.");
    }
  };

  const openDictionary = (word: string) => {
    setDictionaryWord(word);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header
        title={vocabulary.name}
        showBack
        onBack={() => navigate("/vocabularies")}
        action={
          isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/vocabularies/${id}/edit`)}
            >
              <Edit className="w-5 h-5" />
            </Button>
          )
        }
      />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {vocabulary.description && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-muted-foreground">{vocabulary.description}</p>
            </CardContent>
          </Card>
        )}

        {/* All List/Quiz/Play Buttons */}
        {words.length > 0 && (
          <div className="flex gap-3 mb-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSelectedChapter(null)}
            >
              <FileText className="w-4 h-4 mr-2" />
              All List
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/quiz/${id}`)}
            >
              <Brain className="w-4 h-4 mr-2" />
              All Quiz
            </Button>
            <Button
              className="flex-1 bg-primary"
              onClick={() => navigate(`/study/${id}`)}
            >
              <Play className="w-4 h-4 mr-2" />
              All Play
            </Button>
          </div>
        )}

        {/* Chapter List */}
        {chapters.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">챕터</h3>
            <div className="space-y-3">
              {chapters.map((chapter) => {
                const chapterWords = words.filter(w => w.chapter_id === chapter.id);
                return (
                  <Card key={chapter.id} className="bg-gradient-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{chapter.name}</h4>
                          {chapter.description && (
                            <p className="text-xs text-muted-foreground">{chapter.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {chapterWords.length}개 단어
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedChapter(chapter.id)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          List
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/quiz/${id}?chapter=${chapter.id}`)}
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          Quiz
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/study/${id}?chapter=${chapter.id}`)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Word List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {selectedChapter ? "챕터 단어" : "전체 단어"} ({filteredWords.length})
            </h3>
            {selectedChapter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChapter(null)}
              >
                전체 보기
              </Button>
            )}
          </div>

          {filteredWords.map((word, index) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{word.word}</h3>
                      {word.part_of_speech && (
                        <span className="text-xs text-muted-foreground">
                          {word.part_of_speech}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(word.word);
                        }}
                        className="text-primary"
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDictionary(word.word);
                        }}
                        className="text-muted-foreground hover:text-primary"
                        title="사전에서 검색"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-foreground mb-2">{word.meaning}</p>
                  {word.example && (
                    <p className="text-sm text-muted-foreground italic mb-2">
                      예문: {word.example}
                    </p>
                  )}
                  {word.note && (
                    <p className="text-sm text-muted-foreground">
                      메모: {word.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {words.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">아직 단어가 없습니다.</p>
            {isOwner && (
              <Button onClick={() => navigate(`/vocabularies/${id}/edit`)}>
                단어 추가하기
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dictionary Popup */}
      <Dialog open={!!dictionaryWord} onOpenChange={(open) => !open && setDictionaryWord(null)}>
        <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>"{dictionaryWord}" 사전 검색</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            {dictionaryWord && (
              <iframe
                src={`https://en.dict.naver.com/#/search?query=${encodeURIComponent(dictionaryWord)}`}
                className="w-full h-[calc(80vh-60px)] border-0"
                title="네이버 사전"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VocabularyDetail;
