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
  const [dynUsedIds, setDynUsedIds] = useState<Set<string>>(new Set());
  const [dynFinished, setDynFinished] = useState(false);

  // ── Timer ──
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

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

  // Timer: start when words are loaded, stop when finished
  useEffect(() => {
    if (allWords.length > 0 && !loading) {
      setTimer(0);
      setTimerActive(true);
    }
  }, [allWords.length, loading]);

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
        .limit(10000);

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

  // Board has ≥1 clickable matchable pair
  const boardHasMatch = (left: Word[], right: Word[]) => {
    const rSet = new Set(right.map(w => w.id));
    return left.some(w => rSet.has(w.id));
  };

  const initDynamic = () => {
    if (allWords.length < 2) {
      toast.error("동적 모드는 최소 2개 이상의 단어가 필요합니다.");
      return;
    }

    const slots = Math.min(DYNAMIC_SLOTS, allWords.length);
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    const left = shuffled.slice(0, slots);

    // Shuffle right until: no positional alignment (L[i].id != R[i].id) AND ≥1 matchable pair
    let right: Word[] = [];
    for (let attempt = 0; attempt < 200; attempt++) {
      right = [...left].sort(() => Math.random() - 0.5);
      const noAlign = right.every((r, i) => r.id !== left[i].id);
      if (noAlign && boardHasMatch(left, right)) break;
    }
    // Fallback: rotate to guarantee no alignment
    if (right.some((r, i) => r.id === left[i].id) && left.length > 1) {
      right = left.map((_, i) => left[(i + 1) % left.length]);
    }

    setDynLeft(left);
    setDynRight(right);
    setDynUsedIds(new Set());
    setDynFinished(false);
    setScore(0);
    setIncorrectWords([]);
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const replaceDynamicSlots = (matchedId: string) => {
    // 1. Consume the matched pair permanently
    const used = new Set(dynUsedIds);
    used.add(matchedId);

    const leftIdx = dynLeft.findIndex(w => w.id === matchedId);
    const rightIdx = dynRight.findIndex(w => w.id === matchedId);
    const survivedLeft = dynLeft.filter(w => w.id !== matchedId);
    const survivedRight = dynRight.filter(w => w.id !== matchedId);

    setScore(prev => prev + 1);

    // 2. All pool consumed → game clear
    if (used.size >= allWords.length) {
      setDynLeft(survivedLeft);
      setDynRight(survivedRight);
      setDynUsedIds(used);
      if (survivedLeft.length === 0 && survivedRight.length === 0) {
        setTimeout(() => setDynFinished(true), 600);
      }
      return;
    }

    // 3. Candidate pool for refill (unused, not currently on same side)
    const leftScreenIds = new Set(survivedLeft.map(w => w.id));
    const rightScreenIds = new Set(survivedRight.map(w => w.id));
    const leftCands = allWords.filter(w => !used.has(w.id) && !leftScreenIds.has(w.id));
    const rightCands = allWords.filter(w => !used.has(w.id) && !rightScreenIds.has(w.id));

    // Late-game exception: pool nearly depleted → relax and shrink
    const remainingPool = allWords.length - used.size;
    const relaxed = remainingPool <= 3;

    if (leftCands.length === 0 || rightCands.length === 0) {
      // Cannot refill → shrink board
      setDynLeft(survivedLeft);
      setDynRight(survivedRight);
      setDynUsedIds(used);
      if (survivedLeft.length === 0 && survivedRight.length === 0) {
        setTimeout(() => setDynFinished(true), 600);
      }
      return;
    }

    // 4. Search for a (newWord, newMeaning) pair satisfying all constraints
    let picked: { newWord: Word; newMeaning: Word } | null = null;
    const shufL = [...leftCands].sort(() => Math.random() - 0.5);
    const shufR = [...rightCands].sort(() => Math.random() - 0.5);

    outer: for (const nw of shufL) {
      for (const nm of shufR) {
        // Constraint 1: no direct cross-refill match
        if (!relaxed && nw.id === nm.id) continue;
        // Constraint 2: board after refill has ≥1 matchable pair
        const trialLeft = [...survivedLeft];
        const trialRight = [...survivedRight];
        trialLeft.splice(leftIdx, 0, nw);
        trialRight.splice(rightIdx, 0, nm);
        if (!relaxed && !boardHasMatch(trialLeft, trialRight)) continue;
        picked = { newWord: nw, newMeaning: nm };
        break outer;
      }
    }

    // Relaxed fallback: pick anything
    if (!picked) {
      picked = { newWord: shufL[0], newMeaning: shufR[0] };
    }

    const finalLeft = [...survivedLeft];
    const finalRight = [...survivedRight];
    finalLeft.splice(leftIdx, 0, picked.newWord);
    finalRight.splice(rightIdx, 0, picked.newMeaning);

    setDynLeft(finalLeft);
    setDynRight(finalRight);
    setDynUsedIds(used);
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
    setTimerActive(false);
    const params = new URLSearchParams({
      score: finalScore.toString(),
      total: allWords.length.toString(),
      incorrect: encodeURIComponent(JSON.stringify(incorrectWords)),
      quizType: "matching",
      delay: "2",
      time: timer.toString(),
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
              ⏱ {formatTime(timer)}
            </span>
            <span className="text-sm font-medium">
              정답: {score} / {allWords.length}
            </span>
          </div>
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
              <AnimatePresence initial={false}>
                {displayLeft.map((pair) => (
                  <motion.div
                    key={`left-${pair.id}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
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
              </AnimatePresence>
            </div>


            {/* Right side - Meanings */}
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {displayRight.map((pair) => (
                  <motion.div
                    key={`right-${pair.id}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
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
              </AnimatePresence>
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
