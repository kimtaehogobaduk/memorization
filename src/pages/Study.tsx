import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, X, Eye, EyeOff, FileText, Volume2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalVocab, loadLocalWords, loadLocalVocabulary, getLocalSettings } from "@/utils/localVocabHelper";

interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  synonyms: string | null;
  antonyms: string | null;
  frequency: number | null;
  difficulty: number | null;
  derivatives: any | null;
  part_of_speech: string | null;
}

type ViewMode = "word-only" | "meaning-only" | "both" | "example";

const Study = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vocabularyName, setVocabularyName] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("word-only");

  const isRandom = searchParams.get("random") === "true";
  const chapterId = searchParams.get("chapter");
  const incorrectIds = searchParams.get("incorrectIds")?.split(",") || [];

  useEffect(() => {
    if (id) {
      loadWords();
    }
  }, [id]);

  const loadWords = async () => {
    try {
      setLoading(true);

      if (isLocalVocab(id)) {
        const vocab = loadLocalVocabulary(id!);
        if (vocab) setVocabularyName(vocab.name);
        let wordsData = loadLocalWords(id!);
        if (incorrectIds.length > 0) {
          wordsData = wordsData.filter(w => incorrectIds.includes(w.id));
        }
        if (isRandom && incorrectIds.length === 0) {
          wordsData = wordsData.sort(() => Math.random() - 0.5);
        }
        setWords(wordsData);
        return;
      }

      const { data: vocabData } = await supabase
        .from("vocabularies")
        .select("name")
        .eq("id", id)
        .single();

      if (vocabData) {
        setVocabularyName(vocabData.name);
      }

      let query = supabase
        .from("words")
        .select("id, word, meaning, example, synonyms, antonyms, frequency, difficulty, derivatives, part_of_speech")
        .eq("vocabulary_id", id);

      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      }

      if (incorrectIds.length > 0) {
        query = query.in("id", incorrectIds);
      }

      const { data, error } = await query.order("order_index", { ascending: true });

      if (error) throw error;

      let wordsData = data || [];
      const settings = getLocalSettings();

      if (incorrectIds.length === 0) {
        if (isRandom) {
          wordsData = wordsData.sort(() => Math.random() - 0.5);
        } else if (settings.smart_review && user) {
          // Smart review: sort by incorrect_count / (correct_count + 1) descending
          try {
            const { data: progressData } = await supabase
              .from("study_progress")
              .select("word_id, correct_count, incorrect_count")
              .eq("user_id", user.id)
              .eq("vocabulary_id", id);
            const progressMap = new Map(
              (progressData || []).map((p) => [
                p.word_id,
                { correct: p.correct_count ?? 0, incorrect: p.incorrect_count ?? 0 },
              ])
            );
            wordsData = wordsData.sort((a, b) => {
              const pa = progressMap.get(a.id) ?? { correct: 0, incorrect: 0 };
              const pb = progressMap.get(b.id) ?? { correct: 0, incorrect: 0 };
              const scoreA = pa.incorrect / (pa.correct + 1);
              const scoreB = pb.incorrect / (pb.correct + 1);
              return scoreB - scoreA;
            });
          } catch {}
        }
      }

      setWords(wordsData);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Direction of slide animation: 1 = forward, -1 = backward
  const [direction, setDirection] = useState(1);

  const recordAnswer = async (isCorrect: boolean, wordId: string) => {
    if (!user || isLocalVocab(id)) return;
    try {
      const { data: existingProgress } = await supabase
        .from("study_progress")
        .select("*")
        .eq("user_id", user?.id)
        .eq("word_id", wordId)
        .single();

      if (existingProgress) {
        await supabase
          .from("study_progress")
          .update({
            correct_count: isCorrect ? existingProgress.correct_count + 1 : existingProgress.correct_count,
            incorrect_count: !isCorrect ? existingProgress.incorrect_count + 1 : existingProgress.incorrect_count,
            last_studied_at: new Date().toISOString(),
          })
          .eq("id", existingProgress.id);
      } else {
        await supabase.from("study_progress").insert({
          user_id: user?.id,
          word_id: wordId,
          vocabulary_id: id,
          correct_count: isCorrect ? 1 : 0,
          incorrect_count: !isCorrect ? 1 : 0,
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    const currentWord = words[currentIndex];
    if (!currentWord) return;
    await recordAnswer(isCorrect, currentWord.id);

    if (currentIndex < words.length - 1) {
      setDirection(1);
      setFlipped(false);
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.success("학습 완료!");
      navigate(`/vocabularies/${id}`);
    }
  };

  const goNext = useCallback(() => {
    setWords((prev) => {
      setCurrentIndex((ci) => {
        if (ci < prev.length - 1) {
          setDirection(1);
          setFlipped(false);
          return ci + 1;
        }
        return ci;
      });
      return prev;
    });
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((ci) => {
      if (ci > 0) {
        setDirection(-1);
        setFlipped(false);
        return ci - 1;
      }
      return ci;
    });
  }, []);

  const jumpBy = useCallback((delta: number) => {
    setWords((prev) => {
      setCurrentIndex((ci) => {
        const next = Math.max(0, Math.min(prev.length - 1, ci + delta));
        if (next !== ci) {
          setDirection(delta > 0 ? 1 : -1);
          setFlipped(false);
        }
        return next;
      });
      return prev;
    });
  }, []);

  const toggleFlip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        toggleFlip();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, toggleFlip]);


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

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">학습할 단어가 없습니다.</p>
          <Button onClick={() => navigate(`/vocabularies/${id}`)}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

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

  const derivs = Array.isArray(currentWord.derivatives) ? currentWord.derivatives : [];

  const MetadataSection = ({ word }: { word: Word }) => {
    const ds = Array.isArray(word.derivatives) ? word.derivatives : [];
    return (
      <div className="grid grid-cols-1 gap-2 text-left mt-4 w-full">
        {word.synonyms && (
          <div className="p-2 rounded-lg bg-primary/5">
            <span className="text-xs font-semibold text-primary">유의어</span>
            <p className="text-sm mt-0.5">{word.synonyms}</p>
          </div>
        )}
        {word.antonyms && (
          <div className="p-2 rounded-lg bg-destructive/5">
            <span className="text-xs font-semibold text-destructive">반의어</span>
            <p className="text-sm mt-0.5">{word.antonyms}</p>
          </div>
        )}
        {ds.length > 0 && (
          <div className="p-2 rounded-lg bg-secondary/50">
            <span className="text-xs font-semibold text-secondary-foreground">파생어</span>
            <div className="mt-0.5 space-y-0.5">
              {ds.map((d: any, i: number) => (
                <p key={i} className="text-sm"><span className="font-medium">{d.word}</span> — {d.meaning}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCardContent = (word: Word, isFlipped: boolean) => {
    // Flipping a "word-only" or "meaning-only" card swaps front/back
    let effectiveMode: ViewMode = viewMode;
    if (isFlipped) {
      if (viewMode === "word-only") effectiveMode = "meaning-only";
      else if (viewMode === "meaning-only") effectiveMode = "word-only";
    }

    switch (effectiveMode) {
      case "word-only":
        return (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">단어</p>
            <h2 className="text-5xl font-bold">{word.word}</h2>
            {word.part_of_speech && <p className="text-base text-muted-foreground mt-2">{word.part_of_speech}</p>}
            <div className="flex items-center justify-center gap-2 mt-3">
              {word.frequency != null && word.frequency > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">빈도 {"★".repeat(word.frequency)}</span>
              )}
              {word.difficulty != null && word.difficulty > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">난이도 {"★".repeat(word.difficulty)}</span>
              )}
            </div>
          </div>
        );
      case "meaning-only":
        return (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">뜻</p>
            <h2 className="text-3xl font-bold">{word.meaning}</h2>
            <MetadataSection word={word} />
          </div>
        );
      case "both":
        return (
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">{word.word}</h2>
            {word.part_of_speech && <p className="text-sm text-muted-foreground mb-2">{word.part_of_speech}</p>}
            <p className="text-2xl text-muted-foreground">{word.meaning}</p>
            <MetadataSection word={word} />
          </div>
        );
      case "example":
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{word.word}</h2>
            {word.part_of_speech && <p className="text-sm text-muted-foreground mb-2">{word.part_of_speech}</p>}
            <p className="text-xl text-muted-foreground mb-3">{word.meaning}</p>
            {word.example && (
              <p className="text-base text-muted-foreground italic">{word.example}</p>
            )}
            <MetadataSection word={word} />
          </div>
        );
    }
  };

  const prevWord = currentIndex > 0 ? words[currentIndex - 1] : null;
  const nextWord = currentIndex < words.length - 1 ? words[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Junsuk */}
      <div className="absolute bottom-10 right-10 opacity-20 pointer-events-none hidden md:block">
        <img 
          src={new URL('@/assets/junsuk-19-2.png', import.meta.url).href} 
          alt="Junsuk relaxing" 
          className="w-48 h-48"
        />
      </div>
      
      <Header title={vocabularyName} showBack onBack={() => navigate(`/vocabularies/${id}`)} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {words.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* View Mode Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button variant={viewMode === "word-only" ? "default" : "outline"} size="sm" onClick={() => setViewMode("word-only")}>
            <Eye className="w-4 h-4 mr-1" />단어만
          </Button>
          <Button variant={viewMode === "meaning-only" ? "default" : "outline"} size="sm" onClick={() => setViewMode("meaning-only")}>
            <EyeOff className="w-4 h-4 mr-1" />뜻만
          </Button>
          <Button variant={viewMode === "both" ? "default" : "outline"} size="sm" onClick={() => setViewMode("both")}>
            단어+뜻
          </Button>
          <Button variant={viewMode === "example" ? "default" : "outline"} size="sm" onClick={() => setViewMode("example")}>
            <FileText className="w-4 h-4 mr-1" />예문 포함
          </Button>
        </div>

        {/* Card carousel with side previews */}
        <div className="relative flex items-center justify-center" style={{ minHeight: 'calc(60vh - 80px)' }}>
          {/* Previous preview (left) */}
          {prevWord && (
            <button
              onClick={goPrev}
              className="hidden md:flex absolute left-0 lg:left-4 top-1/2 -translate-y-1/2 w-40 lg:w-56 h-56 lg:h-72 rounded-2xl bg-card/60 border-2 border-dashed border-muted-foreground/20 items-center justify-center cursor-pointer hover:bg-card/80 transition-all opacity-50 hover:opacity-80 z-0"
              aria-label="이전 단어"
            >
              <div className="text-center px-2">
                <p className="text-xs text-muted-foreground mb-2">← 이전</p>
                <p className="text-lg font-semibold truncate max-w-[10rem] lg:max-w-[12rem]">{prevWord.word}</p>
              </div>
            </button>
          )}

          {/* Next preview (right) */}
          {nextWord && (
            <button
              onClick={goNext}
              className="hidden md:flex absolute right-0 lg:right-4 top-1/2 -translate-y-1/2 w-40 lg:w-56 h-56 lg:h-72 rounded-2xl bg-card/60 border-2 border-dashed border-muted-foreground/20 items-center justify-center cursor-pointer hover:bg-card/80 transition-all opacity-50 hover:opacity-80 z-0"
              aria-label="다음 단어"
            >
              <div className="text-center px-2">
                <p className="text-xs text-muted-foreground mb-2">다음 →</p>
                <p className="text-lg font-semibold truncate max-w-[10rem] lg:max-w-[12rem]">{nextWord.word}</p>
              </div>
            </button>
          )}

          {/* Center card */}
          <div className="w-full max-w-2xl relative z-10 px-2 md:px-0">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                initial={{ opacity: 0, x: direction * 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -direction * 80, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <Card
                  className="p-8 md:p-10 bg-gradient-card shadow-lg cursor-pointer select-none"
                  style={{ minHeight: '400px' }}
                  onClick={toggleFlip}
                >
                  <div className="mb-4 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {flipped ? "뒷면" : "앞면"} · 카드 클릭/↑↓ 로 뒤집기
                    </span>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); speak(currentWord.word); }} className="text-primary">
                      <Volume2 className="w-6 h-6" />
                    </Button>
                  </div>
                  {renderCardContent(currentWord, flipped)}
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Multi-skip nav buttons */}
        <div className="mt-6 flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => jumpBy(-10)} disabled={currentIndex === 0} title="10단어 뒤로">
            <ChevronsLeft className="w-4 h-4" />-10
          </Button>
          <Button variant="outline" size="sm" onClick={() => jumpBy(-5)} disabled={currentIndex === 0} title="5단어 뒤로">
            <ChevronsLeft className="w-4 h-4" />-5
          </Button>
          <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0} title="이전 단어 (←)">
            <ChevronLeft className="w-4 h-4" />이전
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleFlip} title="카드 뒤집기 (↑↓)">
            <RotateCw className="w-4 h-4 mr-1" />뒤집기
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} disabled={currentIndex >= words.length - 1} title="다음 단어 (→ / Enter)">
            다음<ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => jumpBy(5)} disabled={currentIndex >= words.length - 1} title="5단어 앞으로">
            +5<ChevronsRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => jumpBy(10)} disabled={currentIndex >= words.length - 1} title="10단어 앞으로">
            +10<ChevronsRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Answer buttons */}
        <div className="mt-4 max-w-2xl mx-auto flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => handleAnswer(false)}>
            <X className="w-5 h-5 mr-2 text-destructive" />모르겠어요
          </Button>
          <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => handleAnswer(true)}>
            <Check className="w-5 h-5 mr-2" />알아요
          </Button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-muted-foreground mt-4 hidden md:block">
          단축키: ← 이전 · → / Enter 다음 · ↑↓ / Space 뒤집기
        </p>
      </div>
    </div>
  );
};


export default Study;
