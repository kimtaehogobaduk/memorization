import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuizSound } from "@/hooks/useQuizSound";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isLocalVocab, loadLocalWords } from "@/utils/localVocabHelper";

interface Word {
  id: string;
  word: string;
  meaning: string;
}

interface MatchPair {
  id: string;
  word: Word;
  matched: boolean;
}

const DYNAMIC_SLOTS = 7;

const QuizMatching = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playMatchSound, playIncorrectSound } = useQuizSound();

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [leftPairs, setLeftPairs] = useState<MatchPair[]>([]);
  const [rightPairs, setRightPairs] = useState<MatchPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const dynamicMode = searchParams.get("dynamic") === "true";

  // ── Dynamic mode state ──
  const [dynLeft, setDynLeft] = useState<Word[]>([]);
  const [dynRight, setDynRight] = useState<Word[]>([]);
  const [dynPool, setDynPool] = useState<Word[]>([]);
  const [dynFinished, setDynFinished] = useState(false);

  const isRandom = searchParams.get("random") === "true";
  const chapterId = searchParams.get("chapter");
  const wordsPerPage = 6;
  const isRetry = searchParams.get("retry") === "true";
  const incorrectIds = searchParams.get("incorrectIds")?.split(",") || [];
  const idsParam = searchParams.get("ids");
  const vocabIds = idsParam ? idsParam.split(",") : [id];

  useEffect(() => {
    if (id || (vocabIds && vocabIds.length > 0)) {
      loadWords();
    }
  }, [id, idsParam]);

  useEffect(() => {
    if (allWords.length > 0 && !dynamicMode) {
      setupStaticPage();
    }
  }, [currentPage, allWords, dynamicMode]);

  useEffect(() => {
    if (allWords.length > 0 && dynamicMode) {
      initDynamic();
    }
  }, [dynamicMode, allWords]);

  const loadWords = async () => {
    try {
      setLoading(true);

      const hasLocal = vocabIds.some(vid => vid && isLocalVocab(vid));
      if (hasLocal) {
        let words: Word[] = [];
        for (const vid of vocabIds) {
          if (vid && isLocalVocab(vid)) {
            words.push(...loadLocalWords(vid).map(w => ({ id: w.id, word: w.word, meaning: w.meaning })));
          }
        }
        if (isRetry && incorrectIds.length > 0) {
          words = words.filter(w => incorrectIds.includes(w.id));
        }
        if (isRandom && !isRetry) words = [...words].sort(() => Math.random() - 0.5);
        setAllWords(words);
        return;
      }

      let query = supabase
        .from("words")
        .select("id, word, meaning")
        .in("vocabulary_id", vocabIds)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(100);

      if (chapterId) query = query.eq("chapter_id", chapterId);
      if (isRetry && incorrectIds.length > 0) query = query.in("id", incorrectIds);

      const { data, error } = await query;
      if (error) throw error;

      let wordsData = data || [];
      if (isRandom && !isRetry) wordsData = [...wordsData].sort(() => Math.random() - 0.5);
      setAllWords(wordsData);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ── Static mode ──
  const setupStaticPage = () => {
    const start = currentPage * wordsPerPage;
    const pageWords = allWords.slice(start, start + wordsPerPage);

    const left: MatchPair[] = pageWords.map(w => ({ id: w.id, word: w, matched: false }));
    const right: MatchPair[] = [...pageWords]
      .sort(() => Math.random() - 0.5)
      .map(w => ({ id: w.id, word: w, matched: false }));

    setLeftPairs(left);
    setRightPairs(right);
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  // ── Dynamic mode helpers ──
  const hasMatchablePair = useCallback((left: Word[], right: Word[]) => {
    const rightIds = new Set(right.map(w => w.id));
    return left.some(w => rightIds.has(w.id));
  }, []);

  const countMatchablePairs = useCallback((left: Word[], right: Word[]) => {
    const rightIds = new Set(right.map(w => w.id));
    return left.filter(w => rightIds.has(w.id)).length;
  }, []);

  const initDynamic = () => {
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);

    // Need at least 2*SLOTS + 1 words for dynamic mode to work well
    if (shuffled.length < DYNAMIC_SLOTS * 2) {
      toast.error(`동적 모드는 최소 ${DYNAMIC_SLOTS * 2}개 이상의 단어가 필요합니다.`);
      setDynamicMode(false);
      return;
    }

    const left = shuffled.slice(0, DYNAMIC_SLOTS);
    let pool = shuffled.slice(DYNAMIC_SLOTS);

    // Build right side: ensure at least 1 matchable pair
    const right: Word[] = [];
    const usedIds = new Set<string>();

    // Force one matchable pair with the first left word
    right.push(left[0]);
    usedIds.add(left[0].id);

    // Fill remaining slots from pool (avoid duplicates)
    for (let i = 1; i < DYNAMIC_SLOTS; i++) {
      const candidates = pool.filter(w => !usedIds.has(w.id));
      if (candidates.length === 0) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      right.push(pick);
      usedIds.add(pick.id);
      pool = pool.filter(w => w.id !== pick.id);
    }

    // Shuffle right so matchable pair isn't predictable by position
    const shuffledRight = [...right].sort(() => Math.random() - 0.5);

    setDynLeft(left);
    setDynRight(shuffledRight);
    setDynPool(pool);
    setDynFinished(false);
    setScore(0);
    setIncorrectWords([]);
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const replaceDynamicSlots = (matchedLeftId: string, matchedRightId: string) => {
    // 1. Move the matched word back to the pool so it can cycle back in later
    const matchedWord = dynLeft.find(w => w.id === matchedLeftId)!;
    let newPool = [...dynPool, matchedWord];

    let newLeft = dynLeft.filter(w => w.id !== matchedLeftId);
    let newRight = dynRight.filter(w => w.id !== matchedRightId);

    // 2. Exclude words already on screen from candidate pool
    const screenIds = new Set([...newLeft.map(w => w.id), ...newRight.map(w => w.id)]);
    const available = newPool.filter(w => !screenIds.has(w.id));

    // 3. Not enough words to refill both slots → remove only and finish if empty
    if (available.length < 2) {
      setDynLeft(newLeft);
      setDynRight(newRight);
      setDynPool(newPool.filter(w => !screenIds.has(w.id)));
      setScore(prev => prev + 1);
      if (newLeft.length === 0) {
        setTimeout(() => setDynFinished(true), 600);
      }
      return;
    }

    // 4. Pick a NEW word for the left side
    const leftIdx = Math.floor(Math.random() * available.length);
    const newWord = available[leftIdx];

    // Remaining candidates after taking left word
    const candidatesAfterLeft = available.filter((_, i) => i !== leftIdx);

    // 5. Pick a NEW meaning for the right side
    //    Priority: match an existing left word (fun) > non-self-match > any
    const leftIds = new Set(newLeft.map(w => w.id));
    const matchable = candidatesAfterLeft.filter(w => leftIds.has(w.id));

    let newMeaning: Word;
    if (matchable.length > 0) {
      // Great: there are meanings that match existing left words
      newMeaning = matchable[Math.floor(Math.random() * matchable.length)];
    } else {
      // No meanings match existing left words
      // Prefer picking a meaning that is NOT the same as newWord (avoid self-match)
      const nonSelf = candidatesAfterLeft.find(w => w.id !== newWord.id);
      if (nonSelf) {
        newMeaning = nonSelf;
      } else {
        // Only newWord itself is left → unavoidable self-match
        newMeaning = candidatesAfterLeft[0] || newWord;
      }
    }

    newLeft = [...newLeft, newWord];
    newRight = [...newRight, newMeaning];

    // 6. Update pool: remove the two words we just placed on screen
    const pickedIds = new Set([newWord.id, newMeaning.id]);
    const remainingPool = newPool.filter(w => !pickedIds.has(w.id));

    // 7. Final safety: ensure >=1 matchable pair (self-match as last resort)
    const finalMatches = countMatchablePairs(newLeft, newRight);
    if (finalMatches === 0 && newLeft.length > 0) {
      // Force newWord onto the right as well (self-match)
      const orphanRight = newRight.find(w => !newLeft.some(lw => lw.id === w.id));
      if (orphanRight) {
        newRight = newRight.filter(w => w.id !== orphanRight.id);
        newRight.push(newWord);
        remainingPool.push(orphanRight);
      }
    }

    setDynLeft(newLeft);
    setDynRight(newRight);
    setDynPool(remainingPool);
    setScore(prev => prev + 1);

    if (remainingPool.length === 0 && newLeft.length === 0) {
      setTimeout(() => setDynFinished(true), 600);
    }
  };

  // ── Click handlers ──
  const handleLeftClick = (clickedId: string) => {
    if (dynamicMode) {
      if (!dynLeft.some(w => w.id === clickedId)) return;
      setSelectedLeft(prev => prev === clickedId ? null : clickedId);
    } else {
      const pair = leftPairs.find(p => p.id === clickedId);
      if (pair?.matched) return;
      setSelectedLeft(prev => prev === clickedId ? null : clickedId);
    }
  };

  const handleRightClick = (clickedId: string) => {
    if (dynamicMode) {
      if (!dynRight.some(w => w.id === clickedId)) return;

      if (selectedLeft && selectedLeft === clickedId) {
        // Correct match
        playMatchSound();
        replaceDynamicSlots(selectedLeft, clickedId);
        setSelectedLeft(null);
        setSelectedRight(null);
      } else if (selectedLeft && selectedLeft !== clickedId) {
        // Wrong match
        playIncorrectSound();
        const incorrectWord = allWords.find(w => w.id === selectedLeft);
        if (incorrectWord && !incorrectWords.find(w => w.id === incorrectWord.id)) {
          setIncorrectWords(prev => [...prev, incorrectWord]);
        }
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedRight(prev => prev === clickedId ? null : clickedId);
      }
    } else {
      const pair = rightPairs.find(p => p.id === clickedId);
      if (pair?.matched) return;
      setSelectedRight(prev => prev === clickedId ? null : clickedId);

      if (selectedLeft && selectedLeft === clickedId) {
        playMatchSound();
        setLeftPairs(prev => prev.map(p => p.id === clickedId ? { ...p, matched: true } : p));
        setRightPairs(prev => prev.map(p => p.id === clickedId ? { ...p, matched: true } : p));
        setScore(prev => prev + 1);
        setSelectedLeft(null);
        setSelectedRight(null);

        const allMatched = leftPairs.every(p => p.id === clickedId || p.matched);
        if (allMatched) {
          setTimeout(() => {
            const nextPage = currentPage + 1;
            const totalPages = Math.ceil(allWords.length / wordsPerPage);
            if (nextPage < totalPages) {
              setCurrentPage(nextPage);
            } else {
              goToResult(score + 1);
            }
          }, 1000);
        }
      } else if (selectedLeft && selectedLeft !== clickedId) {
        playIncorrectSound();
        const incorrectWord = allWords.find(w => w.id === selectedLeft);
        if (incorrectWord && !incorrectWords.find(w => w.id === incorrectWord.id)) {
          setIncorrectWords(prev => [...prev, incorrectWord]);
        }
        setSelectedLeft(null);
        setSelectedRight(null);
      }
    }
  };

  const goToResult = (finalScore: number) => {
    const params = new URLSearchParams({
      score: finalScore.toString(),
      total: allWords.length.toString(),
      incorrect: encodeURIComponent(JSON.stringify(incorrectWords)),
      quizType: "matching",
      delay: "2",
    });
    if (chapterId) params.append("chapter", chapterId);
    if (vocabIds.length > 1 || !id) {
      params.append("ids", vocabIds.join(","));
      navigate(`/quiz/result?${params.toString()}`);
    } else {
      navigate(`/quiz/${id}/result?${params.toString()}`);
    }
  };


  // ── Render ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (allWords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">퀴즈할 단어가 없습니다.</p>
          <Button onClick={() => navigate(vocabIds.length > 1 ? "/vocabularies" : `/vocabularies/${id}`)}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (dynamicMode && dynFinished) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="단어 짝지기" showBack onBack={() => navigate(`/quiz/${id}`)} />
        <div className="max-w-screen-xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">모든 단어를 매칭했습니다!</h2>
          <p className="text-muted-foreground mb-6">정답: {score} / {allWords.length}</p>
          <Button onClick={() => { setDynFinished(false); initDynamic(); }}>다시 하기</Button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(allWords.length / wordsPerPage);
  const staticProgress = dynamicMode
    ? (score / allWords.length) * 100
    : ((currentPage * wordsPerPage + leftPairs.filter(p => p.matched).length) / allWords.length) * 100;

  const displayLeft = dynamicMode ? dynLeft.map(w => ({ id: w.id, word: w, matched: false })) : leftPairs;
  const displayRight = dynamicMode ? dynRight.map(w => ({ id: w.id, word: w, matched: false })) : rightPairs;

  return (
    <div className="min-h-screen bg-background">
      <Header title="단어 짝지기" showBack onBack={() => navigate(`/quiz/${id}`)} />

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {dynamicMode
              ? "동적 교체 모드 ON"
              : `페이지 ${currentPage + 1} / ${totalPages}`}
          </span>
          <span className="text-sm font-medium">
            정답: {score} / {allWords.length}
          </span>
        </div>

        <Progress value={staticProgress} className="h-2 mb-6" />

        <AnimatePresence mode="wait">
          <motion.div
            key={dynamicMode ? "dynamic" : currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {/* Left side - Words */}
            <div className="space-y-3">
              {displayLeft.map((pair, index) => (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      pair.matched && "opacity-50 bg-success/20 border-success",
                      selectedLeft === pair.id && !pair.matched && "border-primary bg-primary/10"
                    )}
                    onClick={() => handleLeftClick(pair.id)}
                  >
                    <p className="font-semibold text-center">{pair.word.word}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Right side - Meanings */}
            <div className="space-y-3">
              {displayRight.map((pair, index) => (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      pair.matched && "opacity-50 bg-success/20 border-success",
                      selectedRight === pair.id && !pair.matched && "border-primary bg-primary/10"
                    )}
                    onClick={() => handleRightClick(pair.id)}
                  >
                    <p className="text-sm text-center">{pair.word.meaning}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {dynamicMode && (
          <p className="mt-4 text-xs text-center text-muted-foreground">
            매칭 시 새 단어/뜻이 들어옵니다. 하나의 단어를 선택한 후 반대쪽 뜻을 클릭하세요.
          </p>
        )}
      </div>
    </div>
  );
};

export default QuizMatching;
